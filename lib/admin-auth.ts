import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifySessionToken,
} from "./admin-session";

// Read once per request, however many components ask. connection() marks the
// caller as per-request, so a session is never baked into a prerendered page.
export const getAdminSession = cache(async () => {
  await connection();
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
});

export const isAdmin = async () => (await getAdminSession()) !== null;

export async function startAdminSession() {
  const { token, expiresAt } = createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    expires: new Date(expiresAt),
    priority: "high",
  });
}

export async function endAdminSession() {
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

// The visitor's address, as reported by the host (Vercel sets this header).
export async function clientIp() {
  const list = (await headers()).get("x-forwarded-for") ?? "";
  return list.split(",")[0]?.trim().slice(0, 64) || "unknown";
}
