"use client";

import { useFormStatus } from "react-dom";
import { logOut } from "../actions";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="font-bold text-white/70 underline hover:text-white disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={logOut}>
      <Button />
    </form>
  );
}
