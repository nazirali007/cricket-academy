import { after } from "next/server";
import {
  claimRefund,
  finalizePayment,
  getBookingByOrderId,
  getBookingByPaymentId,
  getBookingByToken,
  listSlotPayments,
  markInvoiceSent,
  markRefundedOutsideSite,
  markSlotPaymentCancelled,
  markSlotPaymentPaid,
  markSlotPaymentRefunded,
  recordRefund,
  releaseHold,
  reopenRefund,
  type BookingRecord,
  type SlotPayment,
} from "./db";
import {
  isEmailConfigured,
  sendBookingAlert,
  sendCustomerRefundNotice,
  sendInvoice,
  sendRefundAlert,
} from "./email";
import {
  cancelPaymentLink,
  capturePayment,
  fetchOrderPayments,
  fetchPaymentLink,
  fetchPayment,
  listRefunds,
  refundPayment,
  type RazorpayPayment,
  type RazorpayPaymentLink,
  type RazorpayRefund,
} from "./razorpay";

export type SettleResult =
  | { status: "confirmed" | "refunded" | "refund_failed" | "refunding"; booking: BookingRecord }
  | { status: "unknown" | "not_paid" | "mismatch" };

// Sends an email straight after the response, so customers never wait for it.
export const notify = (send: () => Promise<unknown>, id: number) =>
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
export async function refundRemainder(paymentId: string, reason: string) {
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

// Records a payment link as paid, from Razorpay's own record of it.
export async function settleLink(row: SlotPayment, link: RazorpayPaymentLink) {
  const payment =
    link.payments?.find((p) => p.status === "captured") ?? link.payments?.[0];
  if (link.status !== "paid" || !payment || link.amount_paid !== row.amount * 100) {
    return null;
  }
  return markSlotPaymentPaid(row.id, payment.payment_id);
}

// Stops an unpaid link from being used. If the customer paid it just before,
// it's recorded as paid instead and returned.
export async function closeLink(row: SlotPayment) {
  if (!row.linkId) return null;
  try {
    await cancelPaymentLink(row.linkId);
    await markSlotPaymentCancelled(row.id);
    return null;
  } catch (error) {
    const link = await fetchPaymentLink(row.linkId);
    if (link.status === "paid") return settleLink(row, link);
    if (link.status === "cancelled" || link.status === "expired") {
      await markSlotPaymentCancelled(row.id);
      return null;
    }
    throw error;
  }
}

// Refunds everything paid online: the booking amount and every payment link.
// Open links are closed first. Cash taken at the ground is listed in the
// academy's alert, to be returned by hand. Only one caller can refund a
// booking, and a retry never pays anything back twice.
export async function refundInFull(booking: BookingRecord) {
  if (!booking.paymentId || !(await claimRefund(booking.id))) return booking;
  const reason = refundReason(booking);
  let result: BookingRecord;
  try {
    for (const open of (await listSlotPayments([booking.id])).filter((p) => p.status === "sent")) {
      await closeLink(open);
    }
    const refundId = await refundRemainder(booking.paymentId, reason);
    for (const part of await listSlotPayments([booking.id])) {
      if (part.status !== "paid" || !part.paymentId) continue;
      await markSlotPaymentRefunded(part.id, await refundRemainder(part.paymentId, reason));
    }
    result = await recordRefund(booking.id, "refunded", refundId);
  } catch (error) {
    console.error(`Refund failed for booking ${booking.id}`, error);
    result = await recordRefund(booking.id, "refund_failed", null);
  }
  const parts = await listSlotPayments([booking.id]);
  const total = (status: SlotPayment["status"], cash: boolean) =>
    parts
      .filter((p) => p.status === status && (p.stage === "cash") === cash)
      .reduce((sum, p) => sum + p.amount, 0);
  const amounts = {
    online: booking.deposit + total("refunded", false) + total("paid", false),
    cash: total("paid", true),
  };
  notify(() => sendRefundAlert(result, amounts), result.id);
  notify(() => sendCustomerRefundNotice(result, amounts.online), result.id);
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
      notify(() => sendRefundAlert(failed, { online: booking.deposit, cash: 0 }), failed.id);
    }
    return;
  }

  // Only a full refund closes the booking; a partial one is left to the admin.
  const payment = await fetchPayment(refund.payment_id);
  if (payment.amount_refunded < payment.amount) return;
  if (booking.status === "refunded") return;
  const closed = await markRefundedOutsideSite(booking.id, refund.id);
  if (!closed) return;
  notify(() => sendRefundAlert(closed, { online: payment.amount / 100, cash: 0 }), closed.id);
  notify(() => sendCustomerRefundNotice(closed, payment.amount / 100), closed.id);
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
    payment.amount !== booking.deposit * 100
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

// What the customer's page is told about a booking's payment. No personal
// details: the page already has them.
export const paymentOutcome = (booking: BookingRecord) => ({
  status: booking.status === "refund_pending" ? "refunding" : booking.status,
  cancelledByAcademy: booking.cancelledByAcademy,
  paymentId: booking.paymentId,
  paidAt: booking.paidAt,
  invoiceByEmail: isEmailConfigured() && Boolean(booking.email),
});

// The customer closed the payment window. Before their slots go back on sale,
// ask Razorpay whether a payment went through anyway (a UPI payment can
// succeed a moment after the window closes). If it did, the booking is
// confirmed; if Razorpay can't be reached, the hold simply runs out instead.
export async function releaseUnpaidHold(
  token: string,
): Promise<SettleResult | { status: "released" | "kept" }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { status: "unknown" };
  if (booking.status !== "pending") return settledResult(booking);

  if (booking.orderId) {
    let payments: RazorpayPayment[];
    try {
      ({ items: payments } = await fetchOrderPayments(booking.orderId));
    } catch (error) {
      console.error(`Could not check payments for booking ${booking.id}`, error);
      return { status: "kept" };
    }
    const paid = payments.find((p) => p.status === "captured" || p.status === "authorized");
    if (paid) return settlePayment(booking.orderId, paid.id);
  }
  await releaseHold(token);
  return { status: "released" };
}
