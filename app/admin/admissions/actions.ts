"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { deleteAdmission, isAdmissionStatus, updateAdmission } from "@/lib/admissions";
import { cleanMultiline } from "@/lib/form-input";

const idFrom = (form: FormData) => {
  const id = Number(form.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function saveAdmission(_previous: string | null, form: FormData) {
  if (!(await isAdmin())) return "Signed out. Refresh and sign in again.";
  const id = idFrom(form);
  const status = form.get("status");
  if (!id || !isAdmissionStatus(status)) return "Couldn't save that.";
  await updateAdmission(id, status, cleanMultiline(form.get("notes"), 2000) || null);
  revalidatePath("/admin", "layout");
  return "Saved";
}

export async function removeAdmission(form: FormData) {
  if (!(await isAdmin())) return;
  const id = idFrom(form);
  if (!id) return;
  await deleteAdmission(id);
  revalidatePath("/admin", "layout");
}
