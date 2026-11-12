import type { Metadata } from "next";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin-auth";
import { logOut } from "./actions";
import { AdminNav } from "./_components/nav";

export const metadata: Metadata = {
  title: { template: "%s · CCS Admin", default: "Admin" },
  robots: { index: false, follow: false, nocache: true },
};

// The tabs and sign-out show once signed in. Each page checks access itself.
async function SignedInBar() {
  if (!(await isAdmin())) return null;
  return (
    <div className="flex items-end justify-between gap-4">
      <AdminNav />
      <form action={logOut} className="shrink-0 pb-3">
        <button type="submit" className="text-sm font-bold text-white/70 underline hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <div className="bg-navy pt-28 text-white">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="pb-4 text-xs font-bold tracking-[0.22em] text-gold uppercase">
            CCS Academy admin
          </p>
          <Suspense fallback={null}>
            <SignedInBar />
          </Suspense>
        </div>
      </div>
      <div className="min-h-[60svh] bg-cream pb-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">{children}</div>
      </div>
    </>
  );
}
