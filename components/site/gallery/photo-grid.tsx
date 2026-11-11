"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  categoryLabel,
  galleryCategories,
  galleryPhotos,
  type GalleryCategory,
  type GalleryPhoto,
} from "@/lib/gallery";
import { useLightbox } from "./use-lightbox";

// Photos per slide: a 3×2 grid from the md breakpoint up, 2×2 on phones.
const DESKTOP = 6;
const MOBILE = 4;
const query = "(min-width: 768px)";

function usePageSize() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => (window.matchMedia(query).matches ? DESKTOP : MOBILE),
    () => DESKTOP,
  );
}

function chunk<T>(list: T[], size: number) {
  const pages: T[][] = [];
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size));
  return pages;
}

// The main gallery as a carousel of grids. Every slide is in the page (so
// every photo is crawlable), but only the visible one loads its photos and
// takes focus; the rest sit off to the side, lazy and inert.
export function PhotoGrid() {
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [page, setPage] = useState(0);
  const size = usePageSize();
  const { open, lightbox } = useLightbox();
  // A swipe ends with a click on whichever tile it started on; skip that one.
  const swiped = useRef(false);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? galleryPhotos
        : galleryPhotos.filter((p) => p.category === filter),
    [filter],
  );
  const pages = useMemo(() => chunk(filtered, size), [filtered, size]);
  const count = pages.length;
  const current = Math.min(page, count - 1);

  const go = (by: number) => setPage((current + by + count) % count);

  return (
    <div className="mt-14 md:mt-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filter photos" className="flex flex-wrap gap-2">
          {galleryCategories.map((c) => {
            const active = c.id === filter;
            const total =
              c.id === "all"
                ? galleryPhotos.length
                : galleryPhotos.filter((p) => p.category === c.id).length;
            if (total === 0) return null;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(c.id);
                  setPage(0);
                }}
                className={`relative h-11 rounded-full border px-5 text-sm font-bold transition-colors ${
                  active
                    ? "border-gold text-navy"
                    : "border-white/20 text-white/80 hover:border-white/60 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="gallery-filter"
                    className="absolute inset-0 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {c.label}
                  <span className={active ? "text-navy/60" : "text-white/40"}> {total}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-white/60">Swipe or use the arrows · tap a photo to enlarge</p>
      </div>

      <motion.div
        role="region"
        aria-roledescription="carousel"
        aria-label="Academy photos"
        className="mt-8 touch-pan-y overflow-hidden"
        onPanStart={() => (swiped.current = true)}
        onPanEnd={(_, info) => {
          if (info.offset.x < -50 || info.velocity.x < -400) go(1);
          else if (info.offset.x > 50 || info.velocity.x > 400) go(-1);
          setTimeout(() => (swiped.current = false), 0);
        }}
      >
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {pages.map((photos, p) => (
            <ul
              key={`${filter}-${size}-${p}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Page ${p + 1} of ${count}`}
              inert={p !== current}
              className="grid w-full shrink-0 grid-cols-2 content-start gap-2 md:grid-cols-3 md:gap-3"
            >
              {photos.map((photo) => (
                <Tile
                  key={photo.src}
                  photo={photo}
                  onOpen={() => !swiped.current && open(filtered, photo)}
                />
              ))}
            </ul>
          ))}
        </div>
      </motion.div>

      {count > 1 && (
        <div className="mt-8 flex items-center justify-between gap-6">
          <p aria-live="polite" className="font-display text-2xl font-bold tabular-nums">
            {String(current + 1).padStart(2, "0")}
            <span className="text-white/40"> / {String(count).padStart(2, "0")}</span>
          </p>

          <div className="flex max-w-md flex-1 gap-1.5">
            {pages.map((_, p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Go to page ${p + 1}`}
                aria-current={p === current}
                className="h-6 flex-1 py-2.5"
              >
                <span
                  className={`block h-1 rounded-full transition-colors duration-500 ${
                    p === current ? "bg-gold" : "bg-white/20 hover:bg-white/50"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photos"
              className="grid size-12 place-items-center rounded-full border border-white/30 transition hover:bg-white hover:text-navy"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photos"
              className="grid size-12 place-items-center rounded-full border border-white/30 transition hover:bg-white hover:text-navy"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      )}

      {lightbox}
    </div>
  );
}

function Tile({ photo, onOpen }: { photo: GalleryPhoto; onOpen: () => void }) {
  return (
    <li className="aspect-square md:aspect-[4/3]">
      <button
        type="button"
        onClick={onOpen}
        draggable={false}
        className="group relative block size-full cursor-zoom-in overflow-hidden bg-navy-soft"
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          draggable={false}
          sizes="(min-width: 1280px) 410px, (min-width: 768px) 33vw, 50vw"
          placeholder={photo.blur}
          className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-focus-visible:scale-110"
        />
        <span className="gallery-shine" aria-hidden />
        <span className="absolute inset-0 bg-linear-to-t from-navy/90 via-navy/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <span className="absolute top-3 right-3 grid size-9 scale-50 -rotate-45 place-items-center rounded-full bg-white text-navy opacity-0 transition duration-500 group-hover:scale-100 group-hover:rotate-0 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
          <Expand aria-hidden className="size-4" />
        </span>
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 translate-y-4 p-4 text-left opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        >
          <span className="block text-[10px] font-bold tracking-[0.2em] text-gold uppercase">
            {categoryLabel[photo.category]}
          </span>
          <span className="mt-1 block text-sm leading-snug font-semibold">{photo.alt}</span>
        </span>
      </button>
    </li>
  );
}
