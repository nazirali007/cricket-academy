import nodemailer from "nodemailer";
import { bookingReference, formatDate, formatRupees } from "@/lib/booking";
import type { BookingRecord } from "@/lib/db";
import { contact, siteUrl } from "@/lib/site";

// Emails the academy using its own mailbox. Does nothing until the SMTP
// settings are in place, so the site still works without them.
async function sendToAcademy(subject: string, lines: string[]) {
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

  await transport.sendMail({
    from: `"CCS Academy Bookings" <${SMTP_USER}>`,
    to: BOOKING_EMAIL_TO || contact.email,
    subject,
    text: [...lines, "", `Manage bookings: ${siteUrl}/admin/bookings`].join("\n"),
  });
}

function describe(booking: BookingRecord) {
  return [
    `Reference: ${bookingReference(booking.id)}`,
    `Customer: ${booking.name}`,
    `Mobile: +91 ${booking.phone}`,
    `Company or team: ${booking.organisation ?? "Not given"}`,
    "",
    ...booking.lines.map((line) => {
      const extras = [
        line.balls > 0 && `${line.balls} ball${line.balls === 1 ? "" : "s"}`,
        line.umpires && "umpires",
      ].filter(Boolean);
      return `- ${formatDate(line.date)}, ${line.slotName} (${line.timing}): ${formatRupees(line.total)}${extras.length ? ` incl. ${extras.join(" and ")}` : ""}`;
    }),
    "",
    `Total paid: ${formatRupees(booking.total)}`,
    `Razorpay payment: ${booking.paymentId ?? "-"}`,
  ];
}

export const sendBookingAlert = (booking: BookingRecord) =>
  sendToAcademy(
    `New paid ground booking ${bookingReference(booking.id)}: ${booking.lines.length} slot${booking.lines.length === 1 ? "" : "s"}, ${formatRupees(booking.total)}`,
    ["A ground booking has been paid on the website.", "", ...describe(booking)],
  );

export const sendRefundAlert = (booking: BookingRecord) =>
  sendToAcademy(
    `${booking.status === "refunded" ? "Refunded" : "ACTION NEEDED: refund failed for"} booking ${bookingReference(booking.id)}`,
    [
      booking.cancelledByAcademy
        ? "This paid booking was cancelled by the academy from the admin page, so it is refunded in full under the refund policy."
        : "A customer paid after their slot hold had expired, and someone else had booked one of the slots in the meantime.",
      booking.status === "refunded"
        ? `The full amount was refunded automatically (refund ${booking.refundId}).`
        : "The automatic refund FAILED. Please refund this payment from the Razorpay dashboard and contact the customer.",
      "",
      ...describe(booking),
    ],
  );
