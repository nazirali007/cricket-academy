"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { cancelBookingAsAdmin, getBookingById, markInvoiceSent } from "@/lib/db";
import { sendInvoice } from "@/lib/email";
import { refundInFull, retryRefund as retry } from "@/lib/payments";

export async function cancelBooking(form: FormData) {
  if (!(await isAdmin())) return;
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const booking = await cancelBookingAsAdmin(id);
  if (booking?.status === "refund_pending") await refundInFull(booking);
  revalidatePath("/admin", "layout");
}

// Tries a failed refund again. Razorpay is asked first how much has already
// gone back, so this can never refund the customer twice.
export async function retryRefund(form: FormData) {
  if (!(await isAdmin())) return;
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await retry(id);
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
}
