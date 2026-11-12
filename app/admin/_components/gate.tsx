import { connection } from "next/server";
import type { ReactNode } from "react";
import { isAdmin } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { LoginForm } from "./login-form";

// Every admin page and export checks this itself. A layout check alone isn't
// enough, because Next renders a page's data even when its layout doesn't
// show it.
export async function adminAccess() {
  if (!process.env.ADMIN_PASSWORD) return "no-password" as const;
  if (!(await isAdmin())) return "signed-out" as const;
  if (!isDatabaseConfigured()) return "no-database" as const;
  return "ok" as const;
}

// Shows the page only to a signed-in admin, with the database connected.
export async function AdminGate({ children }: { children: ReactNode }) {
  // Environment variables must be read per request, not baked in at build time.
  await connection();
  const access = await adminAccess();

  if (access === "no-password") {
    return (
      <p className="mt-8 max-w-xl bg-white p-6">
        Admin access is turned off until <code>ADMIN_PASSWORD</code> is set on
        the server.
      </p>
    );
  }
  if (access === "signed-out") return <LoginForm />;
  if (access === "no-database") {
    return (
      <div className="mt-8 max-w-xl bg-white p-6 leading-relaxed">
        <p className="font-bold">The database isn&apos;t connected yet.</p>
        <p className="mt-2">
          Create a free Postgres database at neon.tech, copy its connection
          string, and set it as <code>DATABASE_URL</code> on the server (and in{" "}
          <code>.env.local</code> for local development). The site creates its
          tables on first use.
        </p>
      </div>
    );
  }
  return children;
}
