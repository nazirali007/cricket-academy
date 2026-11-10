"use client";

import { Expand, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  categoryLabel,
  galleryCategories,
  galleryPhotos,
  type GalleryCategory,
} from "@/lib/gallery";
import { useLightbox } from "./use-lightbox";

const ease = [0.16, 1, 0.3, 1] as const;
const PAGE = 12;

// Every 12 tiles: one big tile and one wide tile, so the grid fills evenly.
function tileSpan(i: number) {
  if (i % PAGE === 0) return "col-span-2 row-span-2";
  if (i % PAGE === 7) return "col-span-2";
  return "";
}

// Filterable bento grid. Tiles animate in as they scroll into view and
// rearrange smoothly when the filter changes.
export function PhotoGrid() {
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const { open, lightbox } = useLightbox();

  const filtered = useMemo(
    () =>
      filter === "all"
        ? galleryPhotos
        : galleryPhotos.filter((p) => p.category === filter),
    [filter],
  );
  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;

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
                  setShown(PAGE);
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
        <p className="text-sm text-white/60">Tap any photo to view it full screen</p>
      </div>

      <motion.ul
        layout
        className="mt-8 grid auto-rows-[150px] grid-flow-dense grid-cols-2 gap-2 sm:auto-rows-[200px] md:grid-cols-4 md:gap-3 lg:auto-rows-[230px]"
      >
        <AnimatePresence mode="popLayout">
          {visible.map((photo, i) => (
            <motion.li
              key={photo.src}
              layout
              className={tileSpan(i)}
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.7, delay: (i % PAGE) * 0.04, ease }}
            >
              <button
                type="button"
                onClick={() => open(filtered, photo)}
                className="group relative block size-full cursor-zoom-in overflow-hidden bg-navy-soft"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes={
                    tileSpan(i).includes("row-span-2")
                      ? "(min-width: 768px) 50vw, 100vw"
                      : "(min-width: 768px) 25vw, 50vw"
                  }
                  placeholder={photo.blur}
                  className="object-cover transition-[transform,filter] duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-focus-visible:scale-110"
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
                  <span className="mt-1 block text-sm leading-snug font-semibold">
                    {photo.alt}
                  </span>
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {remaining > 0 && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="group flex h-13 items-center gap-3 rounded-full border border-white/25 px-7 text-sm font-bold transition-colors hover:border-gold hover:bg-gold hover:text-navy"
          >
            <Plus aria-hidden className="size-4 transition-transform duration-300 group-hover:rotate-90" />
            Show {Math.min(PAGE, remaining)} more photos
            <span className="text-white/50 group-hover:text-navy/60">({remaining} left)</span>
          </button>
        </div>
      )}

      {lightbox}
    </div>
  );
}
