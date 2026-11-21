import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { bookingReference, formatDate, formatRupees } from "@/lib/booking";
import { getBookingByToken, isDatabaseConfigured, listSlotPayments } from "@/lib/db";
import { indiaTime } from "@/lib/email";
import { planFor, stageName } from "@/lib/installments";
import { ledger, sumOf } from "@/lib/ledger";
import { recordLinkPayment } from "@/lib/payment-links";
import { PAYMENT_LINK_ID } from "@/lib/razorpay";
import { bookingPhone, contact } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

const messages: Partial<Record<string, [string, string]>> = {
  confirmed: ["Booking confirmed", "These slots are yours. Payment links for any balance are sent to your mobile and email before each match."],
  pending: ["Payment not finished", "This booking hasn't been paid yet. If you've just paid, refresh this page in a minute."],
  refund_pending: ["Refund in progress", "A slot was no longer available when your payment arrived, so we're refunding you in full."],
  refunding: ["Refund in progress", "A slot was no longer available when your payment arrived, so we're refunding you in full."],
  refunded: ["Payment refunded", "A slot was no longer available when your payment arrived. Your full payment has been refunded and should reach you in 5–7 working days."],
  refund_failed: ["Refund in progress", "A slot was no longer available when your payment arrived. Our team will refund you in full and contact you."],
  expired: ["Booking not completed", "The payment wasn't completed in time, so these slots were not booked and you have not been charged."],
  cancelled: ["Booking not completed", "The payment was cancelled, so these slots were not booked and you have not been charged."],
  cancelled_by_admin: ["Booking cancelled", "The academy cancelled this booking before it was paid, so you have not been charged."],
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function Receipt({ params, searchParams }: Props) {
  await connection();
  const { token } = await params;
  if (!isDatabaseConfigured()) return <p className="mt-8">Bookings are unavailable right now.</p>;

  // Razorpay sends the customer back here after they pay a link. Record it
  // straight away rather than waiting for the webhook.
  const linkId = (await searchParams).razorpay_payment_link_id;
  if (typeof linkId === "string" && PAYMENT_LINK_ID.test(linkId)) {
    await recordLinkPayment(linkId).catch((error) =>
      console.error(`Could not record payment link ${linkId}`, error),
    );
  }
  const booking = await getBookingByToken(token);

  if (!booking) {
    return (
      <p className="mt-8">
        We couldn&apos;t find this booking. Please check the link, or call {bookingPhone}.
      </p>
    );
  }

  const academyCancelled: Partial<Record<string, [string, string]>> = {
    refunded: ["Booking cancelled by the academy", "The academy cancelled this booking. Everything you paid online has been refunded and should reach you in 5–7 working days."],
    refund_pending: ["Booking cancelled by the academy", "The academy cancelled this booking, and everything you paid online is being refunded."],
    refunding: ["Booking cancelled by the academy", "The academy cancelled this booking, and everything you paid online is being refunded."],
    refund_failed: ["Booking cancelled by the academy", "The academy cancelled this booking. Our team will refund everything you paid and contact you."],
  };
  const [title, text] =
    (booking.cancelledByAcademy ? academyCancelled[booking.status] : undefined) ??
    messages[booking.status] ?? ["Booking", ""];
  const confirmed = booking.status === "confirmed";
  const slots = ledger(booking, confirmed ? await listSlotPayments([booking.id]) : []);
  const bookedAt = Date.parse(booking.paidAt ?? booking.createdAt);
  return (
    <div className="mt-8 max-w-2xl bg-white p-6 md:p-8">
      <p className="text-sm font-bold text-muted-foreground">
        Reference {bookingReference(booking.id)}
      </p>
      <h2 className="mt-1 font-display text-4xl font-bold uppercase">{title}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>

      <ul className="mt-6 divide-y divide-navy/15 border-y border-navy/15">
        {slots.map(({ line, paid, balance, open }) => (
          <li key={`${line.date}${line.slotId}`} className="py-4">
            <div className="flex justify-between gap-4">
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
            </div>

            {confirmed && (
              <div className="mt-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-emerald-700">{formatRupees(paid)}</span>
                </p>
                {balance > 0 ? (
                  <>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-semibold">{formatRupees(balance)}</span>
                    </p>
                    {open?.linkUrl ? (
                      <a
                        href={open.linkUrl}
                        className="mt-3 flex h-11 items-center justify-center bg-ball px-5 text-sm font-bold text-white"
                      >
                        Pay {formatRupees(open.amount)} now
                      </a>
                    ) : (
                      <ul className="mt-1 text-xs text-muted-foreground">
                        {planFor(line, bookedAt)
                          .filter((part) => part.sendAt !== null)
                          .map((part) => (
                            <li key={part.stage}>
                              {stageName[part.stage]}: link sent {indiaTime(part.sendAt!)}
                            </li>
                          ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">Fully paid</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1">
        <p className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatRupees(booking.total)}</span>
        </p>
        {confirmed && (
          <>
            <p className="flex justify-between">
              <span>Paid so far</span>
              <span className="font-semibold">{formatRupees(sumOf(slots, "paid"))}</span>
            </p>
            <p className="flex justify-between">
              <span>Balance</span>
              <span className="font-semibold">{formatRupees(sumOf(slots, "balance"))}</span>
            </p>
          </>
        )}
      </div>

      <dl className="mt-6 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Booked by</dt>
          <dd className="font-semibold">{booking.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Mobile</dt>
          <dd className="font-semibold">+91 {booking.phone}</dd>
        </div>
        {booking.email && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Invoice sent to</dt>
            <dd className="font-semibold break-all">{booking.email}</dd>
          </div>
        )}
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

export default function BookingReceiptPage({ params, searchParams }: Props) {
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
            <Receipt params={params} searchParams={searchParams} />
          </Suspense>
          <Link href="/cricket-stadium-booking-lucknow" className="mt-8 inline-block font-semibold underline">
            Book more slots
          </Link>
        </div>
      </section>
    </>
  );
}
