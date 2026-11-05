import { Dumbbell, GraduationCap, Target, Trophy } from "lucide-react";
import { facilities } from "@/lib/content";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

const icons = {
  target: Target,
  coach: GraduationCap,
  fitness: Dumbbell,
  match: Trophy,
};

export function Facilities() {
  return (
    <section id="facilities" className="bg-navy py-24 text-white md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Eyebrow onDark>Facilities</Eyebrow>
          <Heading>Everything a serious cricketer needs.</Heading>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Built for players aiming for state-level and international cricket.
          </p>
        </Reveal>

        <ul className="mt-14 grid gap-px bg-white/12 md:mt-20 md:grid-cols-2">
          {facilities.map((facility, i) => {
            const Icon = icons[facility.icon];
            return (
              <li key={facility.title} className="bg-navy">
                <Reveal delay={i * 0.08} className="h-full">
                  <article className="group relative h-full overflow-hidden p-8 transition-colors duration-500 hover:bg-navy-soft md:p-12">
                    <div className="flex items-start justify-between">
                      <Icon
                        aria-hidden
                        strokeWidth={1.4}
                        className="size-11 text-ball-light transition-transform duration-500 group-hover:-translate-y-1"
                      />
                      <span
                        aria-hidden
                        className="font-display text-xl font-semibold text-white/35"
                      >
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-14 font-display text-4xl font-bold uppercase md:text-5xl">
                      {facility.title}
                    </h3>
                    <p className="mt-4 max-w-md leading-relaxed text-white/75">
                      {facility.text}
                    </p>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
