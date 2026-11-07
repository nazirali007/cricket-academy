import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { bookingPhone, contact } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How CCS Cricket Academy collects and uses your information when you book the cricket ground or use this website.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This explains what information we collect when you use this website or book the ground, and how we use it."
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          When you book the ground: your name, mobile number, company or team name
          (if you give one), the slots and add-ons you choose and the amount paid.
        </li>
        <li>
          When you pay: a payment reference from Razorpay. Your card, UPI and bank
          details go directly to Razorpay. We never see or store them.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To confirm and manage your booking, and to contact you about it.</li>
        <li>To process payments and any refunds.</li>
        <li>To keep records we need for our accounts.</li>
      </ul>
      <p>We don&apos;t sell your information or use it for advertising.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li>Razorpay, to process your payment and any refund.</li>
        <li>
          The companies that host our website, database and email, only so the
          website can run.
        </li>
        <li>Authorities, if the law requires it.</li>
      </ul>

      <h2>Cookies and storage</h2>
      <p>
        We don&apos;t use advertising or tracking cookies. While you book, your
        browser keeps your chosen slots for that visit so they aren&apos;t lost if
        you refresh the page. Razorpay may use its own cookies in its payment
        window.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep booking records for as long as we need them to run our bookings
        and for our accounts and legal obligations.
      </p>

      <h2>Your choices</h2>
      <p>
        To see, correct or delete the information we hold about you, call{" "}
        <a href={`tel:${bookingPhone.replace(/\s/g, "")}`}>{bookingPhone}</a> or
        email <a href={`mailto:${contact.email}`}>{contact.email}</a>. We may need
        to keep some records for our accounts.
      </p>

      <h2>Contact</h2>
      <p>
        CCS Academy, {contact.address.replace(/\n/g, " ")}. Email:{" "}
        {contact.email}.
      </p>
    </LegalPage>
  );
}
