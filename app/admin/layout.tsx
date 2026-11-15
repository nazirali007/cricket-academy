import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminNav } from "./_components/nav";
import { SignOutButton } from "./_components/sign-out";

export const metadata: Metadata = {
  title: { template: "%s · CCS Admin", default: "Admin" },
  robots: { index: false, follow: false, nocache: true },
};

// The tabs and sign-out show once signed in. Each page checks access itself.
async function SignedInBar() {
  const session = await getAdminSession();
  if (!session) return null;
  return (
    <div className="flex items-end justify-between gap-4">
      <AdminNav />
      <div className="flex shrink-0 items-center gap-4 pb-3 text-sm">
        <span className="hidden text-white/60 sm:inline">
          Signed in as <strong className="text-white">{session.username}</strong>
        </span>
        <SignOutButton />
      </div>
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
