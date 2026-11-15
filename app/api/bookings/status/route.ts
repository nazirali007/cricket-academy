import { NextResponse } from "next/server";
import { getBookingByToken } from "@/lib/db";
import { paymentOutcome } from "@/lib/payments";

// Lets the page check a payment's outcome if its own confirmation failed.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const booking = await getBookingByToken(token);
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(paymentOutcome(booking), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
