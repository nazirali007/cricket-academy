import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { sendDuePaymentLinks } from "@/lib/payment-links";
import { isPaymentConfigured } from "@/lib/razorpay";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Only the scheduler knows CRON_SECRET. It calls with
// "Authorization: Bearer <CRON_SECRET>".
function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(given), digest(`Bearer ${secret}`));
}

// Sends the payment links that have come due. Called every few minutes by a
// scheduler (Supabase pg_cron); safe to call as often as you like.
export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!isDatabaseConfigured() || !isPaymentConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json(await sendDuePaymentLinks());
  } catch (error) {
    console.error("Payment link run failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const POST = GET;
