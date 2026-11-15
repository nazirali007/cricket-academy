import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// The admin has one account, set on the server with ADMIN_USERNAME and
// ADMIN_PASSWORD. There is no sign-up. This file has no Next.js imports so
// both proxy.ts and the pages can use it.

export const SESSION_HOURS = 12;

// "__Host-" makes the browser refuse this cookie unless it came from this
// exact site over HTTPS, so no other site or subdomain can plant one.
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-ccs-admin" : "ccs-admin";

// Cookie settings shared by sign-in, sign-out and proxy.ts. "__Host-" cookies
// are only accepted (or cleared) with Secure and Path=/ present.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

type Credentials = { username: string; password: string };

function credentials(): Credentials | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  return username && password ? { username, password } : null;
}

export const isAdminConfigured = () => credentials() !== null;

const digest = (value: string) => createHash("sha256").update(value).digest();

// Compares without leaking, through timing, how much of a guess was right.
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export function credentialsMatch(username: string, password: string) {
  const expected = credentials();
  if (!expected) return false;
  // Check both, always, so a wrong user ID takes as long as a wrong password.
  const userOk = same(username.trim().toLowerCase(), expected.username.toLowerCase());
  const passOk = same(password, expected.password);
  return userOk && passOk;
}

// Sessions are signed with a key built from the credentials, so changing the
// user ID or password signs out every device at once.
function signingKey({ username, password }: Credentials) {
  return digest(`${process.env.ADMIN_SESSION_SECRET ?? ""}\0${username}\0${password}`);
}

const sign = (payload: string, key: Buffer) =>
  createHmac("sha256", key).update(payload).digest("base64url");

type Session = { username: string; expiresAt: number };

export function createSessionToken(now = Date.now()) {
  const creds = credentials();
  if (!creds) throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set");
  const expiresAt = now + SESSION_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({ sub: creds.username, exp: expiresAt }),
  ).toString("base64url");
  return { token: `${payload}.${sign(payload, signingKey(creds))}`, expiresAt };
}

export function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
): Session | null {
  const creds = credentials();
  if (!creds || !token || token.length > 512) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, signingKey(creds)));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (sub !== creds.username || typeof exp !== "number" || exp <= now) return null;
    return { username: sub, expiresAt: exp };
  } catch {
    return null;
  }
}

// Only ever send people back to an admin page after signing in.
export function safeAdminPath(value: unknown) {
  if (typeof value !== "string") return "/admin";
  if (!/^\/admin(\/[A-Za-z0-9/_-]*)?(\?[^\s]*)?$/.test(value)) return "/admin";
  return value.startsWith("/admin/login") ? "/admin" : value;
}
