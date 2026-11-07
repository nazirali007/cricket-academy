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

export const MAX_SLOTS_PER_BOOKING = 10;
// How long slots stay reserved once a customer goes to pay.
export const HOLD_MINUTES = 15;
// Razorpay's window closes before the hold ends, so nobody pays for an
// expired hold by simply leaving the window open.
export const CHECKOUT_TIMEOUT_SECONDS = 10 * 60;

export type CartItem = {
  date: string;
  slotId: SlotId;
  balls: number;
  umpires: boolean;
};

export type PricedLine = CartItem & {
  slotName: string;
  timing: string;
  rate: number;
  ballsCost: number;
  umpiresCost: number;
  total: number;
};

export const slotKey = (date: string, slotId: string) => `${date}|${slotId}`;

export type SlotProblem = "invalid" | "past" | "started" | "too-far";

// Why a slot can't be booked right now, or null if it can.
export function checkSlot(
  date: string,
  slotId: string,
  now: { today: string; minutes: number },
): SlotProblem | null {
  if (!isValidDate(date)) return "invalid";
  const slot = findSlot(date, slotId);
  if (!slot) return "invalid";
  if (date < now.today) return "past";
  if (date === now.today && slot.startsAt <= now.minutes) return "started";
  if (date > addDays(now.today, MAX_DAYS_AHEAD)) return "too-far";
  return null;
}

export function sortCart<T extends { date: string; slotId: string }>(
  items: T[],
) {
  const start = (item: T) => findSlot(item.date, item.slotId)?.startsAt ?? 0;
  return [...items].sort((a, b) =>
    a.date === b.date ? start(a) - start(b) : a.date < b.date ? -1 : 1,
  );
}

// The single place prices are worked out, on the page and on the server.
export function priceCart(items: CartItem[]) {
  const lines: PricedLine[] = [];
  for (const item of sortCart(items)) {
    const slot = findSlot(item.date, item.slotId);
    if (!slot) continue;
    const ballsCost = item.balls * BALL_PRICE;
    const umpiresCost = item.umpires ? UMPIRES_PRICE : 0;
    lines.push({
      ...item,
      slotName: slot.name,
      timing: slot.timing,
      rate: slot.rate,
      ballsCost,
      umpiresCost,
      total: slot.rate + ballsCost + umpiresCost,
    });
  }
  const groundTotal = lines.reduce((sum, line) => sum + line.rate, 0);
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  return { lines, groundTotal, addOnsTotal: total - groundTotal, total };
}
