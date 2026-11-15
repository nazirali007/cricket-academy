import { connection, NextResponse } from "next/server";
import { blockedSlots } from "@/lib/blocked-slots";
import { addDays, indiaNow, MAX_DAYS_AHEAD } from "@/lib/booking";
import { getTakenSlots, isDatabaseConfigured } from "@/lib/db";
import { isPaymentConfigured } from "@/lib/razorpay";

export async function GET() {
  await connection();

  const { today, minutes } = indiaNow();
  const maxDate = addDays(today, MAX_DAYS_AHEAD);
  // Event slots are known without the database, so they always show.
  const events = blockedSlots
    .filter(({ date }) => date >= today && date <= maxDate)
    .map(({ date, slotId }) => ({ date, slotId }));

  let taken: { date: string; slotId: string; held: boolean }[] = [];
  let connected = isDatabaseConfigured();
  if (connected) {
    try {
      taken = await getTakenSlots(today, maxDate);
    } catch (error) {
      console.error("Could not load booked slots", error);
      connected = false;
    }
  }

  const online = connected && isPaymentConfigured();
  return NextResponse.json(
    {
      today,
      nowMinutes: minutes,
      maxDate,
      // Online booking needs both the database and Razorpay.
      online,
      // Booked: paid for, or used by an academy event.
      unavailable: [
        ...events,
        ...taken.filter((t) => !t.held).map(({ date, slotId }) => ({ date, slotId })),
      ],
      // Someone is paying for these now. They free up if the payment fails.
      held: taken.filter((t) => t.held).map(({ date, slotId }) => ({ date, slotId })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
