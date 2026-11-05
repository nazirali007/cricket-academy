import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin-auth";
import {
  bookingReference,
  findSlot,
  formatDate,
  formatRupees,
  indiaNow,
} from "@/lib/booking";
import { isDatabaseConfigured, listBookings } from "@/lib/db";
import { logOut } from "./actions";
import { CancelButton, LoginForm } from "./forms";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

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

  const bookings = await listBookings(indiaNow().today);

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="font-semibold">
          {bookings.length} upcoming{" "}
          {bookings.length === 1 ? "booking" : "bookings"}
        </p>
        <form action={logOut}>
          <button type="submit" className="text-sm font-bold underline">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto bg-white">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-navy/20">
              {[
                "Reference",
                "Date",
                "Slot",
                "Customer",
                "Phone",
                "Add-ons",
                "Total",
                "",
              ].map((heading) => (
                <th key={heading} scope="col" className="p-3 font-bold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const slot = findSlot(booking.date, booking.slotId);
              const reference = bookingReference(booking.id);
              const addOns = [
                booking.balls > 0 &&
                  `${booking.balls} ball${booking.balls === 1 ? "" : "s"}`,
                booking.umpires && "Umpires",
              ].filter(Boolean);
              return (
                <tr key={booking.id} className="border-b border-navy/10">
                  <td className="p-3 font-bold">{reference}</td>
                  <td className="p-3">
                    {formatDate(booking.date, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    {slot?.name ?? booking.slotId}
                    <span className="block text-muted-foreground">
                      {slot?.timing}
                    </span>
                  </td>
                  <td className="p-3">
                    {booking.name}
                    {booking.organisation && (
                      <span className="block text-muted-foreground">
                        {booking.organisation}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <a href={`tel:+91${booking.phone}`} className="underline">
                      {booking.phone}
                    </a>
                  </td>
                  <td className="p-3">
                    {addOns.length ? addOns.join(", ") : "None"}
                  </td>
                  <td className="p-3 font-bold">
                    {formatRupees(booking.total)}
                  </td>
                  <td className="p-3">
                    <CancelButton id={booking.id} label={reference} />
                  </td>
                </tr>
              );
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center">
                  No upcoming bookings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminBookingsPage() {
  return (
    <>
      <div className="bg-navy px-5 pt-32 pb-10 text-white md:px-8">
        <h1 className="mx-auto max-w-7xl font-display text-5xl font-bold uppercase">
          Ground bookings
        </h1>
      </div>
      <section className="min-h-[60svh] bg-cream px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-7xl pt-2">
          <Suspense fallback={<p className="mt-8">Loading…</p>}>
            <Bookings />
          </Suspense>
        </div>
      </section>
    </>
  );
}
