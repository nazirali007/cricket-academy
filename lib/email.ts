import nodemailer from "nodemailer";
import { bookingReference, formatDate, formatRupees } from "@/lib/booking";
import type { BookingRecord } from "@/lib/db";
import { buildInvoice, buildRefundNotice } from "@/lib/invoice";
import { contact, siteUrl } from "@/lib/site";

export const isEmailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

// Sends from the academy's own mailbox. Returns false, without sending, until
// the SMTP settings are in place, so the site still works without them.
export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return false;

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
    from: `"CCS Academy" <${SMTP_USER}>`,
    replyTo: contact.email,
    ...message,
  });
  return true;
}

async function sendToAcademy(subject: string, lines: string[]) {
  await sendMail({
    to: process.env.BOOKING_EMAIL_TO || contact.email,
    subject,
    text: [...lines, "", `Manage bookings: ${siteUrl}/admin/bookings`].join("\n"),
  });
}

// Emails the customer their invoice. Returns true once it has gone.
export async function sendInvoice(booking: BookingRecord) {
  if (!booking.email) return false;
  const invoice = buildInvoice({
    reference: bookingReference(booking.id),
    issuedAt: booking.paidAt ? new Date(booking.paidAt) : new Date(),
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    organisation: booking.organisation,
    lines: booking.lines,
    total: booking.total,
    paymentId: booking.paymentId,
    receiptUrl: `${siteUrl}/booking/${booking.token}`,
  });
  return sendMail({ to: booking.email, ...invoice });
}

export async function sendCustomerRefundNotice(booking: BookingRecord) {
  if (!booking.email) return false;
  return sendMail({
    to: booking.email,
    ...buildRefundNotice({
      reference: bookingReference(booking.id),
      name: booking.name,
      total: booking.total,
      cancelledByAcademy: booking.cancelledByAcademy,
      refunded: booking.status === "refunded",
    }),
  });
}

function describe(booking: BookingRecord) {
  return [
    `Reference: ${bookingReference(booking.id)}`,
    `Customer: ${booking.name}`,
    `Mobile: +91 ${booking.phone}`,
    `Email: ${booking.email ?? "Not given"}`,
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
