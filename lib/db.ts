import { Pool, type PoolClient } from "pg";
import { HOLD_MINUTES, type PricedLine } from "./booking";

// A booking is "pending" while the customer pays, then "confirmed". Holds that
// time out become "expired", and ones the customer abandons become
// "cancelled". If money arrives for slots someone else has since taken, the
// booking moves through "refund_pending" and "refunding" to "refunded" or
// "refund_failed". "cancelled_by_admin" is set from the admin page.
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
    ADD COLUMN IF NOT EXISTS cancelled_by_academy BOOLEAN NOT NULL DEFAULT FALSE;
`;

let pool: Pool | undefined;
let ready: Promise<unknown> | undefined;

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function database() {
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

async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
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
};

const columns = `id, token, status, customer_name AS name, phone, organisation,
  lines, total_rupees AS total, razorpay_order_id AS "orderId",
  razorpay_payment_id AS "paymentId", refund_id AS "refundId",
  expires_at AS "expiresAt", paid_at AS "paidAt", created_at AS "createdAt",
  cancelled_by_academy AS "cancelledByAcademy"`;

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
           (status, customer_name, phone, organisation, lines, total_rupees, expires_at)
         VALUES ('pending', $1, $2, $3, $4, $5, NOW() + make_interval(mins => $6))
         RETURNING ${columns}`,
        [
          input.name,
          input.phone,
          input.organisation,
          JSON.stringify(input.lines),
          input.total,
          HOLD_MINUTES,
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
    `UPDATE ground_bookings SET status = 'refunding'
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

export async function listBookingsForAdmin() {
  const db = await database();
  const { rows } = await db.query<BookingRecord>(
    `SELECT ${columns} FROM ground_bookings
     WHERE status IN ('confirmed', 'refund_pending', 'refunding', 'refunded', 'refund_failed')
        OR (status = 'pending' AND expires_at > NOW())
     ORDER BY created_at DESC LIMIT 300`,
  );
  return rows;
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
