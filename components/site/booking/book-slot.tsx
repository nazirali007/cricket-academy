import { Reveal } from "../reveal";
import { Eyebrow, Heading } from "../ui";
import { RateChart } from "./rate-chart";
import { SlotPicker } from "./slot-picker";

export function BookSlot() {
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
            For corporate matches, clubs and private games. See what&apos;s free
            on any date and book it online in a minute.
          </p>
        </Reveal>

        <Reveal className="mt-12 md:mt-16">
          <SlotPicker />
        </Reveal>

        <RateChart />
      </div>
    </section>
  );
}
