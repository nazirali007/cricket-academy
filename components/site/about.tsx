import { pillars } from "@/lib/content";
import { PitchTrack } from "./pitch-track";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

export function About() {
  return (
    <section id="about" className="bg-cream py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.25fr_1fr] md:items-end md:gap-20">
          <Reveal>
            <Eyebrow>About us</Eyebrow>
            <Heading>Every game is decided over 22 yards.</Heading>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg leading-relaxed text-muted-foreground">
              CCS Cricket Academy, established in 2026 at Chinhat, Lucknow, is
              dedicated to developing young and aspiring cricketers through
              professional cricket coaching, discipline, and a strong
              foundation in the game. Our
              mission is to nurture talent and help players reach their full
              potential with the right guidance and support.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 md:mt-24">
          <PitchTrack />
          <p className="mt-3 text-center text-xs font-bold tracking-[0.22em] text-muted-foreground uppercase">
            22 yards
          </p>
        </div>

        <div className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-12">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 0.1}>
              <div className="border-t-2 border-navy pt-5">
                <h3 className="font-display text-3xl font-bold uppercase">
                  {pillar.title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {pillar.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
