import { NextResponse } from "next/server";
import { paymentOutcome, releaseUnpaidHold } from "@/lib/payments";

// Called when a customer closes the payment window. Frees their slots, unless
// Razorpay says the payment went through after all.
export async function POST(request: Request) {
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof token !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const result = await releaseUnpaidHold(token);
    return NextResponse.json(
      "booking" in result ? paymentOutcome(result.booking) : { status: result.status },
    );
  } catch (error) {
    console.error("Could not release hold", error);
    // The hold runs out on its own.
    return NextResponse.json({ status: "kept" }, { status: 503 });
  }
}
