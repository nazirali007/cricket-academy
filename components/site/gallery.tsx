import { galleryPhotos } from "@/lib/gallery";
import { PhotoGrid } from "./gallery/photo-grid";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

// The main gallery: every photo not already shown in "Teams" or "Match day".
export function Gallery() {
  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="relative overflow-hidden bg-navy py-24 text-white md:py-36"
    >
      <div aria-hidden className="gallery-glow pointer-events-none absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <Reveal>
            <Eyebrow onDark>Gallery</Eyebrow>
            <Heading>
              <span id="gallery-heading">
                Life at the academy.
                <span className="block text-outline">Match day, captured.</span>
              </span>
            </Heading>
          </Reveal>
          <Reveal delay={0.15} className="max-w-sm">
            <p className="text-white/70">
              Matches, celebrations and award ceremonies at CCS Cricket Academy,
              our cricket ground on Satrikh Road, Chinhat, Lucknow.
            </p>
            <p className="mt-4 font-display text-5xl font-bold text-gold">
              {galleryPhotos.length}
              <span className="ml-2 text-base font-bold tracking-[0.2em] text-white/60 uppercase">
                photos
              </span>
            </p>
          </Reveal>
        </div>

        <PhotoGrid />
      </div>
    </section>
  );
}
