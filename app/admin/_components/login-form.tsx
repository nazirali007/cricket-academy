"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useActionState, useState } from "react";
import { logIn, type LoginState } from "../actions";

const field =
  "mt-1.5 h-12 w-full border border-navy/25 bg-white px-4 text-base outline-none transition-colors focus:border-ball focus:ring-1 focus:ring-ball";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(logIn, {
    error: null,
    username: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const message = state.error ?? notice;

  return (
    <form
      action={action}
      className="mx-auto mt-10 w-full max-w-sm bg-white p-6 shadow-sm sm:p-8"
      noValidate
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center bg-navy text-gold">
          <LockKeyhole aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-3xl leading-none font-bold uppercase">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Admin access only</p>
        </div>
      </div>

      <input type="hidden" name="next" value={next} />

      <label className="mt-6 block text-sm font-semibold">
        User ID
        <input
          required
          autoFocus
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={state.username}
          key={state.username}
          className={field}
        />
      </label>

      <label className="mt-4 block text-sm font-semibold">
        Password
        <span className="relative block">
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={`${field} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 mt-1.5 grid w-12 place-items-center text-navy/60 hover:text-navy"
          >
            {showPassword ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          </button>
        </span>
      </label>

      <p role="alert" aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-red-700">
        {pending ? "" : message}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 bg-ball text-sm font-bold text-white transition-opacity disabled:opacity-70"
      >
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
