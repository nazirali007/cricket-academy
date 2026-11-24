import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";
import { HOLD_MINUTES } from "@/lib/booking";
import { bookingPhone, contact } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "Refund and cancellation policy for cricket ground bookings at CCS Cricket Academy, Lucknow.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      intro="Please read this before you book. In short: once a booking is confirmed it is not refundable, except when the academy cancels your match. Rain and weather follow the ground rules."
    >
      <h2>No refunds after booking</h2>
      <p>
        Once you pay the booking amount and your slot is booked, the booking is
        final. If you cancel, change your plans or don&apos;t arrive, the amounts
        you have already paid will not be refunded.
      </p>

      <h2>If the academy cancels your match</h2>
      <p>
        If CCS Academy cancels your booked slot, you will get a 100% refund of
        everything you paid for that booking, including any match balls and
        umpires. Payments made online (the booking amount and any payment links)
        are refunded through Razorpay, and anything paid in cash at the ground is
        returned in cash. Any payment links you haven&apos;t paid yet are
        cancelled.
      </p>

      <h2>If a match is cancelled because of the rules</h2>
      <p>
        If your match is cancelled because a player breaks the ground rules
        (for example, a player arrives drunk, or someone smokes or drinks at the
        ground), this is not a cancellation by the academy, and nothing is
        refunded.
      </p>

      <h2>Rain, bad weather and technical problems</h2>
      <ul>
        <li>
          If play is cancelled because of rain, a natural disaster or any
          technical reason, the decision of the academy management is final.
        </li>
        <li>
          If it rains after 10 overs of the first innings have been completed,
          only 50% of the ground fee is charged.
        </li>
        <li>
          If the academy&apos;s lights fail, the match restarts from the same
          over at which play stopped.
        </li>
        <li>A match that has to be moved is played on a day the ground is available.</li>
      </ul>
      <p>
        See the full <Link href="/terms#ground-rules">ground rules</Link>.
      </p>

      <h2>If a payment doesn&apos;t result in a booking</h2>
      <p>
        When you press Pay, your slots are held for you for {HOLD_MINUTES} minutes.
        If your payment reaches us after that time and someone else has booked one
        of your slots in the meantime, your booking can&apos;t go ahead, and what
        you paid is refunded in full automatically. You are never charged for a slot
        you did not get.
      </p>

      <h2>How refunds are paid</h2>
      <ul>
        <li>Refunds are always for the full amount paid for the booking.</li>
        <li>
          Money goes back to the same account, card or UPI ID you paid with,
          through our payment provider, Razorpay.
        </li>
        <li>
          Refunds usually reach you within 5–7 working days, depending on your
          bank.
        </li>
      </ul>

      <h2>Questions</h2>
      <p>
        Call <a href={`tel:${bookingPhone.replace(/\s/g, "")}`}>{bookingPhone}</a>{" "}
        or email <a href={`mailto:${contact.email}`}>{contact.email}</a> with your
        booking reference. See also our <Link href="/terms">Terms</Link>.
      </p>
    </LegalPage>
  );
}
