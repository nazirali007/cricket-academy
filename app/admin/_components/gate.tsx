import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { isAdmin } from "@/lib/admin-auth";
import { isAdminConfigured } from "@/lib/admin-session";
import { isDatabaseConfigured } from "@/lib/db";

// Every admin page, action and export checks this itself. proxy.ts already
// turns signed-out visitors away, but data is only ever guarded here, next to
// where it is read.
export async function adminAccess() {
  if (!isAdminConfigured() || !(await isAdmin())) return "signed-out" as const;
  if (!isDatabaseConfigured()) return "no-database" as const;
  return "ok" as const;
}

// Shows the page only to the signed-in admin, with the database connected.
export async function AdminGate({ children }: { children: ReactNode }) {
  // Settings and cookies must be read per request, not at build time.
  await connection();
  const access = await adminAccess();

  if (access === "signed-out") redirect("/admin/login");
  if (access === "no-database") {
    return (
      <div className="mt-8 max-w-xl bg-white p-6 leading-relaxed">
        <p className="font-bold">The database isn&apos;t connected.</p>
        <p className="mt-2">
          Set <code>DATABASE_URL</code> in the hosting settings to your Supabase
          connection string (Transaction pooler), then redeploy.
        </p>
      </div>
    );
  }
  return children;
}
