import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pt-10">
      <h1 className="font-display text-4xl font-bold uppercase md:text-5xl">{children}</h1>
      {aside}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "plain" | "alert" | "good";
}) {
  const toneClass =
    tone === "alert"
      ? "border-l-4 border-red-700"
      : tone === "good"
        ? "border-l-4 border-emerald-700"
        : "border-l-4 border-transparent";
  const body = (
    <>
      <p className="text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </>
  );
  return href ? (
    <Link
      href={href}
      className={`block bg-white p-5 transition-shadow hover:shadow-md ${toneClass}`}
    >
      {body}
    </Link>
  ) : (
    <div className={`bg-white p-5 ${toneClass}`}>{body}</div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-block px-2 py-1 text-xs font-bold whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}
