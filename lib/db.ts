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
    ADD COLUMN IF NOT EXISTS refund_attempted_at TIMESTAMPTZ;
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
`;

let pool: Pool | undefined;
let ready: Promise<unknown> | undefined;

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

export async function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
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
  lines, total_rupees AS total, razorpay_order_id AS "orderId",
  razorpay_payment_id AS "paymentId", refund_id AS "refundId",
  expires_at AS "expiresAt", paid_at AS "paidAt", created_at AS "createdAt",
  cancelled_by_academy AS "cancelledByAcademy", customer_email AS email,
  invoice_sent_at AS "invoiceSentAt"`;

// Only dates and slots, so no customer details ever reach the public page.
export async function getTakenSlots(from: string, to: string) {
  const db = await database();
  const { rows } = await db.query<{ date: string; slotId: string }>(
    `SELECT to_char(l.match_date, 'YYYY-MM-DD') AS date, l.slot_id AS "slotId"
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
}): Promise<
  | { ok: true; booking: BookingRecord }
  | { ok: false; taken: string[] }
> {
  try {
    const booking = await transaction(async (client) => {
      await expireStaleHolds(client);
      const { rows } = await client.query<BookingRecord>(
        `INSERT INTO ground_bookings
           (status, customer_name, phone, organisation, lines, total_rupees, expires_at, customer_email)
         VALUES ('pending', $1, $2, $3, $4, $5, NOW() + make_interval(mins => $6), $7)
         RETURNING ${columns}`,
        [
          input.name,
          input.phone,
          input.organisation,
          JSON.stringify(input.lines),
          input.total,
          HOLD_MINUTES,
          input.email,
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
  matchesToday: number;
  bookedToday: number;
  collectedToday: number;
  collectedThisMonth: number;
  collectedAllTime: number;
  refundsNeedingAction: number;
};

// Money counts only bookings that are paid and not refunded. `today` is the
// India date, YYYY-MM-DD.
export async function getBookingStats(today: string): Promise<BookingStats> {
  const db = await database();
  const paidDay = indiaDay("paid_at");
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'confirmed') AS "paidBookings",
       COUNT(*) FILTER (WHERE status = 'confirmed' AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(lines) AS l
         WHERE (l->>'date')::date = $1::date
       )) AS "matchesToday",
       COUNT(*) FILTER (WHERE status = 'confirmed'
         AND ${indiaDay("created_at")} = $1::date) AS "bookedToday",
       COALESCE(SUM(total_rupees) FILTER (WHERE status = 'confirmed'
         AND ${paidDay} = $1::date), 0) AS "collectedToday",
       COALESCE(SUM(total_rupees) FILTER (WHERE status = 'confirmed'
         AND date_trunc('month', ${paidDay}) = date_trunc('month', $1::date)), 0)
         AS "collectedThisMonth",
       COALESCE(SUM(total_rupees) FILTER (WHERE status = 'confirmed'), 0)
         AS "collectedAllTime",
       COUNT(*) FILTER (WHERE status IN ('refund_pending', 'refund_failed'))
         AS "refundsNeedingAction"
     FROM ground_bookings`,
    [today],
  );
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
  ) as BookingStats;
}
