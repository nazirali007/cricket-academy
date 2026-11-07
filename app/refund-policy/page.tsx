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
      intro="Please read this before you book. In short: ground bookings are not refundable, except when the academy cancels your match."
    >
      <h2>No refunds after booking</h2>
      <p>
        Once your payment is complete and your slot is booked, the booking is final.
        If you cancel, change your plans or don&apos;t arrive, the amount you paid
        will not be refunded.
      </p>

      <h2>If the academy cancels your match</h2>
      <p>
        If CCS Academy cancels your booked slot, you will get a 100% refund of the
        amount you paid for that booking, including any match balls and umpires
        you paid for. This is the only case in which a booking is refunded.
      </p>

      <h2>If a payment doesn&apos;t result in a booking</h2>
      <p>
        When you press Pay, your slots are held for you for {HOLD_MINUTES} minutes.
        If your payment reaches us after that time and someone else has booked one
        of your slots in the meantime, your booking can&apos;t go ahead, and your
        full payment is refunded automatically. You are never charged for a slot
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
