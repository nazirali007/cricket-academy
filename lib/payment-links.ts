import { bookingReference, formatDate, indiaNow } from "./booking";
import {
  bookingsWithSlotsSoon,
  claimSlotPayment,
  dropClaim,
  getBookingById,
  getSlotPaymentByLink,
  listSlotPayments,
  markLinkSent,
  markSlotPaymentRefunded,
  recordCashPayment,
  type BookingRecord,
  type SlotPayment,
} from "./db";
import { isEmailConfigured, sendPartAlert, sendPartReceipt, sendPaymentLinkEmail } from "./email";
import { dueNow, slotTimes, type Stage } from "./installments";
import { ledger, type SlotLedger } from "./ledger";
import { closeLink, notify, refundRemainder, settleLink } from "./payments";
import { createPaymentLink, fetchPaymentLink, findPaymentLink } from "./razorpay";
import { siteUrl } from "./site";

// A claim older than this whose link wasn't recorded is from a run that
// stopped part way. The next run finishes it.
const STALE_CLAIM_MS = 10 * 60_000;

const referenceFor = (booking: BookingRecord, part: Pick<SlotPayment, "date" | "slotId" | "stage">) =>
  `${bookingReference(booking.id)}-${part.date}-${part.slotId}-${part.stage}`;

// Runs every few minutes (see app/api/cron/payment-links). For every paid
// booking with a match in the next two days, sends the payment link that is
// due for each slot: 25% from 24 hours before, the balance from 8 hours
// before. Each slot and stage gets one link, however often this runs.
export async function sendDuePaymentLinks(now = Date.now()) {
  const { today } = indiaNow(new Date(now));
  const bookings = await bookingsWithSlotsSoon(today);
  const payments = await listSlotPayments(bookings.map((b) => b.id));
  const report = { checked: bookings.length, sent: 0, failed: 0 };

  for (const booking of bookings) {
    const bookedAt = Date.parse(booking.paidAt ?? booking.createdAt);
    for (const entry of ledger(booking, payments)) {
      const due = dueNow(entry.line, bookedAt, now);
      if (!due) continue;
      try {
        if (await sendPart(booking, entry, due, now)) report.sent++;
      } catch (error) {
        report.failed++;
        console.error(
          `Could not send the ${due.stage} payment link for ${bookingReference(booking.id)} ${entry.line.date} ${entry.line.slotId}`,
          error,
        );
      }
    }
  }
  return report;
}

async function sendPart(
  booking: BookingRecord,
  entry: SlotLedger,
  due: { stage: Stage; target: number },
  now: number,
) {
  const { line } = entry;
  const existing = entry.payments.find((p) => p.stage === due.stage);
  if (existing) {
    const stale = existing.status === "creating" && now - Date.parse(existing.createdAt) > STALE_CLAIM_MS;
    if (stale) await recoverClaim(booking, existing);
    return false;
  }

  // An earlier link that's still unpaid is closed, and its amount moves into
  // this one, so the customer only ever has one link to pay.
  let paid = entry.paid;
  for (const open of entry.payments.filter((p) => p.status === "sent")) {
    const settled = await closeLink(open);
    if (settled) paid += settled.amount;
  }
  const amount = due.target - paid;
  if (amount <= 0) return false;

  const claim = await claimSlotPayment({
    bookingId: booking.id,
    date: line.date,
    slotId: line.slotId,
    stage: due.stage,
    amount,
  });
  if (!claim) return false;

  const times = slotTimes(line.date, line.slotId)!;
  const referenceId = referenceFor(booking, claim);
  const slot = `${formatDate(line.date, { weekday: "short", day: "numeric", month: "short" })}, ${line.slotName}`;
  try {
    const link = await createPaymentLink({
      amountPaise: amount * 100,
      description: `${bookingReference(booking.id)} · ${slot} · ${due.stage === "second" ? "Second payment (25%)" : "Final payment"}`,
      referenceId,
      customer: { name: booking.name, phone: booking.phone, email: booking.email },
      // The academy's own email is nicer; Razorpay emails only as a fallback.
      sendEmail: !isEmailConfigured(),
      callbackUrl: `${siteUrl}/booking/${booking.token}`,
      expiresAt: times.end,
      notes: { booking_id: String(booking.id), slot: `${line.date} ${line.slotId}`, stage: due.stage },
    }).catch(async (error) => {
      // A link with this reference may already exist from a run that stopped.
      const found = await findPaymentLink(referenceId).catch(() => null);
      if (found && found.status === "created") return found;
      throw error;
    });
    const sent = await markLinkSent(claim.id, link.id, link.short_url);
    if (sent) {
      notify(() => sendPaymentLinkEmail(booking, line, sent, paid, times.start), booking.id);
    }
    return true;
  } catch (error) {
    await dropClaim(claim.id);
    throw error;
  }
}

async function recoverClaim(booking: BookingRecord, claim: SlotPayment) {
  const link = await findPaymentLink(referenceFor(booking, claim));
  if (link && link.status === "created") await markLinkSent(claim.id, link.id, link.short_url);
  else await dropClaim(claim.id);
}

// A payment link was paid: from Razorpay's webhook, or the customer coming
// back to their booking page. Razorpay is asked directly, so it is safe to
// call any number of times and with any link ID.
export async function recordLinkPayment(linkId: string) {
  const row = await getSlotPaymentByLink(linkId);
  if (!row || row.status === "paid" || row.status === "refunded") return;

  const paid = await settleLink(row, await fetchPaymentLink(linkId));
  if (!paid?.paymentId) return;
  const booking = await getBookingById(paid.bookingId);
  if (!booking) return;

  // The academy cancelled the booking while this link was open.
  if (booking.status !== "confirmed") {
    const refundId = await refundRemainder(paid.paymentId, `Booking ${booking.id} was cancelled`);
    await markSlotPaymentRefunded(paid.id, refundId);
    return;
  }

  const entry = ledger(booking, await listSlotPayments([booking.id])).find(
    (e) => e.line.date === paid.date && e.line.slotId === paid.slotId,
  );
  if (!entry) return;
  notify(() => sendPartReceipt(booking, entry.line, paid, entry.paid - paid.amount), booking.id);
  notify(() => sendPartAlert(booking, entry.line, paid, entry.balance), booking.id);
}

// The admin collected a slot's balance at the ground. Any open link for it is
// closed first, so the customer can't pay twice.
export async function collectCash(bookingId: number, date: string, slotId: string) {
  const booking = await getBookingById(bookingId);
  if (booking?.status !== "confirmed") return null;
  const find = async () =>
    ledger(booking, await listSlotPayments([bookingId])).find(
      (e) => e.line.date === date && e.line.slotId === slotId,
    );
  const before = await find();
  if (!before) return null;
  for (const open of before.payments.filter((p) => p.status === "sent")) await closeLink(open);
  const entry = await find();
  if (!entry || entry.balance <= 0) return null;
  return recordCashPayment(bookingId, date, slotId, entry.balance);
}
