"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useRef } from "react";
import {
  submitAdmission,
  type AdmissionField,
  type AdmissionState,
} from "@/lib/actions/admission";
import { programs } from "@/lib/content";

const fieldClass =
  "mt-2 h-12 w-full border border-navy/25 bg-white px-4 text-navy transition-colors outline-none focus:border-ball focus:ring-1 focus:ring-ball aria-invalid:border-red-700";
const labelClass = "block text-sm font-semibold text-navy";

// Saves the request to the academy's database (see /admin/admissions).
// Works without JavaScript too, as a normal form post.
export function JoinForm() {
  const [state, action, pending] = useActionState<AdmissionState, FormData>(
    submitAdmission,
    { status: "idle" },
  );
  // When the visitor started filling the form in, for the server's
  // too-fast-to-be-human check.
  const started = useRef<HTMLInputElement>(null);
  const markStarted = () => {
    if (started.current && !started.current.value) {
      started.current.value = String(Date.now());
    }
  };

  if (state.status === "saved") {
    return (
      <div role="status" className="bg-white p-6 md:p-10">
        <CheckCircle2 aria-hidden className="size-10 text-emerald-700" />
        <h3 className="mt-4 font-display text-4xl font-bold uppercase">
          Request received
        </h3>
        <p className="mt-3 leading-relaxed text-navy">
          Thank you. We&apos;ve got the details for {state.name} and the academy
          will call you soon to talk about batches and fees.
        </p>
        {state.whatsappUrl && (
          <a
            href={state.whatsappUrl}
            target="_blank"
            rel="noopener"
            className="mt-6 inline-flex h-12 items-center bg-[#1f8f4e] px-6 text-sm font-bold text-white transition-colors hover:bg-[#18733e]"
          >
            Also message us on WhatsApp
          </a>
        )}
      </div>
    );
  }

  const fieldError = (field: AdmissionField) =>
    state.status === "error" ? state.fields?.[field] : undefined;

  const errorText = (field: AdmissionField) => {
    const message = fieldError(field);
    return message ? (
      <span id={`join-${field}-error`} className="mt-1.5 block text-sm font-semibold text-red-700">
        {message}
      </span>
    ) : null;
  };

  const values = state.status === "error" ? (state.values ?? {}) : {};

  const invalid = (field: AdmissionField) =>
    fieldError(field)
      ? { "aria-invalid": true, "aria-describedby": `join-${field}-error` }
      : {};

  return (
    <form action={action} onFocus={markStarted} className="bg-white p-6 md:p-10">
      <h3 className="font-display text-4xl font-bold uppercase">
        Apply for admission
      </h3>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Player&apos;s name
          <input
            required
            name="name"
            defaultValue={values.name}
            autoComplete="name"
            maxLength={80}
            className={fieldClass}
            {...invalid("name")}
          />
          {errorText("name")}
        </label>
        <label className={labelClass}>
          Age
          <input
            required
            name="age"
            defaultValue={values.age}
            type="number"
            inputMode="numeric"
            min={3}
            max={99}
            className={fieldClass}
            {...invalid("age")}
          />
          {errorText("age")}
        </label>
        <label className={labelClass}>
          Phone number
          <input
            required
            name="phone"
            defaultValue={values.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            className={fieldClass}
            {...invalid("phone")}
          />
          {errorText("phone")}
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Program
          <select
            name="program"
            defaultValue={values.program}
            className={fieldClass}
            {...invalid("program")}
          >
            {programs.map((program) => (
              <option key={program.title}>{program.title}</option>
            ))}
          </select>
          {errorText("program")}
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Anything we should know? (optional)
          <textarea
            name="message"
            defaultValue={values.message}
            rows={3}
            maxLength={1000}
            className={`${fieldClass} h-auto py-3`}
          />
        </label>
      </div>

      {/* Spam traps: hidden from people, filled in by bots. */}
      <input ref={started} type="hidden" name="started" defaultValue="" />
      <label aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-7 h-13 w-full bg-ball text-sm font-bold text-white transition-colors duration-300 hover:bg-[#a81f18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-70"
      >
        {pending ? "Sending…" : "Send request"}
      </button>

      <p role="alert" className="mt-4 text-sm leading-relaxed font-semibold text-red-700 empty:hidden">
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
