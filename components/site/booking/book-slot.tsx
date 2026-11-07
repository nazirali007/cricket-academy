import Link from "next/link";
import { stadiumPagePath } from "@/lib/site";
import { Reveal } from "../reveal";
import { Eyebrow, Heading } from "../ui";
import { RateChart } from "./rate-chart";
import { BookingApp } from "./booking-app";

export function BookSlot({ showPageLink = false }: { showPageLink?: boolean }) {
  return (
    <section
      id="book"
      className="bg-[linear-gradient(180deg,#0c3327_0%,#071a2c_55%)] py-24 text-white md:py-36"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Eyebrow onDark>Cricket Ground Match Booking</Eyebrow>
          <Heading>Your match. Our ground. Pick your slot.</Heading>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
            For corporate matches, clubs and private games at our cricket
            stadium in Lucknow. Pick one or more free slots, check the total and
            pay online in a few minutes.
          </p>
          {showPageLink && (
            <Link
              href={stadiumPagePath}
              className="mt-4 inline-block font-semibold text-gold underline underline-offset-4"
            >
              More about cricket stadium booking in Lucknow
            </Link>
          )}
        </Reveal>

        <Reveal className="mt-12 md:mt-16">
          <BookingApp />
        </Reveal>

        <RateChart />
      </div>
    </section>
  );
}
