import Link from "next/link";
import { carouselPhotos } from "@/lib/gallery";
import { stadiumPagePath } from "@/lib/site";
import { Spotlight } from "./gallery/spotlight";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

// The match-day slideshow, right after "Book a slot": shows the ground
// people have just been looking at booking.
export function MatchDay() {
  return (
    <section
      id="match-day"
      aria-labelledby="match-day-heading"
      className="bg-navy pb-24 text-white md:pb-36"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6 border-t border-white/10 pt-20 md:pt-28">
          <div>
            <Eyebrow onDark>Match day</Eyebrow>
            <Heading>
              <span id="match-day-heading">See the ground in action.</span>
            </Heading>
          </div>
          <div className="max-w-sm">
            <p className="text-lg leading-relaxed text-white/75">
              Real matches on our cricket ground in Chinhat, Lucknow. The same
              pitch and outfield you can book for your team.
            </p>
            <Link
              href={stadiumPagePath}
              className="mt-4 inline-block font-semibold text-gold underline underline-offset-4"
            >
              Cricket stadium booking in Lucknow
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 md:mt-16">
          <Spotlight photos={carouselPhotos} />
        </div>
      </div>
    </section>
  );
}
