import type { Metadata } from "next";
import { Suspense } from "react";
import { bookingPresets, parseBookingFilters } from "@/lib/admin-filters";
import { formatDateTime } from "@/lib/admin-format";
import { blockedSlots } from "@/lib/blocked-slots";
import {
  bookingReference,
  findSlot,
  formatDate,
  formatRupees,
  indiaNow,
} from "@/lib/booking";
import { bookingViews, searchBookings, type BookingStatus } from "@/lib/db";
import { FilterBar, fieldWrap, selectClass } from "../_components/filters";
import { AdminGate } from "../_components/gate";
import { Badge, PageTitle } from "../_components/ui";
import { CancelButton, ResendInvoiceButton } from "./forms";

export const metadata: Metadata = { title: "Bookings" };

const statusLabel: Record<BookingStatus, [string, string]> = {
  confirmed: ["Paid", "bg-emerald-100 text-emerald-800"],
  pending: ["Paying now", "bg-amber-100 text-amber-800"],
  refund_pending: ["Refunding", "bg-amber-100 text-amber-800"],
  refunding: ["Refunding", "bg-amber-100 text-amber-800"],
  refunded: ["Refunded", "bg-slate-200 text-slate-700"],
  refund_failed: ["Refund failed: refund manually", "bg-red-100 text-red-800"],
  expired: ["Abandoned", "bg-slate-200 text-slate-700"],
  cancelled: ["Abandoned", "bg-slate-200 text-slate-700"],
  cancelled_by_admin: ["Cancelled", "bg-slate-200 text-slate-700"],
};

const shortDate = (date: string) =>
  formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

async function Bookings({ searchParams }: { searchParams: PageProps<"/admin/bookings">["searchParams"] }) {
  const { today } = indiaNow();
  const filters = parseBookingFilters(await searchParams, today);
  const bookings = await searchBookings(filters.search);
  const paid = bookings.filter((b) => b.status === "confirmed");
  const paidTotal = paid.reduce((sum, b) => sum + b.total, 0);
  const slotCount = paid.reduce((sum, b) => sum + b.lines.length, 0);
  const events = blockedSlots.filter((b) => b.date >= today);

  return (
    <>
      <FilterBar
        path="/admin/bookings"
        exportPath="/admin/bookings/export"
        presets={bookingPresets}
        when={filters.when}
        keep={{ view: filters.view }}
        query={filters.query}
        from={filters.from}
        to={filters.to}
        dateLabel="Match date"
        searchPlaceholder="Name, phone, email, CCS-00042, payment ID"
      >
        <label className={fieldWrap}>
          Show
          <select name="view" defaultValue={filters.view} className={selectClass}>
            {Object.entries(bookingViews).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      <p className="mt-6 font-semibold">
        {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        {paid.length > 0 && (
          <span className="font-normal text-muted-foreground">
            {" "}· {paid.length} paid, {slotCount} {slotCount === 1 ? "slot" : "slots"},{" "}
            {formatRupees(paidTotal)} collected
          </span>
        )}
        {bookings.length === 500 && (
          <span className="block text-sm font-normal text-muted-foreground">
            Showing the newest 500. Narrow the dates or search to see older ones.
          </span>
        )}
      </p>

      <div className="mt-4 overflow-x-auto bg-white">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-navy/20">
              {["Reference", "Status", "Match slots", "Booked by", "Total", ""].map(
                (heading) => (
                  <th key={heading} scope="col" className="p-3 font-bold">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const reference = bookingReference(booking.id);
              const [baseLabel, style] = statusLabel[booking.status];
              const label = booking.cancelledByAcademy
                ? `Cancelled by academy · ${baseLabel}`
                : baseLabel;
              return (
                <tr key={booking.id} className="border-b border-navy/10 align-top">
                  <td className="p-3">
                    <span className="font-bold">{reference}</span>
                    <span className="block text-xs text-muted-foreground">
                      Booked {formatDateTime(booking.createdAt)}
                    </span>
                    {booking.paidAt && (
                      <span className="block text-xs text-muted-foreground">
                        Paid {formatDateTime(booking.paidAt)}
                      </span>
                    )}
                    {booking.paymentId && (
                      <span className="block text-xs break-all text-muted-foreground">
                        {booking.paymentId}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge className={style}>{label}</Badge>
                    {booking.status === "confirmed" && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className={booking.invoiceSentAt ? "text-emerald-700" : "text-red-700"}>
                          {booking.invoiceSentAt ? "Invoice emailed" : "Invoice not sent"}
                        </p>
                        <ResendInvoiceButton id={booking.id} />
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <ul className="space-y-1">
                      {booking.lines.map((line) => (
                        <li key={`${line.date}${line.slotId}`}>
                          <span className={`font-semibold ${line.date === today ? "text-ball" : ""}`}>
                            {line.date === today ? "Today" : shortDate(line.date)}
                          </span>
                          , {line.slotName} ({line.timing})
                          {(line.balls > 0 || line.umpires) && (
                            <span className="text-muted-foreground">
                              {" "}
                              + {[line.balls > 0 && `${line.balls} balls`, line.umpires && "umpires"].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold">{booking.name}</span>
                    <a href={`tel:+91${booking.phone}`} className="block underline">
                      {booking.phone}
                    </a>
                    {booking.email && (
                      <a href={`mailto:${booking.email}`} className="block break-all underline">
                        {booking.email}
                      </a>
                    )}
                    {booking.organisation && (
                      <span className="block text-muted-foreground">{booking.organisation}</span>
                    )}
                  </td>
                  <td className="p-3 font-bold whitespace-nowrap">{formatRupees(booking.total)}</td>
                  <td className="p-3">
                    {(booking.status === "confirmed" || booking.status === "pending") && (
                      <CancelButton
                        id={booking.id}
                        label={reference}
                        paid={booking.status === "confirmed"}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center">
                  No bookings match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-14 font-display text-3xl font-bold uppercase">
        Blocked for academy events
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        These show as Booked to customers. To change them, edit lib/blocked-slots.ts.
      </p>
      <ul className="mt-4 grid gap-2 bg-white p-4 text-sm sm:grid-cols-2">
        {events.map((event) => (
          <li key={`${event.date}${event.slotId}`}>
            <span className="font-semibold">{shortDate(event.date)}</span>,{" "}
            {findSlot(event.date, event.slotId)?.name}: {event.event}
          </li>
        ))}
        {events.length === 0 && <li className="text-muted-foreground">None coming up.</li>}
      </ul>
    </>
  );
}

export default function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  return (
    <>
      <PageTitle>Ground bookings</PageTitle>
      <Suspense fallback={<p className="mt-8">Loading…</p>}>
        <AdminGate>
          <Bookings searchParams={searchParams} />
        </AdminGate>
      </Suspense>
    </>
  );
}
