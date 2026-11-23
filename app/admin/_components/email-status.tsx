"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Mail } from "lucide-react";
import { useActionState } from "react";
import { testEmail, type TestEmailState } from "../actions";

// Shows whether customer emails can go out, and lets the admin prove it.
export function EmailStatus({ missing }: { missing: string[] }) {
  const [result, send, sending] = useActionState<TestEmailState>(testEmail, null);

  if (missing.length) {
    return (
      <div role="alert" className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-900">
        <p className="flex items-center gap-2 font-bold">
          <CircleAlert aria-hidden className="size-4" />
          Emails are switched off: customers get no booking confirmation,
          invoice or payment-link email.
        </p>
        <p className="mt-2">
          Missing on the server: <strong>{missing.join(", ")}</strong>. In Vercel, open
          Settings → Environment Variables, add them, then redeploy. SMTP_PASSWORD is a
          Google App password: Google Account → Security → 2-Step Verification → App
          passwords.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 bg-white p-4 text-sm">
      <span className="flex items-center gap-2 font-semibold">
        <Mail aria-hidden className="size-4" />
        Customer emails are set up.
      </span>
      <form action={send}>
        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 border border-navy px-3 py-1.5 font-bold transition-colors hover:bg-navy hover:text-white disabled:opacity-60"
        >
          {sending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {sending ? "Sending…" : "Send test email"}
        </button>
      </form>
      {result && (
        <p
          role="status"
          className={`flex basis-full items-start gap-2 font-semibold ${result.ok ? "text-emerald-800" : "text-red-800"}`}
        >
          {result.ok ? (
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          {result.message}
        </p>
      )}
    </div>
  );
}
