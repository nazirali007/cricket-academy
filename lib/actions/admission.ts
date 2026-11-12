"use server";

import { after } from "next/server";
import { createAdmission, recentAdmissionsFor } from "@/lib/admissions";
import { programs } from "@/lib/content";
import { isDatabaseConfigured } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { cleanMultiline, cleanText, normalisePhone } from "@/lib/form-input";
import { contact, siteUrl } from "@/lib/site";

export type AdmissionField = "name" | "age" | "phone" | "program";

export type AdmissionState =
  | { status: "idle" }
  | { status: "saved"; name: string; whatsappUrl: string | null }
  | {
      status: "error";
      message: string;
      fields?: Partial<Record<AdmissionField, string>>;
      // What was typed, so the form can refill itself after an error.
      values?: Partial<Record<AdmissionField | "message", string>>;
    };

const MAX_PER_PHONE_PER_HOUR = 3;
// Real people take a few seconds to fill the form in; bots don't.
const MIN_FILL_MS = 2500;

const whatsappLink = (text: string) =>
  contact.whatsapp
    ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`
    : null;

// Saves a Join form request to the database for the admin page, and emails
// the academy about it when email is set up.
export async function submitAdmission(
  _previous: AdmissionState,
  form: FormData,
): Promise<AdmissionState> {
  const name = cleanText(form.get("name"), 80);
  const ageText = cleanText(form.get("age"), 3);
  const age = Number(ageText);
  const phone = normalisePhone(form.get("phone"));
  const program = cleanText(form.get("program"), 40);
  const message = cleanMultiline(form.get("message"), 1000) || null;

  // Spam traps: a hidden field people never see, and a too-fast submit.
  // Pretend it worked so bots don't learn to dodge them.
  const started = Number(form.get("started"));
  if (
    cleanText(form.get("website"), 200) ||
    (Number.isFinite(started) && started > 0 && Date.now() - started < MIN_FILL_MS)
  ) {
    return { status: "saved", name: name || "you", whatsappUrl: null };
  }

  const fields: Partial<Record<AdmissionField, string>> = {};
  if (name.length < 2) fields.name = "Please enter the player's name.";
  if (!/^\d{1,2}$/.test(ageText) || age < 3 || age > 99) {
    fields.age = "Please enter an age between 3 and 99.";
  }
  if (!phone) fields.phone = "Please enter a valid 10-digit mobile number.";
  if (!programs.some((p) => p.title === program)) {
    fields.program = "Please choose a program.";
  }
  const values = {
    name,
    age: ageText,
    phone: cleanText(form.get("phone"), 20),
    program,
    message: message ?? "",
  };
  if (Object.keys(fields).length > 0) {
    return { status: "error", message: "Please check the highlighted fields.", fields, values };
  }

  const summary = [
    "Admission request for CCS Cricket Academy",
    `Player: ${name}`,
    `Age: ${age}`,
    `Phone: ${phone}`,
    `Program: ${program}`,
    message ? `Message: ${message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!isDatabaseConfigured()) {
    // Without a database, WhatsApp is the only way to reach the academy.
    const whatsappUrl = whatsappLink(summary);
    if (whatsappUrl) return { status: "saved", name, whatsappUrl };
    return {
      status: "error",
      message:
        "Online requests aren't available yet, so your details were not sent. Please call or email the academy.",
      values,
    };
  }

  try {
    const recent = await recentAdmissionsFor(phone!, name);
    if (recent.duplicate) {
      return { status: "saved", name, whatsappUrl: whatsappLink(summary) };
    }
    if (recent.lastHour >= MAX_PER_PHONE_PER_HOUR) {
      return {
        status: "error",
        message: "We've already received several requests from this number. We'll be in touch soon.",
      };
    }
    await createAdmission({ name, age, phone: phone!, program, message });
  } catch (error) {
    console.error("Could not save admission request", error);
    return {
      status: "error",
      message: "Something went wrong saving your request. Please try again in a minute.",
    };
  }

  // Emails the academy after the reply has gone, so the visitor isn't kept
  // waiting on the mail server. Does nothing until SMTP is set up.
  after(async () => {
    try {
      await sendMail({
        to: process.env.BOOKING_EMAIL_TO || contact.email,
        subject: `New admission request: ${name} (${program})`,
        text: `${summary}\n\nSee all admissions: ${siteUrl}/admin/admissions`,
      });
    } catch (error) {
      console.error("Could not email admission alert", error);
    }
  });

  return { status: "saved", name, whatsappUrl: whatsappLink(summary) };
}
