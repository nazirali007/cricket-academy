import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ccs_admin";

const hash = (value: string) =>
  createHmac("sha256", "ccs-academy-admin").update(value).digest();

export function passwordMatches(attempt: string) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(hash(attempt), hash(password));
}

// The cookie holds a hash that changes if ADMIN_PASSWORD changes, which signs
// out every existing session.
export function adminCookieValue() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  return hash(`session:${password}`).toString("hex");
}

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const expected = Buffer.from(adminCookieValue());
  const actual = Buffer.from(value);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
