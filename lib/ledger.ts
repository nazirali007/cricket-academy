import type { PricedLine } from "./booking";
import type { BookingRecord, SlotPayment } from "./db";
import { splitPrice } from "./installments";

export type SlotLedger = {
  line: PricedLine;
  // Paid online when booking.
  upfront: number;
  // Paid so far, online and in cash.
  paid: number;
  balance: number;
  // The payment link the customer can use right now, if any.
  open: SlotPayment | null;
  payments: SlotPayment[];
};

// Where each slot of a booking stands: what's paid, what's left and any open
// payment link. Older bookings were paid in full when booking.
export function ledger(booking: BookingRecord, payments: SlotPayment[]): SlotLedger[] {
  const paidInFull = booking.deposit >= booking.total;
  return booking.lines.map((line) => {
    const mine = payments.filter(
      (p) => p.bookingId === booking.id && p.date === line.date && p.slotId === line.slotId,
    );
    const upfront = !booking.paymentId
      ? 0
      : paidInFull
        ? line.total
        : splitPrice(line.total).deposit;
    const later = mine
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const paid = upfront + later;
    return {
      line,
      upfront,
      paid,
      balance: Math.max(0, line.total - paid),
      open: mine.find((p) => p.status === "sent") ?? null,
      payments: mine,
    };
  });
}

export const sumOf = (entries: SlotLedger[], key: "paid" | "balance") =>
  entries.reduce((sum, entry) => sum + entry[key], 0);
