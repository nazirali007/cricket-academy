import { NextResponse } from "next/server";
import { isTestCheckout } from "@/lib/demo";
import {
  capturePayment,
  fetchPayment,
  ORDER_ID,
  PAYMENT_ID,
  verifyCheckoutSignature,
  type RazorpayPayment,
} from "@/lib/razorpay";

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

// Test mode only: checks a Razorpay TEST payment exactly as the live site
// does (signature first, then asks Razorpay what was paid), without saving it.
export async function POST(request: Request) {
  if (!isTestCheckout()) return fail(404, "Not available");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request.");
  }
  const { orderId, paymentId, signature } = body ?? {};
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    !ORDER_ID.test(orderId) ||
    !PAYMENT_ID.test(paymentId)
  ) {
    return fail(400, "Invalid payment details.");
  }
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    return fail(400, "We couldn't verify this payment.");
  }

  try {
    let payment: RazorpayPayment = await fetchPayment(paymentId);
    if (payment.order_id !== orderId || payment.currency !== "INR") {
      return fail(400, "We couldn't verify this payment.");
    }
    if (payment.status === "authorized") {
      try {
        payment = await capturePayment(paymentId, payment.amount);
      } catch {
        payment = await fetchPayment(paymentId);
      }
    }
    if (payment.status !== "captured") {
      return fail(400, "This payment wasn't completed.");
    }
    return NextResponse.json({ status: "confirmed", paymentId });
  } catch (error) {
    console.error("Could not verify Razorpay test payment", error);
    return fail(502, "We couldn't confirm this payment. Please try again.");
  }
}
