"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  adminCookieValue,
  passwordMatches,
} from "@/lib/admin-auth";

// A failed attempt waits a moment, which makes guessing the password slow.
const FAILED_LOGIN_DELAY_MS = 1200;

export async function logIn(_previous: string | null, form: FormData) {
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return "That password isn't correct.";
  }
  (await cookies()).set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 60 * 60 * 12,
  });
  revalidatePath("/admin", "layout");
  return null;
}

export async function logOut() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  revalidatePath("/admin", "layout");
}
