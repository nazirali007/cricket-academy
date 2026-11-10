"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { GalleryPhoto } from "@/lib/gallery";

const ease = [0.16, 1, 0.3, 1] as const;

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 120, scale: 0.96 }),
  centre: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -120, scale: 0.96 }),
};

// Full-screen photo viewer: arrows, swipe, keyboard and a thumbnail strip.
export function Lightbox({
  photos,
  index,
  direction,
  onChange,
  onClose,
}: {
  photos: GalleryPhoto[];
  index: number;
  direction: number;
  onChange: (index: number, direction: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<HTMLUListElement>(null);
  const count = photos.length;

  const go = (by: number) => onChange((index + by + count) % count, by);

  // Keyboard controls, scroll lock and focus handling while the viewer is open.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") onChange((index + 1) % count, 1);
      else if (event.key === "ArrowLeft") onChange((index - 1 + count) % count, -1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onChange, onClose]);

  // Keep the current thumbnail in view.
  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -70 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 70 || info.velocity.x > 400) go(-1);
  }

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[70] flex flex-col bg-black/95 text-white backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <p className="font-display text-xl font-bold tabular-nums" aria-live="polite">
          {index + 1}
          <span className="text-white/40"> / {count}</span>
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          className="grid size-11 place-items-center rounded-full border border-white/20 transition hover:rotate-90 hover:bg-white/10"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={photo.src}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="centre"
            exit="exit"
            transition={{ duration: 0.5, ease }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
            className="absolute inset-0 cursor-grab px-2 active:cursor-grabbing md:px-20"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="100vw"
              placeholder={photo.blur}
              draggable={false}
              className="object-contain select-none"
            />
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous photo"
          className="absolute top-1/2 left-3 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 transition hover:-translate-x-0.5 hover:bg-white hover:text-navy md:grid"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next photo"
          className="absolute top-1/2 right-3 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 transition hover:translate-x-0.5 hover:bg-white hover:text-navy md:grid"
        >
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={photo.src}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="px-4 pt-3 text-center text-sm text-white/80"
        >
          {photo.alt}
        </motion.p>
      </AnimatePresence>

      <ul
        ref={stripRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] md:justify-center-safe"
      >
        {photos.map((p, i) => (
          <li key={p.src} data-index={i} className="shrink-0">
            <button
              type="button"
              onClick={() => onChange(i, i > index ? 1 : -1)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`relative block h-12 w-18 overflow-hidden transition-all duration-300 md:h-14 md:w-21 ${
                i === index
                  ? "opacity-100 ring-2 ring-gold ring-offset-2 ring-offset-black"
                  : "opacity-40 hover:opacity-80"
              }`}
            >
              <Image src={p.src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </motion.div>,
    document.body,
  );
}
