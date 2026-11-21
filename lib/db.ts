import { Pool, type PoolClient } from "pg";
import { HOLD_MINUTES, type PricedLine } from "./booking";

// A booking is "pending" while the customer pays, then "confirmed". Holds that
// time out become "expired", and ones the customer abandons become
// "cancelled". If money arrives for slots someone else has since taken, the
// booking moves through "refund_pending" and "refunding" to "refunded" or
// "refund_failed". "cancelled_by_admin" is set from the admin page. A paid
// booking the academy cancels is refunded the same way, with
// cancelled_by_academy set.
//
// slot_locks has one row per held or booked slot. Its primary key is what
// makes double booking impossible, even when two people pay at once.
const schema = `
  CREATE TABLE IF NOT EXISTS ground_bookings (
    id SERIAL PRIMARY KEY,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    status TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    organisation TEXT,
    lines JSONB NOT NULL,
    total_rupees INTEGER NOT NULL,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    refund_id TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS ground_bookings_phone
    ON ground_bookings (phone, created_at);
  CREATE TABLE IF NOT EXISTS slot_locks (
    match_date DATE NOT NULL,
    slot_id TEXT NOT NULL,
    booking_id INTEGER NOT NULL REFERENCES ground_bookings (id),
    PRIMARY KEY (match_date, slot_id)
  );
  CREATE INDEX IF NOT EXISTS slot_locks_booking ON slot_locks (booking_id);
  ALTER TABLE ground_bookings
    ADD COLUMN IF NOT EXISTS cancelled_by_academy BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS customer_email TEXT,
    ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS refund_attempted_at TIMESTAMPTZ,
    -- Paid online when booking (25% of each slot). Empty for bookings made
    -- before payment was split, which were paid in full.
    ADD COLUMN IF NOT EXISTS deposit_rupees INTEGER;

  -- The later payments for each booked slot: the 25% sent 24 hours before
  -- (stage "second"), the rest sent 8 hours before ("final"), and balances
  -- the admin collected at the ground ("cash"). The unique key means a link
  -- is only ever sent once per slot and stage.
  -- status: creating, sent, paid, cancelled or refunded.
  CREATE TABLE IF NOT EXISTS slot_payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES ground_bookings (id),
    match_date DATE NOT NULL,
    slot_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    amount_rupees INTEGER NOT NULL,
    status TEXT NOT NULL,
    link_id TEXT UNIQUE,
    link_url TEXT,
    payment_id TEXT,
    refund_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    UNIQUE (booking_id, match_date, slot_id, stage)
  );
  CREATE INDEX IF NOT EXISTS ground_bookings_payment
    ON ground_bookings (razorpay_payment_id);

  -- Admission requests from the Join form. "status" tracks follow-up:
  -- new, contacted, joined (now a student) or not_interested.
  CREATE TABLE IF NOT EXISTS admissions (
    id SERIAL PRIMARY KEY,
    player_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    phone TEXT NOT NULL,
    program TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS admissions_created ON admissions (created_at);
  CREATE INDEX IF NOT EXISTS admissions_phone ON admissions (phone, created_at);

  -- Supabase publishes every table through its public Data API. Row level
  -- security with no policies shuts that door, so customer details can only
  -- be read through this site's server, which owns the tables.
  ALTER TABLE ground_bookings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE slot_locks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE slot_payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;

  -- Failed admin sign-ins, used to lock out password guessing.
  CREATE TABLE IF NOT EXISTS admin_login_failures (
    ip TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS admin_login_failures_ip
    ON admin_login_failures (ip, failed_at);
  ALTER TABLE admin_login_failures ENABLE ROW LEVEL SECURITY;
`;

let pool: Pool | undefined;
let ready: Promise<unknown> | undefined;

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

// Supabase signs its database certificates with its own authority, which
// Node doesn't know, so a plain "sslmode=require" link would be refused. With
// DATABASE_CA_CERT (the certificate from Supabase > Database > SSL) the server
// is fully verified; without it the link is still encrypted.
function poolConfig(url: string) {
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { connectionString: url };
  }
  const supabase = /\.supabase\.(co|com)$/.test(parsed.hostname);
  if (!supabase && !ca) return { connectionString: url };
  for (const key of ["sslmode", "sslrootcert", "uselibpqcompat"]) {
    parsed.searchParams.delete(key);
  }
  return {
    connectionString: parsed.toString(),
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  };
}

export async function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!pool) {
    pool = new Pool({
      ...poolConfig(process.env.DATABASE_URL),
      max: 5,
      // Serverless hosts freeze between requests; drop idle links early so a
      // stale one is never handed out.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (error) => console.error("Database connection dropped", error));
  }
  // Creates the tables the first time the site connects.
  ready ??= pool.query(schema).catch((error) => {
    ready = undefined;
    throw error;
  });
  await ready;
  return pool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await (await database()).connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const isUniqueViolation = (error: unknown) =>
  (error as { code?: string })?.code === "23505";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Frees slots whose payment window has run out.
const expireStaleHolds = (client: PoolClient) =>
  client.query(`
    WITH stale AS (
      UPDATE ground_bookings SET status = 'expired'
      WHERE status = 'pending' AND expires_at < NOW()
      RETURNING id
    )
    DELETE FROM slot_locks WHERE booking_id IN (SELECT id FROM stale)`);

const lockSlots = (client: PoolClient, bookingId: number, lines: PricedLine[]) =>
  client.query(
    `INSERT INTO slot_locks (match_date, slot_id, booking_id)
     SELECT d::date, s, $3 FROM unnest($1::text[], $2::text[]) AS t (d, s)`,
    [lines.map((l) => l.date), lines.map((l) => l.slotId), bookingId],
  );

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "expired"
  | "cancelled"
  | "cancelled_by_admin"
  | "refund_pending"
  | "refunding"
  | "refunded"
  | "refund_failed";

export type BookingRecord = {
  id: number;
  token: string;
  status: BookingStatus;
  name: string;
  phone: string;
  organisation: string | null;
  email: string | null;
  lines: PricedLine[];
  total: number;
  // Paid online when booking. Equals the total for older, fully paid bookings.
  deposit: number;
  orderId: string | null;
  paymentId: string | null;
  refundId: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  // True when the academy cancelled a paid booking, which is refunded in full.
  cancelledByAcademy: boolean;
  invoiceSentAt: string | null;
};

const columns = `id, token, status, customer_name AS name, phone, organisation,
  lines, total_rupees AS total,
  COALESCE(deposit_rupees, total_rupees) AS deposit, razorpay_order_id AS "orderId",
  razorpay_payment_id AS "paymentId", refund_id AS "refundId",
  expires_at AS "expiresAt", paid_at AS "paidAt", created_at AS "createdAt",
  cancelled_by_academy AS "cancelledByAcademy", customer_email AS email,
  invoice_sent_at AS "invoiceSentAt"`;

// Only dates and slots, so no customer details ever reach the public page.
// "held" slots belong to someone who is paying right now: they can't be
// chosen, but only become booked once the payment is confirmed.
export async function getTakenSlots(from: string, to: string) {
  const db = await database();
  const { rows } = await db.query<{ date: string; slotId: string; held: boolean }>(
    `SELECT to_char(l.match_date, 'YYYY-MM-DD') AS date, l.slot_id AS "slotId",
            b.status = 'pending' AS held
     FROM slot_locks l JOIN ground_bookings b ON b.id = l.booking_id
     WHERE l.match_date BETWEEN $1::date AND $2::date
       AND (b.status <> 'pending' OR b.expires_at > NOW())`,
    [from, to],
  );
  return rows;
}

export async function countRecentHolds(phone: string) {
  const db = await database();
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM ground_bookings
     WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [phone],
  );
  return Number(rows[0].count);
}

// Reserves every slot or none of them. Returns the taken slot keys on a clash.
export async function createHold(input: {
  lines: PricedLine[];
  name: string;
  phone: string;
  email: string;
  organisation: string | null;
  total: number;
  deposit: number;
}): Promise<
  | { ok: true; booking: BookingRecord }
  | { ok: false; taken: string[] }
> {
  try {
    const booking = await transaction(async (client) => {
      await expireStaleHolds(client);
      const { rows } = await client.query<BookingRecord>(
        `INSERT INTO ground_bookings
           (status, customer_name, phone, organisation, lines, total_rupees,
            expires_at, customer_email, deposit_rupees)
         VALUES ('pending', $1, $2, $3, $4, $5, NOW() + make_interval(mins => $6), $7, $8)
         RETURNING ${columns}`,
        [
          input.name,
          input.phone,
          input.organisation,
          JSON.stringify(input.lines),
          input.total,
          HOLD_MINUTES,
          input.email,
          input.deposit,
        ],
      );
      await lockSlots(client, rows[0].id, input.lines);
      return rows[0];
    });
    return { ok: true, booking };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const dates = input.lines.map((l) => l.date).sort();
    const wanted = new Set(input.lines.map((l) => `${l.date}|${l.slotId}`));
    const taken = (await getTakenSlots(dates[0], dates[dates.length - 1]))
      .map((t) => `${t.date}|${t.slotId}`)
      .filter((key) => wanted.has(key));
    return { ok: false, taken };
  }
}

export async function setOrderId(bookingId: number, orderId: string) {
  const db = await database();
  await db.query(
    "UPDATE ground_bookings SET razorpay_order_id = $2 WHERE id = $1",
    [bookingId, orderId],
  );
}

export async function getBookingByToken(token: string) {
  if (!UUID.test(token)) return null;
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `SELECT ${columns} FROM ground_bookings WHERE token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function getBookingByPaymentId(paymentId: string) {
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `SELECT ${columns} FROM ground_bookings WHERE razorpay_payment_id = $1`,
    [paymentId],
  );
  return rows[0] ?? null;
}

export async function getBookingByOrderId(orderId: string) {
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `SELECT ${columns} FROM ground_bookings WHERE razorpay_order_id = $1`,
    [orderId],
  );
  return rows[0] ?? null;
}

// The customer closed the payment window, so their slots go back on sale.
export async function releaseHold(token: string) {
  if (!UUID.test(token)) return;
  await transaction(async (client) => {
    const { rows } = await client.query<{ id: number }>(
      `UPDATE ground_bookings SET status = 'cancelled'
       WHERE token = $1 AND status = 'pending' RETURNING id`,
      [token],
    );
    if (rows[0]) {
      await client.query("DELETE FROM slot_locks WHERE booking_id = $1", [
        rows[0].id,
      ]);
    }
  });
}

// Records a verified payment. Safe to call more than once for the same order,
// which happens when both the browser and Razorpay's webhook report it.
export async function finalizePayment(orderId: string, paymentId: string) {
  return transaction(async (client) => {
    const { rows } = await client.query<BookingRecord>(
      `SELECT ${columns} FROM ground_bookings
       WHERE razorpay_order_id = $1 FOR UPDATE`,
      [orderId],
    );
    const booking = rows[0];
    if (!booking) return { outcome: "unknown" as const };

    // The admin cancelled this hold while the customer was still paying. The
    // slots are gone, so the money must go back in full.
    if (booking.status === "cancelled_by_admin" && !booking.paymentId) {
      const { rows: updated } = await client.query<BookingRecord>(
        `UPDATE ground_bookings
         SET status = 'refund_pending', cancelled_by_academy = TRUE,
             razorpay_payment_id = $2, paid_at = NOW()
         WHERE id = $1 RETURNING ${columns}`,
        [booking.id, paymentId],
      );
      return { outcome: "updated" as const, booking: updated[0] };
    }
    if (booking.status !== "pending" && booking.status !== "expired" && booking.status !== "cancelled") {
      return { outcome: "already" as const, booking };
    }

    await expireStaleHolds(client);
    const { rows: held } = await client.query(
      "SELECT 1 FROM slot_locks WHERE booking_id = $1 LIMIT 1",
      [booking.id],
    );

    let haveSlots = held.length > 0;
    if (!haveSlots) {
      // The hold ran out before the money arrived. Take the slots back if
      // nobody else has them yet.
      await client.query("SAVEPOINT relock");
      try {
        await lockSlots(client, booking.id, booking.lines);
        haveSlots = true;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        await client.query("ROLLBACK TO SAVEPOINT relock");
      }
    }

    const status = haveSlots ? "confirmed" : "refund_pending";
    const { rows: updated } = await client.query<BookingRecord>(
      `UPDATE ground_bookings
       SET status = $2, razorpay_payment_id = $3, paid_at = NOW()
       WHERE id = $1 RETURNING ${columns}`,
      [booking.id, status, paymentId],
    );
    return { outcome: "updated" as const, booking: updated[0] };
  });
}

// Lets exactly one caller issue a refund, even if two arrive together.
export async function claimRefund(bookingId: number) {
  const db = await database();
  const { rowCount } = await db.query(
    `UPDATE ground_bookings SET status = 'refunding', refund_attempted_at = NOW()
     WHERE id = $1 AND status = 'refund_pending'`,
    [bookingId],
  );
  return rowCount === 1;
}

export async function recordRefund(
  bookingId: number,
  status: "refunded" | "refund_failed",
  refundId: string | null,
) {
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `UPDATE ground_bookings SET status = $2, refund_id = $3
     WHERE id = $1 RETURNING ${columns}`,
    [bookingId, status, refundId],
  );
  return rows[0];
}

// Lets the admin try a failed refund again. A refund still "refunding" can
// only be retried after a few minutes, in case the first try is still running.
export async function reopenRefund(bookingId: number) {
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `UPDATE ground_bookings SET status = 'refund_pending'
     WHERE id = $1 AND razorpay_payment_id IS NOT NULL
       AND (status = 'refund_failed'
            OR (status = 'refunding'
                AND (refund_attempted_at IS NULL
                     OR refund_attempted_at < NOW() - INTERVAL '3 minutes')))
     RETURNING ${columns}`,
    [bookingId],
  );
  return rows[0] ?? null;
}

// Razorpay reports that a booking's payment was refunded in full, for example
// from the Razorpay dashboard. The booking is closed and its slots go back on
// sale, so the site never shows a booking as paid after its money went back.
export async function markRefundedOutsideSite(bookingId: number, refundId: string) {
  return transaction(async (client) => {
    const { rows } = await client.query<BookingRecord>(
      `UPDATE ground_bookings
       SET status = 'refunded', refund_id = COALESCE(refund_id, $2),
           cancelled_by_academy = cancelled_by_academy OR status = 'confirmed'
       WHERE id = $1
         AND status IN ('confirmed', 'refund_pending', 'refunding', 'refund_failed')
       RETURNING ${columns}`,
      [bookingId, refundId],
    );
    if (rows[0]) {
      await client.query("DELETE FROM slot_locks WHERE booking_id = $1", [bookingId]);
    }
    return rows[0] ?? null;
  });
}

// Frees the booking's slots. A paid booking is marked for a full refund,
// because the refund policy promises one when the academy cancels.
export async function cancelBookingAsAdmin(bookingId: number) {
  return transaction(async (client) => {
    const { rows } = await client.query<BookingRecord>(
      `UPDATE ground_bookings
       SET status = CASE WHEN status = 'confirmed' THEN 'refund_pending' ELSE 'cancelled_by_admin' END,
           cancelled_by_academy = (status = 'confirmed')
       WHERE id = $1 AND status IN ('pending', 'confirmed')
       RETURNING ${columns}`,
      [bookingId],
    );
    if (rows[0]) {
      await client.query("DELETE FROM slot_locks WHERE booking_id = $1", [
        bookingId,
      ]);
    }
    return rows[0] ?? null;
  });
}

export async function markInvoiceSent(bookingId: number) {
  const db = await database();
  await db.query("UPDATE ground_bookings SET invoice_sent_at = NOW() WHERE id = $1", [
    bookingId,
  ]);
}

export async function getBookingById(bookingId: number) {
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `SELECT ${columns} FROM ground_bookings WHERE id = $1`,
    [bookingId],
  );
  return rows[0] ?? null;
}

// ── Later payments: payment links and cash ───────────────────────────────

export type SlotPaymentStage = "second" | "final" | "cash";
export type SlotPayment = {
  id: number;
  bookingId: number;
  date: string;
  slotId: string;
  stage: SlotPaymentStage;
  amount: number;
  status: "creating" | "sent" | "paid" | "cancelled" | "refunded";
  linkId: string | null;
  linkUrl: string | null;
  paymentId: string | null;
  refundId: string | null;
  createdAt: string;
  paidAt: string | null;
};

const paymentColumns = `id, booking_id AS "bookingId",
  to_char(match_date, 'YYYY-MM-DD') AS date, slot_id AS "slotId", stage,
  amount_rupees AS amount, status, link_id AS "linkId", link_url AS "linkUrl",
  payment_id AS "paymentId", refund_id AS "refundId", created_at AS "createdAt",
  paid_at AS "paidAt"`;

async function onePayment(sql: string, values: unknown[]) {
  const db = await database();
  const { rows } = await db.query<SlotPayment>(sql, values);
  return rows[0] ?? null;
}

export async function listSlotPayments(bookingIds: number[]) {
  if (bookingIds.length === 0) return [];
  const db = await database();
  const { rows } = await db.query<SlotPayment>(
    `SELECT ${paymentColumns} FROM slot_payments
     WHERE booking_id = ANY($1::int[]) ORDER BY id`,
    [bookingIds],
  );
  return rows;
}

// Paid bookings with a slot from today to two days ahead: the only ones that
// can have a payment link due.
export async function bookingsWithSlotsSoon(today: string) {
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `SELECT ${columns} FROM ground_bookings
     WHERE status = 'confirmed' AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(lines) AS l
       WHERE (l->>'date')::date BETWEEN $1::date AND $1::date + 2)`,
    [today],
  );
  return rows;
}

// Reserves a payment stage for one slot. Only one caller ever gets it, so a
// link is never sent twice even if two runs overlap.
export const claimSlotPayment = (input: {
  bookingId: number;
  date: string;
  slotId: string;
  stage: SlotPaymentStage;
  amount: number;
}) =>
  onePayment(
    `INSERT INTO slot_payments (booking_id, match_date, slot_id, stage, amount_rupees, status)
     VALUES ($1, $2::date, $3, $4, $5, 'creating')
     ON CONFLICT (booking_id, match_date, slot_id, stage) DO NOTHING
     RETURNING ${paymentColumns}`,
    [input.bookingId, input.date, input.slotId, input.stage, input.amount],
  );

export const markLinkSent = (id: number, linkId: string, linkUrl: string) =>
  onePayment(
    `UPDATE slot_payments SET status = 'sent', link_id = $2, link_url = $3
     WHERE id = $1 AND status = 'creating' RETURNING ${paymentColumns}`,
    [id, linkId, linkUrl],
  );

// Gives up a claim whose link couldn't be created, so the next run tries again.
export async function dropClaim(id: number) {
  const db = await database();
  await db.query("DELETE FROM slot_payments WHERE id = $1 AND status = 'creating'", [id]);
}

export const getSlotPaymentByLink = (linkId: string) =>
  onePayment(`SELECT ${paymentColumns} FROM slot_payments WHERE link_id = $1`, [linkId]);

// Safe to call more than once: only the first call changes anything.
export const markSlotPaymentPaid = (id: number, paymentId: string) =>
  onePayment(
    `UPDATE slot_payments SET status = 'paid', payment_id = $2, paid_at = NOW()
     WHERE id = $1 AND status IN ('creating', 'sent', 'cancelled')
     RETURNING ${paymentColumns}`,
    [id, paymentId],
  );

export const markSlotPaymentCancelled = (id: number) =>
  onePayment(
    `UPDATE slot_payments SET status = 'cancelled'
     WHERE id = $1 AND status = 'sent' RETURNING ${paymentColumns}`,
    [id],
  );

export const markSlotPaymentRefunded = (id: number, refundId: string) =>
  onePayment(
    `UPDATE slot_payments SET status = 'refunded', refund_id = $2
     WHERE id = $1 AND status = 'paid' RETURNING ${paymentColumns}`,
    [id, refundId],
  );

// The admin collected a slot's balance at the ground.
export const recordCashPayment = (bookingId: number, date: string, slotId: string, amount: number) =>
  onePayment(
    `INSERT INTO slot_payments
       (booking_id, match_date, slot_id, stage, amount_rupees, status, paid_at)
     VALUES ($1, $2::date, $3, 'cash', $4, 'paid', NOW())
     ON CONFLICT (booking_id, match_date, slot_id, stage) DO UPDATE
       SET amount_rupees = slot_payments.amount_rupees + EXCLUDED.amount_rupees,
           paid_at = NOW()
     RETURNING ${paymentColumns}`,
    [bookingId, date, slotId, amount],
  );

// ── Admin: search and totals ─────────────────────────────────────────────

// Which bookings the admin list shows. "active" is the default view: paid
// bookings, refunds and customers paying right now.
export const bookingViews = {
  active: "Paid & in progress",
  paid: "Paid",
  refunds: "Refunds",
  cancelled: "Cancelled by academy",
  abandoned: "Abandoned checkouts",
  all: "Everything",
} as const;
export type BookingView = keyof typeof bookingViews;

const viewCondition: Record<BookingView, string> = {
  active: `(status IN ('confirmed', 'refund_pending', 'refunding', 'refunded', 'refund_failed')
            OR (status = 'pending' AND expires_at > NOW()))`,
  paid: "status = 'confirmed'",
  refunds: "status IN ('refund_pending', 'refunding', 'refunded', 'refund_failed')",
  cancelled: "(status = 'cancelled_by_admin' OR cancelled_by_academy)",
  abandoned:
    "(status IN ('expired', 'cancelled') OR (status = 'pending' AND expires_at <= NOW()))",
  all: "TRUE",
};

export type DateRange = { from: string; to: string };

export type BookingSearch = {
  view: BookingView;
  // Inclusive YYYY-MM-DD range, on the match date or the day it was booked.
  range: (DateRange & { on: "match" | "booked" }) | null;
  query: string;
};

// The calendar day a timestamp falls on in India, where the academy is.
export const indiaDay = (column: string) =>
  `(${column} AT TIME ZONE 'Asia/Kolkata')::date`;

// Escapes a search term for ILIKE.
export const likePattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, "\\$&")}%`;

export async function searchBookings(search: BookingSearch, limit = 500) {
  const db = await database();
  const where = [viewCondition[search.view]];
  const values: unknown[] = [];
  const param = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (search.range) {
    const from = param(search.range.from);
    const to = param(search.range.to);
    where.push(
      search.range.on === "match"
        ? `EXISTS (SELECT 1 FROM jsonb_array_elements(lines) AS l
                   WHERE (l->>'date')::date BETWEEN ${from}::date AND ${to}::date)`
        : `${indiaDay("created_at")} BETWEEN ${from}::date AND ${to}::date`,
    );
  }

  const query = search.query.trim();
  if (query) {
    const like = param(likePattern(query));
    const conditions = [
      `customer_name ILIKE ${like}`,
      `customer_email ILIKE ${like}`,
      `organisation ILIKE ${like}`,
      `razorpay_payment_id ILIKE ${like}`,
    ];
    const digits = query.replace(/\D/g, "");
    if (digits.length >= 4) {
      conditions.push(`phone LIKE ${param(`%${digits.slice(-10)}%`)}`);
    }
    // A booking reference such as CCS-00042.
    const reference = /^(?:ccs-?)?0*(\d{1,9})$/i.exec(query);
    if (reference) conditions.push(`id = ${param(Number(reference[1]))}`);
    where.push(`(${conditions.join(" OR ")})`);
  }

  const { rows } = await db.query<BookingRecord>(
    `SELECT ${columns} FROM ground_bookings
     WHERE ${where.join(" AND ")}
     ORDER BY created_at DESC LIMIT ${param(limit)}`,
    values,
  );
  return rows;
}

export type BookingStats = {
  paidBookings: number;
  balanceDue: number;
  matchesToday: number;
  bookedToday: number;
  collectedToday: number;
  collectedThisMonth: number;
  collectedAllTime: number;
  refundsNeedingAction: number;
};

// Money counts what was actually received (online and in cash) for bookings
// that are still on, so refunded bookings drop out. `today` is the India
// date, YYYY-MM-DD.
export async function getBookingStats(today: string): Promise<BookingStats> {
  const db = await database();
  const { rows } = await db.query(
    `WITH money AS (
       SELECT COALESCE(deposit_rupees, total_rupees) AS amount, paid_at
       FROM ground_bookings WHERE status = 'confirmed'
       UNION ALL
       SELECT p.amount_rupees, p.paid_at
       FROM slot_payments p JOIN ground_bookings b ON b.id = p.booking_id
       WHERE b.status = 'confirmed' AND p.status = 'paid'
     ), days AS (
       SELECT amount, ${indiaDay("paid_at")} AS day FROM money
     )
     SELECT
       COUNT(*) FILTER (WHERE status = 'confirmed') AS "paidBookings",
       COUNT(*) FILTER (WHERE status = 'confirmed' AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(lines) AS l
         WHERE (l->>'date')::date = $1::date
       )) AS "matchesToday",
       COUNT(*) FILTER (WHERE status = 'confirmed'
         AND ${indiaDay("created_at")} = $1::date) AS "bookedToday",
       (SELECT COALESCE(SUM(amount), 0) FROM days WHERE day = $1::date) AS "collectedToday",
       (SELECT COALESCE(SUM(amount), 0) FROM days
         WHERE date_trunc('month', day) = date_trunc('month', $1::date)) AS "collectedThisMonth",
       (SELECT COALESCE(SUM(amount), 0) FROM days) AS "collectedAllTime",
       COALESCE(SUM(total_rupees) FILTER (WHERE status = 'confirmed'), 0)
         - (SELECT COALESCE(SUM(amount), 0) FROM days) AS "balanceDue",
       COUNT(*) FILTER (WHERE status IN ('refund_pending', 'refund_failed'))
         AS "refundsNeedingAction"
     FROM ground_bookings`,
    [today],
  );
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
  ) as BookingStats;
}

// ── Admin sign-in lockout ───────────────────────────────────────────────

// Minutes left before this address may try again, or 0 if it may try now.
export async function loginLockMinutes(ip: string, maxFailures: number, windowMinutes: number) {
  const db = await database();
  const { rows } = await db.query<{ count: string; oldest: Date | null }>(
    `SELECT COUNT(*) AS count, MIN(failed_at) AS oldest FROM admin_login_failures
     WHERE ip = $1 AND failed_at > NOW() - make_interval(mins => $2)`,
    [ip, windowMinutes],
  );
  const { count, oldest } = rows[0];
  if (Number(count) < maxFailures || !oldest) return 0;
  const unlocksAt = new Date(oldest).getTime() + windowMinutes * 60_000;
  return Math.max(1, Math.ceil((unlocksAt - Date.now()) / 60_000));
}

export async function recordLoginFailure(ip: string) {
  const db = await database();
  await db.query("INSERT INTO admin_login_failures (ip) VALUES ($1)", [ip]);
  // Keeps the table small.
  await db.query("DELETE FROM admin_login_failures WHERE failed_at < NOW() - INTERVAL '1 day'");
}

export async function clearLoginFailures(ip: string) {
  const db = await database();
  await db.query("DELETE FROM admin_login_failures WHERE ip = $1", [ip]);
}
