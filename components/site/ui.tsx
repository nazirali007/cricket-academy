import { ArrowRight } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

export function Eyebrow({
  children,
  onDark = false,
}: {
  children: ReactNode;
  onDark?: boolean;
}) {
  return (
    <p
      className={`mb-4 flex items-center gap-3 text-xs font-bold tracking-[0.22em] uppercase ${
        onDark ? "text-ball-light" : "text-ball"
      }`}
    >
      <span aria-hidden className="h-px w-8 bg-current" />
      {children}
    </p>
  );
}

export function Heading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-5xl leading-[0.95] font-bold tracking-tight uppercase text-balance md:text-7xl ${className}`}
    >
      {children}
    </h2>
  );
}

export function CtaLink({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
}) {
  const styles =
    variant === "solid"
      ? "bg-ball text-white hover:bg-[#a81f18]"
      : "border border-white/35 text-white hover:border-white hover:bg-white/10";

  return (
    <a
      href={href}
      className={`group inline-flex h-13 items-center justify-center gap-3 px-7 text-sm font-bold tracking-wide transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${styles}`}
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
      />
    </a>
  );
}

// The official CCS Academy badge. Pass the width; the height keeps its shape.
export function Logo({
  width,
  preload = false,
}: {
  width: number;
  preload?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="CCS Academy logo"
      width={width}
      height={Math.round((width * 490) / 450)}
      preload={preload}
    />
  );
}
