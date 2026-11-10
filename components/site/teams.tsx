import { CurvedReel } from "./gallery/curved-reel";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

// The curved auto-carousel of team photos, right after "Members".
export function Teams() {
  return (
    <section
      id="teams"
      aria-labelledby="teams-heading"
      className="overflow-hidden bg-cream pt-24 pb-16 md:pt-36 md:pb-24"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Our teams</Eyebrow>
            <Heading>
              <span id="teams-heading">Squads that play on our ground.</span>
            </Heading>
          </div>
          <p className="max-w-sm text-lg leading-relaxed text-muted-foreground">
            Teams and players at tournaments on the CCS Academy cricket ground
            in Chinhat, Lucknow.
          </p>
        </Reveal>
      </div>

      {/* Full width, so the curve runs edge to edge. */}
      <div className="mt-10 md:mt-14">
        <CurvedReel />
      </div>
    </section>
  );
}
