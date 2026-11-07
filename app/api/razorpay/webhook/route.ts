import { NextResponse } from "next/server";
import { settlePayment } from "@/lib/payments";
import { ORDER_ID, PAYMENT_ID, verifyWebhookSignature } from "@/lib/razorpay";

// Razorpay calls this directly, so a booking is still confirmed if the
// customer's browser closes or loses connection right after paying.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (
    (event.event === "payment.captured" ||
      event.event === "payment.authorized" ||
      event.event === "order.paid") &&
    payment?.id &&
    payment.order_id &&
    PAYMENT_ID.test(payment.id) &&
    ORDER_ID.test(payment.order_id)
  ) {
    try {
      await settlePayment(payment.order_id, payment.id);
    } catch (error) {
      // A 500 makes Razorpay retry the webhook later.
      console.error("Webhook could not settle payment", error);
      return NextResponse.json({ error: "Retry later" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
