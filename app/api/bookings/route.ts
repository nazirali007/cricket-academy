import { NextResponse } from "next/server";
import { blockedKeys } from "@/lib/blocked-slots";
import {
  bookingReference,
  checkSlot,
  indiaNow,
  isValidEmail,
  MAX_BALLS,
  MAX_SLOTS_PER_BOOKING,
  priceCart,
  slotKey,
  type CartItem,
  type SlotId,
} from "@/lib/booking";
import {
  countRecentHolds,
  createHold,
  isDatabaseConfigured,
  releaseHold,
  setOrderId,
} from "@/lib/db";
import { createOrder, isPaymentConfigured, publicKeyId } from "@/lib/razorpay";
import { cleanText, normalisePhone } from "@/lib/form-input";

const MAX_HOLDS_PER_PHONE_PER_HOUR = 6;

const fail = (status: number, error: string, extra: object = {}) =>
  NextResponse.json({ error, ...extra }, { status });

const text = cleanText;

function parseItems(value: unknown): CartItem[] | string {
  if (!Array.isArray(value) || value.length === 0) {
    return "Please choose at least one slot.";
  }
  if (value.length > MAX_SLOTS_PER_BOOKING) {
    return `You can book up to ${MAX_SLOTS_PER_BOOKING} slots at a time.`;
  }
  const now = indiaNow();
  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return "Please choose valid slots.";
    const { date, slotId, balls, umpires } = raw as Record<string, unknown>;
    if (typeof date !== "string" || typeof slotId !== "string") {
      return "Please choose valid slots.";
    }
    const problem = checkSlot(date, slotId, now);
    if (problem === "past" || problem === "started") {
      return "One of your slots has already started. Please remove it.";
    }
    if (problem) return "Please choose valid slots.";
    const key = slotKey(date, slotId);
    if (seen.has(key)) return "The same slot was added twice.";
    seen.add(key);
    if (
      typeof balls !== "number" ||
      !Number.isInteger(balls) ||
      balls < 0 ||
      balls > MAX_BALLS
    ) {
      return `Match balls must be a whole number from 0 to ${MAX_BALLS}.`;
    }
    if (typeof umpires !== "boolean") return "Please choose valid add-ons.";
    items.push({ date, slotId: slotId as SlotId, balls, umpires });
  }
  return items;
}

// Reserves the slots and opens a Razorpay order for the exact total.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return fail(400, "Something went wrong. Please try again.");
  }

  // A hidden field that people never see but spam bots tend to fill in.
  if (text(body.website, 200)) {
    return fail(400, "Something went wrong. Please try again.");
  }
  if (!isDatabaseConfigured() || !isPaymentConfigured()) {
    return fail(503, "Online booking isn't available right now.");
  }

  const name = text(body.name, 80);
  if (name.length < 2) return fail(400, "Please enter your name.");
  const phone = normalisePhone(body.phone);
  if (!phone) return fail(400, "Please enter a valid 10-digit mobile number.");
  const email = text(body.email, 254).toLowerCase();
  if (!isValidEmail(email)) return fail(400, "Please enter a valid email address.");
  const organisation = text(body.organisation, 120) || null;

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

  // The server always works the price out itself. If it differs from what the
  // customer was shown, they review it again before paying.
  const priced = priceCart(items);
  if (body.expectedTotal !== priced.total) {
    return fail(409, "The price has changed. Please check the new total.", {
      code: "price_changed",
      total: priced.total,
    });
  }

  try {
    if ((await countRecentHolds(phone)) >= MAX_HOLDS_PER_PHONE_PER_HOUR) {
      return fail(
        429,
        "Too many booking attempts from this number. Please wait a while or call us.",
      );
    }

    const hold = await createHold({
      lines: priced.lines,
      name,
      phone,
      email,
      organisation,
      total: priced.total,
    });
    if (!hold.ok) {
      return fail(409, "Some of your slots have just been booked.", {
        code: "taken",
        taken: hold.taken,
      });
    }

    const { booking } = hold;
    let orderId: string;
    try {
      const order = await createOrder(
        priced.total * 100,
        bookingReference(booking.id),
        booking.id,
      );
      orderId = order.id;
      await setOrderId(booking.id, orderId);
    } catch (error) {
      console.error(`Could not create Razorpay order for ${booking.id}`, error);
      await releaseHold(booking.token);
      return fail(502, "We couldn't start the payment. Please try again.");
    }

    return NextResponse.json(
      {
        token: booking.token,
        reference: bookingReference(booking.id),
        orderId,
        keyId: publicKeyId(),
        amount: priced.total * 100,
        expiresAt: booking.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Could not create booking", error);
    return fail(500, "We couldn't reserve your slots. Please try again.");
  }
}
