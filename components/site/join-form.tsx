"use client";

import { useState, type FormEvent } from "react";
import { programs } from "@/lib/content";
import { contact } from "@/lib/site";

const fieldClass =
  "mt-2 h-12 w-full border border-navy/25 bg-white px-4 text-navy transition-colors outline-none focus:border-ball focus:ring-1 focus:ring-ball";
const labelClass = "block text-sm font-semibold text-navy";

// Sends the enquiry to the academy's WhatsApp, because the site has no server
// or database to store it. Set `whatsapp` in lib/site.ts to turn this on.
export function JoinForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "not-connected">(
    "idle",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact.whatsapp) {
      setStatus("not-connected");
      return;
    }
    const data = new FormData(event.currentTarget);
    const text = [
      "Admission request for CCS Cricket Academy",
      `Player: ${data.get("name")}`,
      `Age: ${data.get("age")}`,
      `Phone: ${data.get("phone")}`,
      `Program: ${data.get("program")}`,
      data.get("message") ? `Message: ${data.get("message")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener",
    );
    setStatus("sent");
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10">
      <h3 className="font-display text-4xl font-bold uppercase">
        Apply for admission
      </h3>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Player&apos;s name
          <input
            required
            name="name"
            autoComplete="name"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Age
          <input
            required
            name="age"
            type="number"
            min={3}
            max={99}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Phone number
          <input
            required
            name="phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Program
          <select name="program" className={fieldClass}>
            {programs.map((program) => (
              <option key={program.title}>{program.title}</option>
            ))}
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Anything we should know? (optional)
          <textarea
            name="message"
            rows={3}
            className={`${fieldClass} h-auto py-3`}
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-7 h-13 w-full bg-ball text-sm font-bold text-white transition-colors duration-300 hover:bg-[#a81f18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        Send request
      </button>

      <p role="status" className="mt-4 text-sm leading-relaxed text-navy">
        {status === "sent" &&
          "WhatsApp has opened with your details. Press send there to reach us."}
        {status === "not-connected" &&
          "Online requests aren't available yet. Your details were not sent, so please contact the academy directly."}
      </p>
    </form>
  );
}
