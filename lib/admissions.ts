import type { AdmissionStatus } from "./admission-status";
import { database, indiaDay, likePattern, type DateRange } from "./db";

export {
  admissionStatuses,
  isAdmissionStatus,
  type AdmissionStatus,
} from "./admission-status";

export type Admission = {
  id: number;
  name: string;
  age: number;
  phone: string;
  program: string;
  message: string | null;
  status: AdmissionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const columns = `id, player_name AS name, age, phone, program, message, status,
  notes, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function createAdmission(input: {
  name: string;
  age: number;
  phone: string;
  program: string;
  message: string | null;
}) {
  const db = await database();
  const { rows } = await db.query<Admission>(
    `INSERT INTO admissions (player_name, age, phone, program, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`,
    [input.name, input.age, input.phone, input.program, input.message],
  );
  return rows[0];
}

// How many requests this phone number sent recently, to stop floods, and
// whether the same player was already sent (a double click or a resend).
export async function recentAdmissionsFor(phone: string, name: string) {
  const db = await database();
  const { rows } = await db.query<{ hour: string; duplicate: boolean }>(
    `SELECT
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS hour,
       COALESCE(BOOL_OR(LOWER(player_name) = LOWER($2)
         AND created_at > NOW() - INTERVAL '1 day'), FALSE) AS duplicate
     FROM admissions WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 day'`,
    [phone, name],
  );
  return { lastHour: Number(rows[0].hour), duplicate: rows[0].duplicate };
}

export type AdmissionSearch = {
  status: AdmissionStatus | "all";
  program: string;
  // Inclusive YYYY-MM-DD range on the day the request arrived (India time).
  range: DateRange | null;
  query: string;
};

export async function searchAdmissions(search: AdmissionSearch, limit = 500) {
  const db = await database();
  const where: string[] = [];
  const values: unknown[] = [];
  const param = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (search.status !== "all") where.push(`status = ${param(search.status)}`);
  if (search.program) where.push(`program = ${param(search.program)}`);
  if (search.range) {
    where.push(
      `${indiaDay("created_at")} BETWEEN ${param(search.range.from)}::date AND ${param(search.range.to)}::date`,
    );
  }
  const query = search.query.trim();
  if (query) {
    const like = param(likePattern(query));
    const conditions = [
      `player_name ILIKE ${like}`,
      `message ILIKE ${like}`,
      `notes ILIKE ${like}`,
    ];
    const digits = query.replace(/\D/g, "");
    if (digits.length >= 4) {
      conditions.push(`phone LIKE ${param(`%${digits.slice(-10)}%`)}`);
    }
    where.push(`(${conditions.join(" OR ")})`);
  }

  const { rows } = await db.query<Admission>(
    `SELECT ${columns} FROM admissions
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY created_at DESC LIMIT ${param(limit)}`,
    values,
  );
  return rows;
}

export type AdmissionStats = {
  total: number;
  students: number;
  awaitingReply: number;
  today: number;
  thisMonth: number;
  byProgram: { program: string; requests: number; students: number }[];
};

// `today` is the India date, YYYY-MM-DD.
export async function getAdmissionStats(today: string): Promise<AdmissionStats> {
  const db = await database();
  const day = indiaDay("created_at");
  const [totals, programs] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'joined') AS students,
         COUNT(*) FILTER (WHERE status = 'new') AS "awaitingReply",
         COUNT(*) FILTER (WHERE ${day} = $1::date) AS today,
         COUNT(*) FILTER (WHERE date_trunc('month', ${day}) = date_trunc('month', $1::date))
           AS "thisMonth"
       FROM admissions`,
      [today],
    ),
    db.query<{ program: string; requests: string; students: string }>(
      `SELECT program, COUNT(*) AS requests,
         COUNT(*) FILTER (WHERE status = 'joined') AS students
       FROM admissions GROUP BY program ORDER BY program`,
    ),
  ]);
  const row = totals.rows[0];
  return {
    total: Number(row.total),
    students: Number(row.students),
    awaitingReply: Number(row.awaitingReply),
    today: Number(row.today),
    thisMonth: Number(row.thisMonth),
    byProgram: programs.rows.map((p) => ({
      program: p.program,
      requests: Number(p.requests),
      students: Number(p.students),
    })),
  };
}

export async function updateAdmission(
  id: number,
  status: AdmissionStatus,
  notes: string | null,
) {
  const db = await database();
  await db.query(
    `UPDATE admissions SET status = $2, notes = $3, updated_at = NOW()
     WHERE id = $1`,
    [id, status, notes],
  );
}

export async function deleteAdmission(id: number) {
  const db = await database();
  await db.query("DELETE FROM admissions WHERE id = $1", [id]);
}
