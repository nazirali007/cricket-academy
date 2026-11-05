import { after, NextResponse } from "next/server";
import {
  addDays,
  findSlot,
  indiaNow,
  isValidDate,
  MAX_BALLS,
  MAX_DAYS_AHEAD,
  totalFor,
} from "@/lib/booking";
import {
  countRecentBookings,
  createBooking,
  isDatabaseConfigured,
} from "@/lib/db";
import { sendBookingAlert } from "@/lib/email";

const MAX_BOOKINGS_PER_PHONE_PER_DAY = 5;

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

// Accepts a 10-digit Indian mobile number, with or without +91.
function normalisePhone(value: unknown) {
  const digits = text(value, 20).replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Something went wrong. Please try again.");
  }
  if (!body || typeof body !== "object") {
    return fail(400, "Something went wrong. Please try again.");
  }

  // A hidden field that people never see but spam bots tend to fill in.
  if (text(body.website, 200)) {
    return fail(400, "Something went wrong. Please try again.");
  }

  if (!isDatabaseConfigured()) {
    return fail(503, "Online booking isn't available yet.");
  }

  const date = text(body.date, 10);
  const { today, minutes } = indiaNow();
  if (
    !isValidDate(date) ||
    date < today ||
    date > addDays(today, MAX_DAYS_AHEAD)
  ) {
    return fail(400, "Please choose a valid date.");
  }

  const slot = findSlot(date, text(body.slotId, 20));
  if (!slot) return fail(400, "Please choose a valid slot.");
  if (date === today && slot.startsAt <= minutes) {
    return fail(400, "This slot has already started.");
  }

  const name = text(body.name, 80);
  if (name.length < 2) return fail(400, "Please enter your name.");

  const phone = normalisePhone(body.phone);
  if (!phone) return fail(400, "Please enter a valid 10-digit mobile number.");

  const { balls } = body;
  if (
    typeof balls !== "number" ||
    !Number.isInteger(balls) ||
    balls < 0 ||
    balls > MAX_BALLS
  ) {
    return fail(400, "Please choose a valid number of balls.");
  }
  const umpires = body.umpires === true;

  try {
    if ((await countRecentBookings(phone)) >= MAX_BOOKINGS_PER_PHONE_PER_DAY) {
      return fail(
        429,
        "This number has made several bookings today. Please contact the academy to book more.",
      );
    }

    const booking = {
      date,
      slotId: slot.id,
      name,
      phone,
      organisation: text(body.organisation, 120) || null,
      balls,
      umpires,
      total: totalFor(slot.rate, balls, umpires),
    };
    const id = await createBooking(booking);

    if (id === null) {
      return fail(
        409,
        "Sorry, someone has just booked this slot. Please choose another.",
      );
    }

    // Sent after responding, so a slow or failed email can't affect the booking.
    after(async () => {
      try {
        await sendBookingAlert({ ...booking, id });
      } catch (error) {
        console.error(`Could not email booking ${id}`, error);
      }
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Could not create booking", error);
    return fail(500, "We couldn't save your booking. Please try again.");
  }
}
