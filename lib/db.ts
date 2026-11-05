import { Pool } from "pg";

// UNIQUE (match_date, slot_id) is what makes double booking impossible. The
// database rejects a second booking even if two people press Book together.
const schema = `
  CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    match_date DATE NOT NULL,
    slot_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    organisation TEXT,
    balls INTEGER NOT NULL DEFAULT 0,
    umpires BOOLEAN NOT NULL DEFAULT FALSE,
    total_rupees INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_date, slot_id)
  );
  CREATE INDEX IF NOT EXISTS bookings_phone_created_at
    ON bookings (phone, created_at);
`;

let pool: Pool | undefined;
let ready: Promise<unknown> | undefined;

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  // Creates the table the first time the site connects.
  ready ??= pool.query(schema).catch((error) => {
    ready = undefined;
    throw error;
  });
  await ready;
  return pool;
}

// Only ever returns the date and slot, so no customer details reach the page.
export async function getBookedSlots(from: string, to: string) {
  const db = await database();
  const { rows } = await db.query<{ date: string; slotId: string }>(
    `SELECT to_char(match_date, 'YYYY-MM-DD') AS date, slot_id AS "slotId"
     FROM bookings WHERE match_date BETWEEN $1::date AND $2::date`,
    [from, to],
  );
  return rows;
}

export async function countRecentBookings(phone: string) {
  const db = await database();
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM bookings
     WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 day'`,
    [phone],
  );
  return Number(rows[0].count);
}

// Returns the new booking's id, or null if the slot is already taken.
export async function createBooking(booking: {
  date: string;
  slotId: string;
  name: string;
  phone: string;
  organisation: string | null;
  balls: number;
  umpires: boolean;
  total: number;
}) {
  const db = await database();
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO bookings
       (match_date, slot_id, customer_name, phone, organisation, balls, umpires, total_rupees)
     VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (match_date, slot_id) DO NOTHING
     RETURNING id`,
    [
      booking.date,
      booking.slotId,
      booking.name,
      booking.phone,
      booking.organisation,
      booking.balls,
      booking.umpires,
      booking.total,
    ],
  );
  return rows[0]?.id ?? null;
}

export type BookingRow = {
  id: number;
  date: string;
  slotId: string;
  name: string;
  phone: string;
  organisation: string | null;
  balls: number;
  umpires: boolean;
  total: number;
};

export async function listBookings(from: string) {
  const db = await database();
  const { rows } = await db.query<BookingRow>(
    `SELECT id, to_char(match_date, 'YYYY-MM-DD') AS date, slot_id AS "slotId",
       customer_name AS name, phone, organisation, balls, umpires,
       total_rupees AS total
     FROM bookings WHERE match_date >= $1::date
     ORDER BY match_date, id`,
    [from],
  );
  return rows;
}

export async function deleteBooking(id: number) {
  const db = await database();
  await db.query("DELETE FROM bookings WHERE id = $1", [id]);
}
