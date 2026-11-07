import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { bookingReference, formatDate, formatRupees } from "@/lib/booking";
import { getBookingByToken, isDatabaseConfigured } from "@/lib/db";
import { bookingPhone, contact } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

const messages: Partial<Record<string, [string, string]>> = {
  confirmed: ["Booking confirmed", "Your payment was received and these slots are yours."],
  pending: ["Payment not finished", "This booking hasn't been paid yet. If you've just paid, refresh this page in a minute."],
  refund_pending: ["Refund in progress", "A slot was no longer available when your payment arrived, so we're refunding you in full."],
  refunding: ["Refund in progress", "A slot was no longer available when your payment arrived, so we're refunding you in full."],
  refunded: ["Payment refunded", "A slot was no longer available when your payment arrived. Your full payment has been refunded and should reach you in 5–7 working days."],
  refund_failed: ["Refund in progress", "A slot was no longer available when your payment arrived. Our team will refund you in full and contact you."],
  expired: ["Booking not completed", "The payment wasn't completed in time, so these slots were not booked and you have not been charged."],
  cancelled: ["Booking not completed", "The payment was cancelled, so these slots were not booked and you have not been charged."],
  cancelled_by_admin: ["Booking cancelled", "This booking was cancelled by the academy. Please contact us about any refund."],
};

async function Receipt({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const booking = isDatabaseConfigured() ? await getBookingByToken(token) : null;

  if (!booking) {
    return (
      <p className="mt-8">
        We couldn&apos;t find this booking. Please check the link, or call {bookingPhone}.
      </p>
    );
  }

  const academyCancelled: Partial<Record<string, [string, string]>> = {
    refunded: ["Booking cancelled by the academy", `The academy cancelled this booking. Your full payment of ${formatRupees(booking.total)} has been refunded and should reach you in 5–7 working days.`],
    refund_pending: ["Booking cancelled by the academy", "The academy cancelled this booking, and your full payment is being refunded."],
    refunding: ["Booking cancelled by the academy", "The academy cancelled this booking, and your full payment is being refunded."],
    refund_failed: ["Booking cancelled by the academy", "The academy cancelled this booking. Our team will refund your full payment and contact you."],
  };
  const [title, text] =
    (booking.cancelledByAcademy ? academyCancelled[booking.status] : undefined) ??
    messages[booking.status] ?? ["Booking", ""];
  return (
    <div className="mt-8 max-w-2xl bg-white p-6 md:p-8">
      <p className="text-sm font-bold text-muted-foreground">
        Reference {bookingReference(booking.id)}
      </p>
      <h2 className="mt-1 font-display text-4xl font-bold uppercase">{title}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>

      <ul className="mt-6 divide-y divide-navy/15 border-y border-navy/15">
        {booking.lines.map((line) => (
          <li key={`${line.date}${line.slotId}`} className="flex justify-between gap-4 py-3">
            <span>
              <span className="block font-bold">
                {formatDate(line.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
              {line.slotName}, {line.timing}
              {(line.balls > 0 || line.umpires) && (
                <span className="block text-sm text-muted-foreground">
                  {[line.balls > 0 && `${line.balls} match ball${line.balls === 1 ? "" : "s"}`, line.umpires && "2 umpires"].filter(Boolean).join(", ")}
                </span>
              )}
            </span>
            <span className="font-semibold whitespace-nowrap">{formatRupees(line.total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between text-lg font-bold">
        <span>Total</span>
        <span>{formatRupees(booking.total)}</span>
      </p>

      <dl className="mt-6 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Booked by</dt>
          <dd className="font-semibold">{booking.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Mobile</dt>
          <dd className="font-semibold">+91 {booking.phone}</dd>
        </div>
        {booking.paymentId && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Payment ID</dt>
            <dd className="font-semibold">{booking.paymentId}</dd>
          </div>
        )}
      </dl>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Ground address: {contact.address.replace(/\n/g, " ")}. Questions? Call{" "}
        <a href={`tel:${bookingPhone.replace(/\s/g, "")}`} className="font-semibold underline">
          {bookingPhone}
        </a>
        .
      </p>
    </div>
  );
}

export default function BookingReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <>
      <div className="bg-navy pt-32 pb-10 text-white">
        <h1 className="mx-auto max-w-7xl px-5 font-display text-5xl font-bold uppercase md:px-8">
          Your booking
        </h1>
      </div>
      <section className="min-h-[60svh] bg-cream pb-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="pt-6 text-sm text-muted-foreground">
            Keep this page&apos;s link to see your booking again.
          </p>
          <Suspense fallback={<p className="mt-8">Loading…</p>}>
            <Receipt params={params} />
          </Suspense>
          <Link href="/cricket-stadium-booking-lucknow" className="mt-8 inline-block font-semibold underline">
            Book more slots
          </Link>
        </div>
      </section>
    </>
  );
}
