import { NextResponse } from "next/server";
import { getBookingByToken } from "@/lib/db";
import { settlePayment } from "@/lib/payments";
import { ORDER_ID, PAYMENT_ID, verifyCheckoutSignature } from "@/lib/razorpay";

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

// Called by the page right after Razorpay reports a successful payment.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request.");
  }
  const { token, orderId, paymentId, signature } = body ?? {};
  if (
    typeof token !== "string" ||
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    !ORDER_ID.test(orderId) ||
    !PAYMENT_ID.test(paymentId)
  ) {
    return fail(400, "Invalid payment details.");
  }

  try {
    const booking = await getBookingByToken(token);
    if (!booking || booking.orderId !== orderId) {
      return fail(400, "Invalid payment details.");
    }
    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      return fail(400, "We couldn't verify this payment.");
    }

    const result = await settlePayment(orderId, paymentId);
    if (!("booking" in result)) {
      return fail(400, "We couldn't verify this payment.");
    }
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error("Could not confirm payment", error);
    return fail(502, "We're still confirming your payment.");
  }
}
