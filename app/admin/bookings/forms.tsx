"use client";

import { useActionState } from "react";
import { cancelBooking, logIn, resendInvoice } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(logIn, null);

  return (
    <form action={action} className="mt-8 max-w-sm">
      <label className="block text-sm font-semibold">
        Password
        <input
          required
          type="password"
          name="password"
          autoComplete="current-password"
          className="mt-1.5 h-12 w-full border border-navy/25 bg-white px-4 outline-none focus:border-ball focus:ring-1 focus:ring-ball"
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 h-12 w-full bg-ball text-sm font-bold text-white disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function CancelButton({
  id,
  label,
  paid,
}: {
  id: number;
  label: string;
  paid: boolean;
}) {
  return (
    <form
      action={cancelBooking}
      onSubmit={(event) => {
        const message = paid
          ? `Cancel ${label}? The academy is cancelling, so the customer gets a FULL refund through Razorpay now, and the slots become available again.`
          : `Cancel ${label}? Its slots will become available again.`;
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border border-red-700 px-3 py-1.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-700 hover:text-white"
      >
        Cancel
      </button>
    </form>
  );
}

export function ResendInvoiceButton({ id }: { id: number }) {
  return (
    <form action={resendInvoice}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs font-bold underline">
        Resend invoice
      </button>
    </form>
  );
}
