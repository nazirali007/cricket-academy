import { after } from "next/server";
import {
  claimRefund,
  finalizePayment,
  getBookingByOrderId,
  markInvoiceSent,
  recordRefund,
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
  refundPayment,
  type RazorpayPayment,
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

// Refunds the whole amount. Only one caller can refund a booking, even if two
// arrive at the same moment.
export async function refundInFull(booking: BookingRecord) {
  if (!booking.paymentId || !(await claimRefund(booking.id))) return booking;
  let result: BookingRecord;
  try {
    const refund = await refundPayment(booking.paymentId, booking.total * 100);
    result = await recordRefund(booking.id, "refunded", refund.id);
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

  if (current.status === "refund_pending") current = { ...current, status: "refunding" };
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
