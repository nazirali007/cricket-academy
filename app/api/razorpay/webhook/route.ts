import { NextResponse } from "next/server";
import { settlePayment, syncRefund } from "@/lib/payments";
import {
  ORDER_ID,
  PAYMENT_ID,
  REFUND_ID,
  verifyWebhookSignature,
  type RazorpayRefund,
} from "@/lib/razorpay";

type WebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    refund?: { entity?: Partial<RazorpayRefund> };
  };
};

// Razorpay calls this directly, so a booking is still confirmed if the
// customer's browser closes or loses connection right after paying, and
// refunds (including ones made from the Razorpay dashboard) show up in admin.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const payment = event.payload?.payment?.entity;
    const refund = event.payload?.refund?.entity;
    if (
      (event.event === "payment.captured" ||
        event.event === "payment.authorized" ||
        event.event === "order.paid") &&
      payment?.id &&
      payment.order_id &&
      PAYMENT_ID.test(payment.id) &&
      ORDER_ID.test(payment.order_id)
    ) {
      await settlePayment(payment.order_id, payment.id);
    } else if (
      (event.event === "refund.processed" || event.event === "refund.failed") &&
      refund?.id &&
      refund.payment_id &&
      REFUND_ID.test(refund.id) &&
      PAYMENT_ID.test(refund.payment_id)
    ) {
      await syncRefund(
        refund as RazorpayRefund,
        event.event === "refund.failed" ? "failed" : "processed",
      );
    }
  } catch (error) {
    // A 500 makes Razorpay retry the webhook later.
    console.error(`Webhook could not handle ${event.event}`, error);
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
