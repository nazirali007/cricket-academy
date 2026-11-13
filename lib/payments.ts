import { after } from "next/server";
import {
  claimRefund,
  finalizePayment,
  getBookingByOrderId,
  getBookingByPaymentId,
  markInvoiceSent,
  markRefundedOutsideSite,
  recordRefund,
  reopenRefund,
  type BookingRecord,
} from "./db";
import {
  sendBookingAlert,
  sendCustomerRefundNotice,
  sendInvoice,
  sendRefundAlert,
} from "./email";
import {
  capturePayment,
  fetchPayment,
  listRefunds,
  refundPayment,
  type RazorpayPayment,
  type RazorpayRefund,
} from "./razorpay";

export type SettleResult =
  | { status: "confirmed" | "refunded" | "refund_failed" | "refunding"; booking: BookingRecord }
  | { status: "unknown" | "not_paid" | "mismatch" };

const notify = (send: () => Promise<void>, id: number) =>
  after(async () => {
    try {
      await send();
    } catch (error) {
      console.error(`Could not email about booking ${id}`, error);
    }
  });

const refundReason = (booking: BookingRecord) =>
  booking.cancelledByAcademy
    ? `Booking ${booking.id} cancelled by CCS Academy`
    : `Booking ${booking.id}: slot no longer available when payment arrived`;

// Gives back whatever is left of a payment, after first asking Razorpay how
// much has already been refunded. That makes a retry safe: it can never pay
// the customer back twice.
async function refundRemainder(paymentId: string, reason: string) {
  const payment = await fetchPayment(paymentId);
  const remaining = payment.amount - (payment.amount_refunded ?? 0);
  if (remaining <= 0 || payment.status === "refunded") {
    const { items } = await listRefunds(paymentId);
    const done = items.find((r: RazorpayRefund) => r.status !== "failed") ?? items[0];
    return done?.id ?? "refunded";
  }
  if (payment.status !== "captured") {
    throw new Error(`Payment ${paymentId} is ${payment.status}, so it can't be refunded`);
  }
  const refund = await refundPayment(paymentId, remaining, reason);
  if (refund.status === "failed") throw new Error(`Refund ${refund.id} failed`);
  return refund.id;
}

// Refunds the whole amount. Only one caller can refund a booking, even if two
// arrive at the same moment.
export async function refundInFull(booking: BookingRecord) {
  if (!booking.paymentId || !(await claimRefund(booking.id))) return booking;
  let result: BookingRecord;
  try {
    const refundId = await refundRemainder(booking.paymentId, refundReason(booking));
    result = await recordRefund(booking.id, "refunded", refundId);
  } catch (error) {
    console.error(`Refund failed for booking ${booking.id}`, error);
    result = await recordRefund(booking.id, "refund_failed", null);
  }
  notify(() => sendRefundAlert(result), result.id);
  notify(async () => {
    await sendCustomerRefundNotice(result);
  }, result.id);
  return result;
}

// Admin "Retry refund": tries a failed or stuck refund again.
export async function retryRefund(bookingId: number) {
  const booking = await reopenRefund(bookingId);
  return booking ? refundInFull(booking) : null;
}

// A second successful payment for an order that is already paid (for example
// the customer paid twice from two tabs). The booking stays as it is, and the
// extra payment goes straight back.
async function refundDuplicate(payment: RazorpayPayment, booking: BookingRecord) {
  if (payment.status !== "captured" || payment.amount_refunded >= payment.amount) return;
  console.error("Refunding duplicate payment", { booking: booking.id, payment: payment.id });
  try {
    await refundPayment(
      payment.id,
      payment.amount - payment.amount_refunded,
      `Duplicate payment for booking ${booking.id}`,
    );
  } catch (error) {
    console.error(`Could not refund duplicate payment ${payment.id}`, error);
  }
}

// Razorpay webhook "refund.processed" / "refund.failed". Keeps the site in step
// with refunds, including ones made by hand from the Razorpay dashboard.
export async function syncRefund(refund: RazorpayRefund, event: "processed" | "failed") {
  const booking = await getBookingByPaymentId(refund.payment_id);
  if (!booking) return;

  if (event === "failed") {
    if (booking.status === "refunded" && booking.refundId === refund.id) {
      const failed = await recordRefund(booking.id, "refund_failed", refund.id);
      notify(() => sendRefundAlert(failed), failed.id);
    }
    return;
  }

  // Only a full refund closes the booking; a partial one is left to the admin.
  const payment = await fetchPayment(refund.payment_id);
  if (payment.amount_refunded < payment.amount) return;
  if (booking.status === "refunded") return;
  const closed = await markRefundedOutsideSite(booking.id, refund.id);
  if (!closed) return;
  notify(() => sendRefundAlert(closed), closed.id);
  notify(async () => {
    await sendCustomerRefundNotice(closed);
  }, closed.id);
}

// Turns a Razorpay payment into a confirmed booking, or refunds it if the
// slots were lost. Used by both the browser callback and the webhook.
export async function settlePayment(
  orderId: string,
  paymentId: string,
): Promise<SettleResult> {
  const booking = await getBookingByOrderId(orderId);
  if (!booking) return { status: "unknown" };

  // Never trust the browser about money: ask Razorpay what was actually paid.
  let payment: RazorpayPayment = await fetchPayment(paymentId);
  if (payment.order_id === orderId && booking.paymentId && booking.paymentId !== paymentId) {
    await refundDuplicate(payment, booking);
    return settledResult(booking);
  }
  if (
    payment.order_id !== orderId ||
    payment.currency !== "INR" ||
    payment.amount !== booking.total * 100
  ) {
    console.error("Payment does not match booking", { orderId, paymentId });
    return { status: "mismatch" };
  }
  if (payment.status === "authorized") {
    try {
      payment = await capturePayment(paymentId, payment.amount);
    } catch {
      // Another request may have captured it first.
      payment = await fetchPayment(paymentId);
    }
  }
  if (payment.status !== "captured") return { status: "not_paid" };

  const result = await finalizePayment(orderId, paymentId);
  if (result.outcome === "unknown") return { status: "unknown" };
  let current = result.booking;
  if (current.paymentId && current.paymentId !== paymentId) {
    // Lost a race with another payment for the same order.
    await refundDuplicate(payment, current);
    return settledResult(current);
  }

  if (result.outcome === "updated" && current.status === "confirmed") {
    const confirmed = current;
    // Runs straight after the response, so the customer's invoice arrives
    // within moments without slowing down their confirmation screen.
    notify(async () => {
      if (await sendInvoice(confirmed)) await markInvoiceSent(confirmed.id);
    }, confirmed.id);
    notify(() => sendBookingAlert(confirmed), confirmed.id);
  }

  if (current.status === "refund_pending") {
    current = await refundInFull(current);
  }

  return settledResult(current);
}

function settledResult(booking: BookingRecord): SettleResult {
  const current: BookingRecord =
    booking.status === "refund_pending" ? { ...booking, status: "refunding" } : booking;
  if (
    current.status === "confirmed" ||
    current.status === "refunded" ||
    current.status === "refund_failed" ||
    current.status === "refunding"
  ) {
    return { status: current.status, booking: current };
  }
  return { status: "unknown" };
}
