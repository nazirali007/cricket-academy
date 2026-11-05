// Ground booking rules and rates. Used by both the page and the server, so the
// price a customer sees is always the price the server charges.

export const MAX_DAYS_AHEAD = 90;
export const MAX_BALLS = 20;
export const BALL_PRICE = 400;
export const UMPIRES_PRICE = 1400;

export type SlotId = "morning" | "afternoon" | "evening" | "night";

export type Slot = {
  id: SlotId;
  name: string;
  timing: string;
  rate: number;
  // Minutes after midnight, in India time, when the slot starts.
  startsAt: number;
};

export const weekdaySlots: Slot[] = [
  {
    id: "morning",
    name: "Morning",
    timing: "7:30 AM – 2:00 PM",
    rate: 5000,
    startsAt: 450,
  },
  {
    id: "evening",
    name: "Evening",
    timing: "3:30 PM – 8:00 PM",
    rate: 12500,
    startsAt: 930,
  },
  {
    id: "night",
    name: "Night",
    timing: "8:30 PM – 12:00 AM",
    rate: 13000,
    startsAt: 1230,
  },
];

export const weekendSlots: Slot[] = [
  {
    id: "morning",
    name: "Morning",
    timing: "7:30 AM – 12:00 PM",
    rate: 8000,
    startsAt: 450,
  },
  {
    id: "afternoon",
    name: "Afternoon",
    timing: "12:30 PM – 3:30 PM",
    rate: 8000,
    startsAt: 750,
  },
  {
    id: "evening",
    name: "Evening",
    timing: "4:00 PM – 8:00 PM",
    rate: 12500,
    startsAt: 960,
  },
  {
    id: "night",
    name: "Night",
    timing: "8:30 PM – 12:30 AM",
    rate: 15000,
    startsAt: 1230,
  },
];

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);

export function isValidDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(toUtc(date).getTime()) &&
    toUtc(date).toISOString().startsWith(date)
  );
}

export function addDays(date: string, days: number) {
  const next = toUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function isWeekend(date: string) {
  const day = toUtc(date).getUTCDay();
  return day === 0 || day === 6;
}

export function slotsFor(date: string) {
  return isWeekend(date) ? weekendSlots : weekdaySlots;
}

export function findSlot(date: string, slotId: string) {
  return slotsFor(date).find((slot) => slot.id === slotId);
}

export function totalFor(rate: number, balls: number, umpires: boolean) {
  return rate + balls * BALL_PRICE + (umpires ? UMPIRES_PRICE : 0);
}

export function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  },
) {
  return new Intl.DateTimeFormat("en-IN", {
    ...options,
    timeZone: "UTC",
  }).format(toUtc(date));
}

// The current date and time at the ground, wherever the server or visitor is.
export function indiaNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    today: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export const bookingReference = (id: number) =>
  `CCS-${String(id).padStart(5, "0")}`;
