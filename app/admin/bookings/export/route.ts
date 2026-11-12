import type { NextRequest } from "next/server";
import { parseBookingFilters } from "@/lib/admin-filters";
import { spreadsheetDateTime } from "@/lib/admin-format";
import { bookingReference, indiaNow } from "@/lib/booking";
import { searchBookings } from "@/lib/db";
import { csvResponse } from "@/lib/csv";
import { adminAccess } from "../../_components/gate";

// Downloads the bookings list exactly as filtered on the admin page.
export async function GET(request: NextRequest) {
  if ((await adminAccess()) !== "ok") {
    return new Response("Not signed in", { status: 401 });
  }
  const { today } = indiaNow();
  const { search } = parseBookingFilters(request.nextUrl.searchParams, today);
  const bookings = await searchBookings(search, 10_000);

  return csvResponse(
    `ccs-bookings-${today}.csv`,
    [
      "Reference", "Status", "Cancelled by academy", "Match dates and slots",
      "Slots", "Customer", "Phone", "Email", "Team or organisation",
      "Total (Rs)", "Booked at", "Paid at", "Razorpay payment ID",
      "Refund ID", "Invoice emailed",
    ],
    bookings.map((b) => [
      bookingReference(b.id),
      b.status,
      b.cancelledByAcademy ? "yes" : "",
      b.lines
        .map((l) =>
          `${l.date} ${l.slotName} (${l.timing})` +
          (l.balls > 0 ? ` +${l.balls} balls` : "") +
          (l.umpires ? " +umpires" : ""),
        )
        .join("; "),
      b.lines.length,
      b.name,
      b.phone,
      b.email,
      b.organisation,
      b.total,
      spreadsheetDateTime(b.createdAt),
      spreadsheetDateTime(b.paidAt),
      b.paymentId,
      b.refundId,
      b.invoiceSentAt ? "yes" : "",
    ]),
  );
}
