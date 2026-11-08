"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  adminCookieValue,
  isAdmin,
  passwordMatches,
} from "@/lib/admin-auth";
import { cancelBookingAsAdmin, getBookingById, markInvoiceSent } from "@/lib/db";
import { sendInvoice } from "@/lib/email";
import { refundInFull } from "@/lib/payments";

const PATH = "/admin/bookings";

export async function logIn(_previous: string | null, form: FormData) {
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    return "That password isn't correct.";
  }
  (await cookies()).set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 60 * 60 * 12,
  });
  revalidatePath(PATH);
  return null;
}

export async function logOut() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  revalidatePath(PATH);
}

export async function cancelBooking(form: FormData) {
  if (!(await isAdmin())) return;
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const booking = await cancelBookingAsAdmin(id);
  if (booking?.status === "refund_pending") await refundInFull(booking);
  revalidatePath(PATH);
}

// Emails the invoice again, for example if the customer can't find it.
export async function resendInvoice(form: FormData) {
  if (!(await isAdmin())) return;
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const booking = await getBookingById(id);
  if (booking?.status !== "confirmed") return;
  try {
    if (await sendInvoice(booking)) await markInvoiceSent(booking.id);
  } catch (error) {
    console.error(`Could not resend invoice for ${id}`, error);
  }
  revalidatePath(PATH);
}
