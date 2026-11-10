"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import Image from "next/image";
import { useRef, useState } from "react";
import { categoryLabel, type GalleryPhoto } from "@/lib/gallery";
import { useLightbox } from "./use-lightbox";

const ease = [0.16, 1, 0.3, 1] as const;
const SLIDE_SECONDS = 6;

// A large slideshow with a slow zoom on each photo, like a match-day reel.
// Pauses while hovered or off screen; any slide opens full screen.
export function Spotlight({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const { open, lightbox } = useLightbox();
  const paused = hovered || !inView;
  const photo = photos[index];

  const go = (by: number) =>
    setIndex((i) => (i + by + photos.length) % photos.length);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative aspect-[4/3] overflow-hidden bg-navy-soft sm:aspect-[16/9] lg:aspect-[21/9]"
    >
      <AnimatePresence initial={false}>
        <motion.button
          key={photo.src}
          type="button"
          onClick={() => open(photos, photo)}
          aria-label={`Open photo: ${photo.alt}`}
          className="absolute inset-0 cursor-zoom-in"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <motion.span
            className="absolute inset-0 block"
            initial={{ scale: 1.02, x: "0%" }}
            animate={{ scale: 1.14, x: index % 2 ? "-2%" : "2%" }}
            transition={{ duration: SLIDE_SECONDS + 1.5, ease: "linear" }}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              placeholder={photo.blur}
              className="object-cover"
            />
          </motion.span>
        </motion.button>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-navy via-navy/20 to-navy/10" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-navy/60 via-transparent to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-5 md:p-10">
        <div className="max-w-xl overflow-hidden" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={photo.src}
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              exit={{ y: "-110%" }}
              transition={{ duration: 0.6, ease }}
            >
              <p className="text-xs font-bold tracking-[0.22em] text-gold uppercase">
                {categoryLabel[photo.category]}
              </p>
              <p className="mt-2 font-display text-3xl leading-none font-bold uppercase md:text-5xl">
                {photo.alt}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="pointer-events-auto hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="grid size-12 place-items-center rounded-full border border-white/30 bg-navy/40 backdrop-blur transition hover:bg-white hover:text-navy"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="grid size-12 place-items-center rounded-full border border-white/30 bg-navy/40 backdrop-blur transition hover:bg-white hover:text-navy"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      {/* Story-style progress bars; the running bar moves the slideshow on. */}
      <div className="absolute inset-x-5 top-5 flex gap-1.5 md:inset-x-10 md:top-8">
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1} of ${photos.length}`}
            aria-current={i === index}
            className="h-6 flex-1 py-2.5"
          >
            <span className="block h-1 overflow-hidden rounded-full bg-white/25">
              <span
                key={i === index ? `run-${index}` : "idle"}
                onAnimationEnd={i === index ? () => go(1) : undefined}
                className={`block h-full origin-left bg-white ${
                  i < index ? "scale-x-100" : i === index ? "gallery-progress" : "scale-x-0"
                }`}
                style={{
                  animationDuration: `${SLIDE_SECONDS}s`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </span>
          </button>
        ))}
      </div>

      {lightbox}
    </div>
  );
}
