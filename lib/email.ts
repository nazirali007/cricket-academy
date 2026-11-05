import nodemailer from "nodemailer";
import {
  bookingReference,
  findSlot,
  formatDate,
  formatRupees,
} from "@/lib/booking";
import { contact, siteUrl } from "@/lib/site";

// Emails the academy about a new booking, using its own mailbox. Does nothing
// until the SMTP settings are in place, so the site still works without them.
export async function sendBookingAlert(booking: {
  id: number;
  date: string;
  slotId: string;
  name: string;
  phone: string;
  organisation: string | null;
  balls: number;
  umpires: boolean;
  total: number;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, BOOKING_EMAIL_TO } =
    process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return;

  const port = Number(SMTP_PORT) || 465;
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const slot = findSlot(booking.date, booking.slotId);
  const reference = bookingReference(booking.id);
  const date = formatDate(booking.date);

  await transport.sendMail({
    from: `"CCS Academy Bookings" <${SMTP_USER}>`,
    to: BOOKING_EMAIL_TO || contact.email,
    subject: `New ground booking ${reference}: ${date}, ${slot?.name}`,
    text: [
      "A new ground booking has been made on the website.",
      "",
      `Reference: ${reference}`,
      `Date: ${date}`,
      `Slot: ${slot?.name}, ${slot?.timing}`,
      "",
      `Customer: ${booking.name}`,
      `Mobile: +91 ${booking.phone}`,
      `Company or team: ${booking.organisation ?? "Not given"}`,
      "",
      `Match balls: ${booking.balls}`,
      `Umpires: ${booking.umpires ? "Yes" : "No"}`,
      `Total: ${formatRupees(booking.total)}`,
      "",
      `Manage bookings: ${siteUrl}/admin/bookings`,
    ].join("\n"),
  });
}
