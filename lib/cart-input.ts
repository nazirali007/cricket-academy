import {
  checkSlot,
  indiaNow,
  MAX_BALLS,
  MAX_SLOTS_PER_BOOKING,
  slotKey,
  type CartItem,
  type SlotId,
} from "./booking";

// Checks the slots a customer sent. Returns the cart, or a message to show
// them. Used by every endpoint that takes a booking.
export function parseItems(value: unknown): CartItem[] | string {
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
