"use client";

import { useActionState } from "react";
import { logIn } from "../actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(logIn, null);

  return (
    <form action={action} className="mt-8 max-w-sm bg-white p-6">
      <h2 className="font-display text-3xl font-bold uppercase">Sign in</h2>
      <label className="mt-4 block text-sm font-semibold">
        Admin password
        <input
          required
          autoFocus
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
