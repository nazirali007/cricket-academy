import nodemailer from "nodemailer";
import { bookingReference, formatDate, formatRupees, type PricedLine } from "@/lib/booking";
import type { BookingRecord, SlotPayment } from "@/lib/db";
import { planFor, stageName } from "@/lib/installments";
import {
  buildInvoice,
  buildPartReceipt,
  buildPaymentLinkEmail,
  buildRefundNotice,
} from "@/lib/invoice";
import { contact, siteUrl } from "@/lib/site";

const slotLabel = (line: PricedLine) =>
  `${formatDate(line.date, { weekday: "short", day: "numeric", month: "short" })}, ${line.slotName} (${line.timing})`;

export const indiaTime = (at: number | string | Date) =>
  new Date(at).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const receiptUrl = (booking: BookingRecord) => `${siteUrl}/booking/${booking.token}`;

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
    paidNow: booking.deposit,
    upcoming:
      booking.deposit >= booking.total
        ? []
        : booking.lines.flatMap((line) =>
            planFor(line, Date.parse(booking.paidAt ?? booking.createdAt))
              .filter((part) => part.sendAt !== null)
              .map((part) => ({
                slot: slotLabel(line),
                part: stageName[part.stage],
                amount: part.amount,
                sendAt: indiaTime(part.sendAt!),
              })),
          ),
    paymentId: booking.paymentId,
    receiptUrl: receiptUrl(booking),
  });
  return sendMail({ to: booking.email, ...invoice });
}

// The academy's own email with a payment link. Razorpay sends the SMS.
export async function sendPaymentLinkEmail(
  booking: BookingRecord,
  line: PricedLine,
  part: SlotPayment,
  paidBefore: number,
  dueBy: number,
) {
  if (!booking.email || !part.linkUrl) return false;
  return sendMail({
    to: booking.email,
    ...buildPaymentLinkEmail({
      reference: bookingReference(booking.id),
      name: booking.name,
      slot: slotLabel(line),
      part: part.stage === "second" ? stageName.second : `${stageName.final} (balance)`,
      amount: part.amount,
      slotTotal: line.total,
      paidBefore,
      url: part.linkUrl,
      dueBy: indiaTime(dueBy),
    }),
  });
}

export async function sendPartReceipt(
  booking: BookingRecord,
  line: PricedLine,
  part: SlotPayment,
  paidBefore: number,
) {
  if (!booking.email || !part.paymentId) return false;
  return sendMail({
    to: booking.email,
    ...buildPartReceipt({
      reference: bookingReference(booking.id),
      name: booking.name,
      slot: slotLabel(line),
      part: stageName[part.stage === "cash" ? "final" : part.stage],
      amount: part.amount,
      slotTotal: line.total,
      paidBefore,
      paymentId: part.paymentId,
      receiptUrl: receiptUrl(booking),
    }),
  });
}

export const sendPartAlert = (booking: BookingRecord, line: PricedLine, part: SlotPayment, balance: number) =>
  sendToAcademy(
    `Payment received ${formatRupees(part.amount)} for ${bookingReference(booking.id)}`,
    [
      `${booking.name} (+91 ${booking.phone}) paid ${formatRupees(part.amount)} by payment link for ${slotLabel(line)}.`,
      balance > 0 ? `Balance still due for this slot: ${formatRupees(balance)}.` : "This slot is now fully paid.",
      `Razorpay payment: ${part.paymentId}`,
    ],
  );

export async function sendCustomerRefundNotice(booking: BookingRecord, amount: number) {
  if (!booking.email) return false;
  return sendMail({
    to: booking.email,
    ...buildRefundNotice({
      reference: bookingReference(booking.id),
      name: booking.name,
      total: amount,
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
    `Total: ${formatRupees(booking.total)}`,
    `Paid when booking: ${formatRupees(booking.deposit)}`,
    `Razorpay payment: ${booking.paymentId ?? "-"}`,
  ];
}

export const sendBookingAlert = (booking: BookingRecord) =>
  sendToAcademy(
    `New ground booking ${bookingReference(booking.id)}: ${booking.lines.length} slot${booking.lines.length === 1 ? "" : "s"}, ${formatRupees(booking.total)} (${formatRupees(booking.deposit)} paid)`,
    [
      booking.deposit < booking.total
        ? "A ground booking was made on the website and its booking amount (25%) is paid. Payment links for the rest go to the customer automatically before each match."
        : "A ground booking has been paid on the website.",
      "",
      ...describe(booking),
    ],
  );

export const sendRefundAlert = (
  booking: BookingRecord,
  amounts: { online: number; cash: number },
) =>
  sendToAcademy(
    `${booking.status === "refunded" ? "Refunded" : "ACTION NEEDED: refund failed for"} booking ${bookingReference(booking.id)}`,
    [
      booking.cancelledByAcademy
        ? "This paid booking was cancelled by the academy, so it is refunded in full under the refund policy."
        : "A customer paid after their slot hold had expired, and someone else had booked one of the slots in the meantime.",
      booking.status === "refunded"
        ? `Everything paid online, ${formatRupees(amounts.online)}, was refunded (Razorpay refund ${booking.refundId}).`
        : "The refund FAILED. Press Retry refund on the admin Bookings page, or refund this payment from the Razorpay dashboard and contact the customer.",
      amounts.cash > 0
        ? `${formatRupees(amounts.cash)} was collected in cash at the ground. Please return it to the customer yourself.`
        : "",
      "",
      ...describe(booking),
    ],
  );
