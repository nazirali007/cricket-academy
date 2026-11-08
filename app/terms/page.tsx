import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";
import { HOLD_MINUTES, MAX_DAYS_AHEAD, MAX_SLOTS_PER_BOOKING } from "@/lib/booking";
import { bookingPhone, contact } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using the CCS Cricket Academy website and booking the cricket ground in Lucknow.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro="These terms apply when you use this website or book the cricket ground at CCS Academy. By booking, you agree to them."
    >
      <h2>Who we are</h2>
      <p>
        CCS Academy (CCS Cricket Academy), {contact.address.replace(/\n/g, " ")}.
        Phone: {bookingPhone}. Email: {contact.email}.
      </p>

      <h2>Booking the ground</h2>
      <ul>
        <li>
          Slots, timings and rates are shown on our website. The price you see on
          the review screen is the full amount you pay. No extra charges are added.
        </li>
        <li>
          You can book up to {MAX_SLOTS_PER_BOOKING} slots at a time, up to{" "}
          {MAX_DAYS_AHEAD} days ahead.
        </li>
        <li>
          Your booking is confirmed only after your payment is complete. When you
          press Pay, your slots are held for you for {HOLD_MINUTES} minutes.
        </li>
        <li>
          There are 3 slots every day: Morning 8:00 AM – 12:00 PM, Evening 3:00 PM – 7:30 PM and Night 8:00 PM – 12:00 AM. The night slot belongs to the date it starts on.
        </li>
        <li>
          Ground rates don&apos;t include umpires or match balls. You can add them
          while booking at the prices shown.
        </li>
        <li>
          Please give a correct name and mobile number, so we can contact you about
          your booking.
        </li>
      </ul>

      <h2>Payments</h2>
      <p>
        Payments are processed securely by Razorpay. We never see or store your
        card, UPI or bank details.
      </p>

      <h2>Cancellations and refunds</h2>
      <p>
        Bookings are not refundable if you cancel. If the academy cancels your
        match, you get a 100% refund. See our{" "}
        <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link> for
        details.
      </p>

      <h2>Rules at the ground</h2>
      <ul>
        <li>Smoking is not allowed.</li>
        <li>Tobacco and gutkha are not allowed.</li>
        <li>Please follow the instructions of academy staff at the ground.</li>
      </ul>

      <h2>Your information</h2>
      <p>
        We use your details only to manage your booking. See our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms. The version on this page when you book applies
        to your booking. These terms are governed by the laws of India, and the
        courts in Lucknow have jurisdiction.
      </p>
    </LegalPage>
  );
}
