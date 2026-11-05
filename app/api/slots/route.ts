import { connection, NextResponse } from "next/server";
import { addDays, indiaNow, MAX_DAYS_AHEAD } from "@/lib/booking";
import { getBookedSlots, isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  await connection();

  const { today, minutes } = indiaNow();
  const maxDate = addDays(today, MAX_DAYS_AHEAD);
  const base = { today, nowMinutes: minutes, maxDate };
  const headers = { "Cache-Control": "no-store" };

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ...base, connected: false, booked: [] },
      { headers },
    );
  }

  try {
    const booked = await getBookedSlots(today, maxDate);
    return NextResponse.json({ ...base, connected: true, booked }, { headers });
  } catch (error) {
    console.error("Could not load booked slots", error);
    return NextResponse.json(
      { ...base, connected: false, booked: [] },
      { headers },
    );
  }
}
