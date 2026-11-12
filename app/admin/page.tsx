import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatDateTime } from "@/lib/admin-format";
import { admissionStatuses, getAdmissionStats, searchAdmissions } from "@/lib/admissions";
import { bookingReference, formatDate, formatRupees, indiaNow } from "@/lib/booking";
import { getBookingStats, searchBookings } from "@/lib/db";
import { isTestMode } from "@/lib/razorpay";
import { AdminGate } from "./_components/gate";
import { PageTitle, StatCard } from "./_components/ui";

export const metadata: Metadata = { title: "Overview" };

async function Overview() {
  const { today } = indiaNow();
  const [bookings, admissions, todaysMatches, latest] = await Promise.all([
    getBookingStats(today),
    getAdmissionStats(today),
    searchBookings({ view: "paid", range: { from: today, to: today, on: "match" }, query: "" }),
    searchAdmissions({ status: "all", program: "", range: null, query: "" }, 6),
  ]);

  return (
    <>
      <p className="mt-2 text-muted-foreground">
        {formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      {isTestMode() && (
        <p className="mt-6 border-l-4 border-amber-500 bg-amber-100 p-4 text-sm text-amber-900">
          <strong>Razorpay is in test mode.</strong> Payments are pretend and no
          money is collected. Before going live, put your live keys
          (rzp_live_…) in the hosting settings.
        </p>
      )}

      {bookings.refundsNeedingAction > 0 && (
        <Link
          href="/admin/bookings?view=refunds"
          className="mt-6 block bg-red-700 p-4 font-bold text-white"
        >
          {bookings.refundsNeedingAction} refund
          {bookings.refundsNeedingAction === 1 ? " needs" : "s need"} attention. Open refunds →
        </Link>
      )}

      <h2 className="mt-10 font-display text-2xl font-bold uppercase">Students & admissions</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={admissions.students}
          hint="Requests marked Joined"
          href="/admin/admissions?status=joined"
          tone="good"
        />
        <StatCard
          label="Awaiting a reply"
          value={admissions.awaitingReply}
          hint="New requests not yet contacted"
          href="/admin/admissions?status=new"
          tone={admissions.awaitingReply > 0 ? "alert" : "plain"}
        />
        <StatCard
          label="Requests today"
          value={admissions.today}
          href="/admin/admissions?when=today"
        />
        <StatCard
          label="Requests this month"
          value={admissions.thisMonth}
          hint={`${admissions.total} in total`}
          href="/admin/admissions?when=month"
        />
      </div>
      {admissions.byProgram.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {admissions.byProgram
            .map(
              (p) =>
                `${p.program}: ${p.students} ${p.students === 1 ? "student" : "students"} from ${p.requests} ${p.requests === 1 ? "request" : "requests"}`,
            )
            .join(" · ")}
        </p>
      )}

      <h2 className="mt-10 font-display text-2xl font-bold uppercase">Ground bookings</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Matches today"
          value={bookings.matchesToday}
          href="/admin/bookings?when=today&view=paid"
        />
        <StatCard
          label="Booked today"
          value={bookings.bookedToday}
          hint="New paid bookings"
          href="/admin/bookings?when=booked-today&view=paid"
        />
        <StatCard label="Collected today" value={formatRupees(bookings.collectedToday)} />
        <StatCard
          label="Collected this month"
          value={formatRupees(bookings.collectedThisMonth)}
          hint={`${formatRupees(bookings.collectedAllTime)} from ${bookings.paidBookings} paid bookings in total`}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Money figures count paid bookings only, after refunds. Razorpay&apos;s
        fees are not taken off.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="todays-matches">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="todays-matches" className="font-display text-2xl font-bold uppercase">
              Today&apos;s matches
            </h2>
            <Link href="/admin/bookings?when=upcoming&view=paid" className="text-sm font-bold underline">
              All upcoming
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-navy/10 bg-white">
            {todaysMatches.flatMap((booking) =>
              booking.lines
                .filter((line) => line.date === today)
                .map((line) => (
                  <li key={`${booking.id}${line.slotId}`} className="flex justify-between gap-4 p-4 text-sm">
                    <span>
                      <span className="block font-bold">
                        {line.slotName} · {line.timing}
                      </span>
                      {booking.name}
                      {booking.organisation && ` (${booking.organisation})`} ·{" "}
                      <a href={`tel:+91${booking.phone}`} className="underline">
                        {booking.phone}
                      </a>
                    </span>
                    <span className="shrink-0 text-right text-muted-foreground">
                      {bookingReference(booking.id)}
                    </span>
                  </li>
                )),
            )}
            {todaysMatches.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No matches booked for today.</li>
            )}
          </ul>
        </section>

        <section aria-labelledby="latest-admissions">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="latest-admissions" className="font-display text-2xl font-bold uppercase">
              Latest admission requests
            </h2>
            <Link href="/admin/admissions" className="text-sm font-bold underline">
              See all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-navy/10 bg-white">
            {latest.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 p-4 text-sm">
                <span>
                  <span className="block font-bold">
                    {a.name}, {a.age} · {a.program}
                  </span>
                  <a href={`tel:+91${a.phone}`} className="underline">
                    {a.phone}
                  </a>{" "}
                  · {admissionStatuses[a.status]}
                </span>
                <span className="shrink-0 text-right text-muted-foreground">
                  {formatDateTime(a.createdAt)}
                </span>
              </li>
            ))}
            {latest.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No admission requests yet.</li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}

export default function AdminOverviewPage() {
  return (
    <>
      <PageTitle>Overview</PageTitle>
      <Suspense fallback={<p className="mt-8">Loading…</p>}>
        <AdminGate>
          <Overview />
        </AdminGate>
      </Suspense>
    </>
  );
}
