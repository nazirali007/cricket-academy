import { formatDate, formatRupees, type PricedLine } from "./booking";
import { bookingPhone, contact, siteUrl } from "./site";

export type InvoiceInput = {
  reference: string;
  issuedAt: Date;
  name: string;
  email: string;
  phone: string;
  organisation: string | null;
  lines: PricedLine[];
  total: number;
  // Paid online when booking.
  paidNow: number;
  // The payment links still to come, in date order.
  upcoming: { slot: string; part: string; amount: number; sendAt: string }[];
  paymentId: string | null;
  receiptUrl: string | null;
  test?: boolean;
};

// Customer details are typed by the public, so they're escaped before going
// into the email's HTML.
export const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const issued = (date: Date) =>
  date.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const lineDate = (date: string) =>
  formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function addOns(line: PricedLine) {
  const parts = [];
  if (line.balls > 0) {
    parts.push(`${line.balls} match ball${line.balls === 1 ? "" : "s"} (${formatRupees(line.ballsCost)})`);
  }
  if (line.umpires) parts.push(`2 umpires (${formatRupees(line.umpiresCost)})`);
  return parts.join(", ");
}

// The booking invoice emailed to the customer as soon as payment is confirmed.
export function buildInvoice(invoice: InvoiceInput) {
  const groundTotal = invoice.lines.reduce((sum, l) => sum + l.rate, 0);
  const addOnsTotal = invoice.total - groundTotal;
  const address = contact.address.replace(/\n/g, " ");
  const balance = invoice.total - invoice.paidNow;
  const subject = `${invoice.test ? "[TEST] " : ""}Your CCS Academy booking invoice ${invoice.reference}`;
  const upcomingText = invoice.upcoming.map(
    (u) => `- ${u.slot}: ${u.part}, ${formatRupees(u.amount)}. Link sent ${u.sendAt}.`,
  );

  const text = [
    invoice.test ? "TEST BOOKING: no real payment was taken.\n" : "",
    `Hi ${invoice.name},`,
    "",
    balance > 0
      ? "Thank you for booking the ground at CCS Academy. Your booking amount is paid and your slots are booked."
      : "Thank you for booking the ground at CCS Academy. Your payment is confirmed.",
    "",
    `Invoice: ${invoice.reference}`,
    `Date: ${issued(invoice.issuedAt)}`,
    "",
    ...invoice.lines.map((l) => {
      const extras = addOns(l);
      return `- ${lineDate(l.date)}, ${l.slotName} (${l.timing}): ground ${formatRupees(l.rate)}${extras ? `, ${extras}` : ""} = ${formatRupees(l.total)}`;
    }),
    "",
    `Ground: ${formatRupees(groundTotal)}`,
    `Balls and umpires: ${formatRupees(addOnsTotal)}`,
    `Total: ${formatRupees(invoice.total)}`,
    `Paid now: ${formatRupees(invoice.paidNow)}`,
    balance > 0 ? `Balance: ${formatRupees(balance)}` : "",
    invoice.paymentId ? `Razorpay payment ID: ${invoice.paymentId}` : "",
    "No GST is charged.",
    "",
    ...(upcomingText.length
      ? [
          "Remaining payments. We send each payment link to your mobile by SMS and to this email:",
          ...upcomingText,
          "Anything unpaid at match time can be paid at the ground.",
          "",
        ]
      : []),
    invoice.receiptUrl ? `View your booking: ${invoice.receiptUrl}` : "",
    "Amounts paid are not refundable if you cancel. If the academy cancels your match, you get a 100% refund.",
    `Refund policy: ${siteUrl}/refund-policy`,
    "",
    `CCS Academy, ${address}`,
    `Phone: ${bookingPhone} · Email: ${contact.email}`,
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  const rows = invoice.lines
    .map((l) => {
      const extras = addOns(l);
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e1d8;vertical-align:top">
          <strong>${escape(lineDate(l.date))}</strong><br>
          ${escape(l.slotName)}, ${escape(l.timing)}<br>
          <span style="color:#4b5d6c;font-size:13px">Ground ${formatRupees(l.rate)}${extras ? ` · ${escape(extras)}` : ""}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e1d8;text-align:right;vertical-align:top;white-space:nowrap"><strong>${formatRupees(l.total)}</strong></td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;color:#071a2c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ec;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      ${invoice.test ? `<tr><td style="background:#fbbf24;padding:8px;text-align:center;font-size:12px;font-weight:bold">TEST BOOKING: NO REAL PAYMENT WAS TAKEN</td></tr>` : ""}
      <tr><td style="background:#071a2c;padding:24px 28px;color:#ffffff">
        <table role="presentation" width="100%"><tr>
          <td><img src="${siteUrl}/logo.png" width="56" height="61" alt="CCS Academy" style="display:block"></td>
          <td style="text-align:right">
            <div style="font-size:22px;font-weight:bold">INVOICE</div>
            <div style="font-size:13px;color:#d7e2ea">${escape(invoice.reference)}</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px">
        <p style="margin:0 0 16px">Hi ${escape(invoice.name)},</p>
        <p style="margin:0 0 24px">Thank you for booking the ground at CCS Academy. ${balance > 0 ? "Your booking amount is paid and your slots are booked." : "Your payment is confirmed and your slots are booked."}</p>

        <table role="presentation" width="100%" style="font-size:14px;margin-bottom:24px"><tr>
          <td style="vertical-align:top;width:50%">
            <div style="color:#4b5d6c;font-size:12px;text-transform:uppercase;letter-spacing:1px">Billed to</div>
            <strong>${escape(invoice.name)}</strong><br>
            ${invoice.organisation ? `${escape(invoice.organisation)}<br>` : ""}
            +91 ${escape(invoice.phone)}<br>
            ${escape(invoice.email)}
          </td>
          <td style="vertical-align:top;text-align:right">
            <div style="color:#4b5d6c;font-size:12px;text-transform:uppercase;letter-spacing:1px">Issued</div>
            ${escape(issued(invoice.issuedAt))}
            ${invoice.paymentId ? `<br><span style="color:#4b5d6c;font-size:12px">Payment ${escape(invoice.paymentId)}</span>` : ""}
          </td>
        </tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
          <tr><th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #071a2c;font-size:12px;text-transform:uppercase">Slot</th>
              <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #071a2c;font-size:12px;text-transform:uppercase">Amount</th></tr>
          ${rows}
          <tr><td style="padding-top:14px">Ground (${invoice.lines.length} slot${invoice.lines.length === 1 ? "" : "s"})</td><td style="padding-top:14px;text-align:right">${formatRupees(groundTotal)}</td></tr>
          <tr><td>Balls and umpires</td><td style="text-align:right">${formatRupees(addOnsTotal)}</td></tr>
          <tr><td style="padding-top:10px">Total</td><td style="padding-top:10px;text-align:right">${formatRupees(invoice.total)}</td></tr>
          <tr><td style="padding-top:6px;font-size:18px"><strong>Paid now</strong></td><td style="padding-top:6px;text-align:right;font-size:22px"><strong>${formatRupees(invoice.paidNow)}</strong></td></tr>
          ${balance > 0 ? `<tr><td>Balance</td><td style="text-align:right"><strong>${formatRupees(balance)}</strong></td></tr>` : ""}
          <tr><td colspan="2" style="padding-top:6px;color:#4b5d6c;font-size:12px">No GST is charged.</td></tr>
        </table>

        ${invoice.upcoming.length ? `
        <div style="margin-top:24px;padding:16px;border:1px solid #e5e1d8">
          <div style="font-weight:bold;margin-bottom:6px">Remaining payments</div>
          <div style="color:#4b5d6c;font-size:13px;margin-bottom:10px">We send each payment link to your mobile by SMS and to this email. Anything unpaid at match time can be paid at the ground.</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
            ${invoice.upcoming.map((u) => `<tr>
              <td style="padding:6px 0;border-top:1px solid #f0ece3"><strong>${escape(u.slot)}</strong><br><span style="color:#4b5d6c">${escape(u.part)} · link sent ${escape(u.sendAt)}</span></td>
              <td style="padding:6px 0;border-top:1px solid #f0ece3;text-align:right;white-space:nowrap"><strong>${formatRupees(u.amount)}</strong></td>
            </tr>`).join("")}
          </table>
        </div>` : ""}

        ${invoice.receiptUrl ? `<p style="margin:28px 0 0"><a href="${invoice.receiptUrl}" style="display:inline-block;background:#c9281f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px">View your booking</a></p>` : ""}

        <p style="margin:28px 0 0;padding:12px;background:#d7e2ea;font-size:13px">
          <strong>No refunds after booking.</strong> If you cancel, amounts already paid aren't refunded. If the academy cancels your match, you get a 100% refund.
          <a href="${siteUrl}/refund-policy" style="color:#071a2c">Refund policy</a>
        </p>
      </td></tr>
      <tr><td style="background:#071a2c;padding:20px 28px;color:#d7e2ea;font-size:12px;line-height:1.6">
        <strong style="color:#ffffff">CCS Academy</strong><br>
        ${escape(address)}<br>
        ${escape(bookingPhone)} · <a href="mailto:${contact.email}" style="color:#d7e2ea">${contact.email}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject, text, html };
}

// Sent to the customer when their booking is refunded.
export function buildRefundNotice(input: {
  reference: string;
  name: string;
  // What was paid online and is being returned.
  total: number;
  cancelledByAcademy: boolean;
  refunded: boolean;
}) {
  const reason = input.cancelledByAcademy
    ? "The academy has cancelled your booking."
    : "Your payment reached us after your slot hold had ended, and someone else had booked one of your slots in the meantime.";
  const outcome = input.refunded
    ? `Everything you paid online, ${formatRupees(input.total)}, has been refunded. It should reach your account in 5–7 working days.`
    : `We're refunding everything you paid online, ${formatRupees(input.total)}. Our team will contact you if we need anything.`;
  const text = [
    `Hi ${input.name},`,
    "",
    reason,
    outcome,
    "",
    `Booking reference: ${input.reference}`,
    "",
    `Questions? Call ${bookingPhone} or email ${contact.email}.`,
    "CCS Academy",
  ].join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,Helvetica,sans-serif;color:#071a2c;line-height:1.6">
    <p>Hi ${escape(input.name)},</p><p>${escape(reason)}</p><p><strong>${escape(outcome)}</strong></p>
    <p>Booking reference: ${escape(input.reference)}</p>
    <p>Questions? Call ${escape(bookingPhone)} or email <a href="mailto:${contact.email}">${contact.email}</a>.</p>
    <p>CCS Academy</p></body></html>`;
  return {
    subject: `Refund for your CCS Academy booking ${input.reference}`,
    text,
    html,
  };
}

const button = (url: string, label: string) =>
  `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#c9281f;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px">${escape(label)}</a></p>`;

const shell = (title: string, body: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;color:#071a2c;line-height:1.55">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ec;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr><td style="background:#071a2c;padding:20px 28px"><img src="${siteUrl}/logo.png" width="48" height="52" alt="CCS Academy" style="display:block"></td></tr>
      <tr><td style="padding:28px">${body}</td></tr>
      <tr><td style="background:#071a2c;padding:18px 28px;color:#d7e2ea;font-size:12px">CCS Academy · ${escape(bookingPhone)} · <a href="mailto:${contact.email}" style="color:#d7e2ea">${contact.email}</a></td></tr>
    </table>
  </td></tr></table>
</body></html>`;

type SlotMessage = {
  reference: string;
  name: string;
  slot: string;
  part: string;
  amount: number;
  slotTotal: number;
  paidBefore: number;
};

// Sent with each payment link (24 hours and 8 hours before a match).
export function buildPaymentLinkEmail(input: SlotMessage & { url: string; dueBy: string }) {
  const subject = `Payment due for your match: ${input.slot} (${input.reference})`;
  const lines = [
    `Hi ${input.name},`,
    "",
    `Your match is coming up: ${input.slot}.`,
    `${input.part}: ${formatRupees(input.amount)}.`,
    `Slot price ${formatRupees(input.slotTotal)}, paid so far ${formatRupees(input.paidBefore)}.`,
    "",
    `Pay securely here: ${input.url}`,
    `Please pay before ${input.dueBy}. You can also pay at the ground.`,
    "",
    `Booking ${input.reference} · Questions? Call ${bookingPhone}.`,
    "CCS Academy",
  ];
  const html = shell(subject, `
    <p style="margin:0 0 12px">Hi ${escape(input.name)},</p>
    <p style="margin:0 0 16px">Your match is coming up: <strong>${escape(input.slot)}</strong>.</p>
    <table role="presentation" width="100%" style="font-size:14px;border-top:1px solid #e5e1d8;border-bottom:1px solid #e5e1d8;padding:8px 0">
      <tr><td>Slot price</td><td style="text-align:right">${formatRupees(input.slotTotal)}</td></tr>
      <tr><td>Paid so far</td><td style="text-align:right">${formatRupees(input.paidBefore)}</td></tr>
      <tr><td style="padding-top:6px;font-size:17px"><strong>${escape(input.part)}</strong></td><td style="padding-top:6px;text-align:right;font-size:20px"><strong>${formatRupees(input.amount)}</strong></td></tr>
    </table>
    ${button(input.url, `Pay ${formatRupees(input.amount)}`)}
    <p style="margin:0;color:#4b5d6c;font-size:13px">Please pay before ${escape(input.dueBy)}. You can also pay at the ground. Booking ${escape(input.reference)}.</p>`);
  return { subject, text: lines.join("\n"), html };
}

// Sent when a payment link is paid.
export function buildPartReceipt(input: SlotMessage & { paymentId: string; receiptUrl: string }) {
  const balance = Math.max(0, input.slotTotal - input.paidBefore - input.amount);
  const subject = `Payment received: ${formatRupees(input.amount)} for ${input.slot} (${input.reference})`;
  const lines = [
    `Hi ${input.name},`,
    "",
    `We've received ${formatRupees(input.amount)} for ${input.slot}. Thank you.`,
    balance > 0
      ? `Balance for this slot: ${formatRupees(balance)}. We'll send the link for it before the match.`
      : "This slot is now fully paid.",
    `Razorpay payment ID: ${input.paymentId}`,
    "",
    `Your booking: ${input.receiptUrl}`,
    "CCS Academy",
  ];
  const html = shell(subject, `
    <p style="margin:0 0 12px">Hi ${escape(input.name)},</p>
    <p style="margin:0 0 16px">We've received <strong>${formatRupees(input.amount)}</strong> for <strong>${escape(input.slot)}</strong>. Thank you.</p>
    <p style="margin:0 0 16px">${balance > 0 ? `Balance for this slot: <strong>${formatRupees(balance)}</strong>. We'll send the link for it before the match.` : "<strong>This slot is now fully paid.</strong>"}</p>
    <p style="margin:0;color:#4b5d6c;font-size:13px">Razorpay payment ${escape(input.paymentId)} · Booking ${escape(input.reference)}</p>
    ${button(input.receiptUrl, "View your booking")}`);
  return { subject, text: lines.join("\n"), html };
}
