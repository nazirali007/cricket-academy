import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdminSession } from "@/lib/admin-auth";
import { isAdminConfigured, safeAdminPath } from "@/lib/admin-session";
import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = { title: "Sign in" };

async function SignIn({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeAdminPath(params.next);
  if (await getAdminSession()) redirect(next);

  if (!isAdminConfigured()) {
    return (
      <p className="mx-auto mt-10 max-w-md bg-white p-6 leading-relaxed">
        Admin sign-in is turned off until <code>ADMIN_USERNAME</code> and{" "}
        <code>ADMIN_PASSWORD</code> are set in the hosting settings.
      </p>
    );
  }
  return (
    <LoginForm
      next={next}
      notice={params.expired ? "Your session ended. Please sign in again." : undefined}
    />
  );
}

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-96 max-w-sm bg-white/60" />}>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}
