import { findSlot } from "./booking";

// Each slot is paid for in three parts:
//   1. 25% when booking, online, for every slot in the basket.
//   2. 25% from 24 hours before the slot starts. Skipped for slots booked
//      less than a day ahead; that share moves into the last part.
//   3. Everything still owed (usually 50%), from 8 hours before the start.
// Parts 2 and 3 are sent as Razorpay payment links by SMS and email, one slot
// at a time, so a customer only ever pays ahead for their next match. Anything
// unpaid at match time is collected at the ground. Used by the page and the
// server, so the amounts shown are always the amounts charged.

export const SECOND_PART_HOURS = 24;
export const FINAL_PART_HOURS = 8;

const HOUR = 3_600_000;

export type Stage = "second" | "final";

export function splitPrice(total: number) {
  const deposit = Math.round(total / 4);
  const second = Math.round(total / 4);
  return { deposit, second, final: total - deposit - second };
}

// What is paid online when booking.
export const depositFor = (lines: { total: number }[]) =>
  lines.reduce((sum, line) => sum + splitPrice(line.total).deposit, 0);

// When a slot starts and ends, as timestamps. India has no daylight saving,
// so +05:30 is always right.
export function slotTimes(date: string, slotId: string) {
  const slot = findSlot(date, slotId);
  if (!slot) return null;
  const midnight = Date.parse(`${date}T00:00:00+05:30`);
  return {
    start: midnight + slot.startsAt * 60_000,
    end: midnight + slot.endsAt * 60_000,
  };
}

type Line = { date: string; slotId: string; total: number };

// The payment part due now for a slot, with how much of its price should be
// paid in total once that part is paid. Null when nothing new is due.
export function dueNow(line: Line, bookedAt: number, now: number) {
  const times = slotTimes(line.date, line.slotId);
  if (!times || now >= times.start) return null;
  const { deposit, second } = splitPrice(line.total);
  if (now >= times.start - FINAL_PART_HOURS * HOUR) {
    return { stage: "final" as Stage, target: line.total };
  }
  const secondFrom = times.start - SECOND_PART_HOURS * HOUR;
  if (now >= secondFrom && bookedAt <= secondFrom) {
    return { stage: "second" as Stage, target: deposit + second };
  }
  return null;
}

export type PlannedPart = {
  stage: "deposit" | Stage;
  amount: number;
  // When the payment link is sent. Null for the part paid when booking.
  sendAt: number | null;
};

// The three parts for one slot, as planned on the day it is booked.
export function planFor(line: Line, bookedAt: number): PlannedPart[] {
  const times = slotTimes(line.date, line.slotId);
  const { deposit, second, final } = splitPrice(line.total);
  if (!times) return [{ stage: "deposit", amount: line.total, sendAt: null }];
  const secondFrom = times.start - SECOND_PART_HOURS * HOUR;
  const finalFrom = times.start - FINAL_PART_HOURS * HOUR;
  const parts: PlannedPart[] = [{ stage: "deposit", amount: deposit, sendAt: null }];
  if (bookedAt <= secondFrom) {
    parts.push({ stage: "second", amount: second, sendAt: secondFrom });
    parts.push({ stage: "final", amount: final, sendAt: finalFrom });
  } else {
    parts.push({ stage: "final", amount: second + final, sendAt: Math.max(finalFrom, bookedAt) });
  }
  return parts;
}

export const stageName: Record<PlannedPart["stage"], string> = {
  deposit: "Booking amount (25%)",
  second: "Second payment (25%)",
  final: "Final payment",
};
