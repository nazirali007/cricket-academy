import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin-auth";
import { blockedSlots } from "@/lib/blocked-slots";
import {
  bookingReference,
  findSlot,
  formatDate,
  formatRupees,
  indiaNow,
} from "@/lib/booking";
import {
  isDatabaseConfigured,
  listBookingsForAdmin,
  type BookingStatus,
} from "@/lib/db";
import { logOut } from "./actions";
import { CancelButton, LoginForm } from "./forms";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

const statusLabel: Record<BookingStatus, [string, string]> = {
  confirmed: ["Paid", "bg-emerald-100 text-emerald-800"],
  pending: ["Paying now", "bg-amber-100 text-amber-800"],
  refund_pending: ["Refunding", "bg-amber-100 text-amber-800"],
  refunding: ["Refunding", "bg-amber-100 text-amber-800"],
  refunded: ["Refunded", "bg-slate-200 text-slate-700"],
  refund_failed: ["Refund failed: refund manually", "bg-red-100 text-red-800"],
  expired: ["Expired", "bg-slate-200 text-slate-700"],
  cancelled: ["Cancelled", "bg-slate-200 text-slate-700"],
  cancelled_by_admin: ["Cancelled", "bg-slate-200 text-slate-700"],
};

const shortDate = (date: string) =>
  formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

async function Bookings() {
  // Environment variables must be read per request, not baked in at build time.
  await connection();

  if (!process.env.ADMIN_PASSWORD) {
    return (
      <p className="mt-8">
        Admin access is turned off until ADMIN_PASSWORD is set on the server.
      </p>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;
  if (!isDatabaseConfigured()) {
    return <p className="mt-8">The booking database isn&apos;t connected yet.</p>;
  }

  const bookings = await listBookingsForAdmin();
  const { today } = indiaNow();
  const events = blockedSlots.filter((b) => b.date >= today);

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="font-semibold">
          {bookings.length} recent {bookings.length === 1 ? "booking" : "bookings"}
        </p>
        <form action={logOut}>
          <button type="submit" className="text-sm font-bold underline">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto bg-white">
        <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-navy/20">
              {["Reference", "Status", "Slots", "Customer", "Total", ""].map(
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
                  <td className="p-3 font-bold">
                    {reference}
                    {booking.paymentId && (
                      <span className="block font-normal text-muted-foreground">
                        {booking.paymentId}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-1 text-xs font-bold ${style}`}>
                      {label}
                    </span>
                  </td>
                  <td className="p-3">
                    <ul className="space-y-1">
                      {booking.lines.map((line) => (
                        <li key={`${line.date}${line.slotId}`}>
                          <span className="font-semibold">{shortDate(line.date)}</span>,{" "}
                          {line.slotName} ({line.timing})
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
                    {booking.name}
                    <a href={`tel:+91${booking.phone}`} className="block underline">
                      {booking.phone}
                    </a>
                    {booking.organisation && (
                      <span className="block text-muted-foreground">
                        {booking.organisation}
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-bold">{formatRupees(booking.total)}</td>
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
                  No bookings yet.
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
      </ul>
    </>
  );
}

export default function AdminBookingsPage() {
  return (
    <>
      <div className="bg-navy pt-32 pb-10 text-white">
        <h1 className="mx-auto max-w-7xl px-5 font-display text-5xl font-bold uppercase md:px-8">
          Ground bookings
        </h1>
      </div>
      <section className="min-h-[60svh] bg-cream pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-2 md:px-8">
          <Suspense fallback={<p className="mt-8">Loading…</p>}>
            <Bookings />
          </Suspense>
        </div>
      </section>
    </>
  );
}
