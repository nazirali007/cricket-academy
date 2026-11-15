"use server";

import { redirect } from "next/navigation";
import { clientIp, endAdminSession, startAdminSession } from "@/lib/admin-auth";
import { credentialsMatch, isAdminConfigured, safeAdminPath } from "@/lib/admin-session";
import {
  clearLoginFailures,
  isDatabaseConfigured,
  loginLockMinutes,
  recordLoginFailure,
} from "@/lib/db";

export type LoginState = { error: string | null; username: string };

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
// Every failed try waits a moment, so guessing is slow even before lockout.
const FAILED_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The lockout lives in the database so it holds across all of the host's
// servers. If the database is down, signing in still works, just unlimited.
async function guard<T>(work: () => Promise<T>, fallback: T) {
  if (!isDatabaseConfigured()) return fallback;
  try {
    return await work();
  } catch (error) {
    console.error("Admin sign-in lockout unavailable", error);
    return fallback;
  }
}

export async function logIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const username = String(form.get("username") ?? "").slice(0, 100);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const next = safeAdminPath(form.get("next"));

  if (!isAdminConfigured()) {
    return { error: "Admin sign-in isn't set up on the server yet.", username };
  }
  if (!username.trim() || !password) {
    return { error: "Enter your user ID and password.", username };
  }

  const ip = await clientIp();
  const locked = await guard(() => loginLockMinutes(ip, MAX_FAILURES, LOCK_MINUTES), 0);
  if (locked > 0) {
    return {
      error: `Too many failed attempts. Try again in ${locked} minute${locked === 1 ? "" : "s"}.`,
      username,
    };
  }

  if (!credentialsMatch(username, password)) {
    await guard(() => recordLoginFailure(ip), undefined);
    await sleep(FAILED_DELAY_MS);
    return { error: "Incorrect user ID or password.", username };
  }

  await guard(() => clearLoginFailures(ip), undefined);
  await startAdminSession();
  redirect(next);
}

export async function logOut() {
  await endAdminSession();
  redirect("/admin/login");
}
