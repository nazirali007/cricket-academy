import { programs, steps } from "@/lib/content";
import { JoinForm } from "./join-form";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

export function Admission() {
  return (
    <section id="admission" className="bg-cream py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow>Admission</Eyebrow>
            <Heading>Start your journey with us.</Heading>
          </Reveal>

          <ol className="mt-12 space-y-8">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={i * 0.08} className="flex gap-5">
                  <span className="grid size-11 shrink-0 place-items-center bg-navy font-display text-xl font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl font-bold uppercase">
                      {step.title}
                    </h3>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {programs.map((program, i) => (
              <Reveal key={program.title} delay={i * 0.08}>
                <div className="h-full border-t-2 border-ball bg-white p-6">
                  <h3 className="font-display text-3xl font-bold uppercase">
                    {program.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {program.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div id="join" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.1}>
            <JoinForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
