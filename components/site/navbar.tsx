"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useEffect, useState } from "react";
import { navLinks } from "@/lib/content";
import { Logo } from "./ui";

const ease = [0.16, 1, 0.3, 1] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActive] = useState("home");
  // Sections only exist on the home page, so nothing is highlighted elsewhere.
  const active = usePathname() === "/" ? activeSection : null;
  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  // Highlights the link for whichever section is in the middle of the screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const { id } of navLinks) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`relative z-10 transition-colors duration-500 ${
          scrolled || open
            ? "bg-navy/97 shadow-[0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-lg"
            : "bg-transparent"
        }`}
      >
        <nav
          aria-label="Main"
          className={`mx-auto flex max-w-7xl items-center justify-between px-5 transition-[height] duration-500 md:px-8 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          <Link
            href="/#home"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 text-white"
          >
            <Logo width={48} preload />
            <span className="font-display text-xl leading-none font-bold tracking-wide sm:text-2xl">
              CCS CRICKET ACADEMY
            </span>
          </Link>

          <ul className="hidden items-center gap-1 xl:flex">
            {navLinks.map((link) => (
              <li key={link.id} className="relative">
                <Link
                  href={`/#${link.id}`}
                  aria-current={active === link.id ? "true" : undefined}
                  className={`block px-3.5 py-2 text-sm font-semibold transition-colors duration-300 ${
                    active === link.id
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
                {active === link.id && (
                  <motion.span
                    layoutId="nav-underline"
                    aria-hidden
                    className="absolute inset-x-3.5 -bottom-0.5 h-0.5 bg-ball-light"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link
              href="/#join"
              className="hidden h-11 items-center bg-ball px-6 text-sm font-bold text-white transition-colors duration-300 hover:bg-[#a81f18] sm:flex"
            >
              Join Now
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-11 place-items-center text-white xl:hidden"
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>
      </div>

      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-full z-10 h-0.5 origin-left bg-ball-light"
        style={{ scaleX: scrollYProgress, opacity: scrolled ? 1 : 0 }}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 flex flex-col justify-center-safe overflow-y-auto bg-navy px-6 pt-20 pb-8 xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ul className="space-y-1">
              {[...navLinks, { id: "join", label: "Join Now" }].map(
                (link, i) => (
                  <li key={link.id} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.05 + i * 0.05,
                        ease,
                      }}
                    >
                      <Link
                        href={`/#${link.id}`}
                        onClick={() => setOpen(false)}
                        className={`block py-1.5 font-display text-5xl font-bold uppercase ${
                          link.id === "join" ? "text-ball-light" : "text-white"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  </li>
                ),
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
