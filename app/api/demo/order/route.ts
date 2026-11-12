import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { blockedKeys } from "@/lib/blocked-slots";
import { isValidEmail, priceCart, slotKey } from "@/lib/booking";
import { parseItems } from "@/lib/cart-input";
import { isTestCheckout } from "@/lib/demo";
import { cleanText, normalisePhone } from "@/lib/form-input";
import { createOrder, publicKeyId } from "@/lib/razorpay";

const fail = (status: number, error: string, extra: object = {}) =>
  NextResponse.json({ error, ...extra }, { status });

// Test mode only: opens a Razorpay TEST order for the cart, so the real
// Razorpay checkout can be tried before the database is set up. Nothing is
// saved, and it is switched off whenever live keys or a database are in place.
export async function POST(request: Request) {
  if (!isTestCheckout()) return fail(404, "Not available");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return fail(400, "Something went wrong. Please try again.");
  }

  const name = cleanText(body.name, 80);
  if (name.length < 2) return fail(400, "Please enter your name.");
  const phone = normalisePhone(body.phone);
  if (!phone) return fail(400, "Please enter a valid 10-digit mobile number.");
  const email = cleanText(body.email, 254).toLowerCase();
  if (!isValidEmail(email)) return fail(400, "Please enter a valid email address.");

  const items = parseItems(body.items);
  if (typeof items === "string") return fail(400, items);
  const blocked = items
    .map((item) => slotKey(item.date, item.slotId))
    .filter((key) => blockedKeys.has(key));
  if (blocked.length) {
    return fail(409, "Some of your slots have just been booked.", {
      code: "taken",
      taken: blocked,
    });
  }

  // Same rule as the live site: the server works out the price.
  const priced = priceCart(items);
  if (body.expectedTotal !== priced.total) {
    return fail(409, "The price has changed. Please check the new total.", {
      code: "price_changed",
      total: priced.total,
    });
  }

  const reference = `TEST-${randomInt(10_000, 100_000)}`;
  try {
    const order = await createOrder(priced.total * 100, reference, {
      test_booking: "true",
      reference,
    });
    return NextResponse.json(
      {
        reference,
        orderId: order.id,
        keyId: publicKeyId(),
        amount: priced.total * 100,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Could not create Razorpay test order", error);
    return fail(502, "We couldn't start the payment. Please try again.");
  }
}
