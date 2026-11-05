import { Parallax } from "./reveal";
import { CtaLink, Logo } from "./ui";

const headline = ["Cricket coaching", "in Lucknow,", "taken seriously."];

function Floodlight({ x, height }: { x: number; height: number }) {
  const top = 440 - height;
  return (
    <g>
      <circle
        className="flood-pulse"
        cx={x}
        cy={top}
        r="170"
        fill="url(#flood-glow)"
      />
      <rect x={x - 2} y={top} width="4" height={height} fill="#16324a" />
      <rect x={x - 32} y={top - 14} width="64" height="20" fill="#fbf6e4" />
    </g>
  );
}

function Stumps({
  x,
  y,
  height,
  gap,
  width,
}: {
  x: number;
  y: number;
  height: number;
  gap: number;
  width: number;
}) {
  return (
    <g fill="#f6f3ec">
      {[-gap, 0, gap].map((offset) => (
        <rect
          key={offset}
          x={x + offset - width / 2}
          y={y}
          width={width}
          height={height}
        />
      ))}
      <rect
        x={x - gap}
        y={y - width}
        width={gap * 2}
        height={width * 0.8}
        fill="#f6f3ec"
      />
    </g>
  );
}

// An original illustration: a floodlit ground seen from behind the stumps.
function GroundArt() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050f1b" />
          <stop offset="1" stopColor="#123650" />
        </linearGradient>
        <radialGradient id="flood-glow">
          <stop offset="0" stopColor="#fff5d6" stopOpacity="0.75" />
          <stop offset="0.3" stopColor="#ffeeb8" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffeeb8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="outfield" cx="0.65" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#3e8558" />
          <stop offset="0.6" stopColor="#1d4f36" />
          <stop offset="1" stopColor="#0b2a22" />
        </radialGradient>
        <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8b98a" />
          <stop offset="1" stopColor="#a8986b" />
        </linearGradient>
        <radialGradient id="ball-glow">
          <stop offset="0" stopColor="#ff7b6e" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ff7b6e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="900" fill="url(#sky)" />

      <Floodlight x={250} height={330} />
      <Floodlight x={650} height={290} />
      <Floodlight x={1110} height={300} />
      <Floodlight x={1370} height={345} />

      {/* Stands */}
      <path
        d="M0 395 Q720 335 1440 395 V480 H0Z"
        fill="#0a2031"
      />
      <path
        d="M0 428 Q720 380 1440 428"
        fill="none"
        stroke="#d7e2ea"
        strokeOpacity="0.16"
        strokeWidth="10"
        strokeDasharray="3 9"
      />

      {/* Outfield with mown stripes */}
      <rect y="450" width="1440" height="450" fill="url(#outfield)" />
      <g fill="#ffffff" opacity="0.035">
        <path d="M945 450 L180 900 H0 V810 L740 450Z" />
        <path d="M945 450 L1040 450 L1440 760 V900 H1250Z" />
      </g>
      <path
        d="M0 490 Q720 440 1440 490"
        fill="none"
        stroke="#f6f3ec"
        strokeOpacity="0.5"
        strokeWidth="2"
      />

      {/* Pitch */}
      <path d="M905 505 H985 L1190 900 H690Z" fill="url(#pitch)" />
      <g stroke="#f6f3ec" strokeWidth="3" fill="none">
        <path d="M890 528 H1000" />
        <path d="M625 815 H1255" strokeWidth="5" />
      </g>

      <Stumps x={945} y={486} height={36} gap={9} width={3} />
      <Stumps x={945} y={690} height={125} gap={34} width={9} />

      {/* The ball, bowled down the pitch on a loop */}
      <g className="delivery">
        <circle r="26" fill="url(#ball-glow)" />
        <circle r="9" fill="#c9281f" />
        <path
          d="M-3 -8.4 C-1 -3 -1 3 -3 8.4"
          stroke="#f6f3ec"
          strokeWidth="1"
          fill="none"
        />
      </g>
    </svg>
  );
}

export function Hero() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-navy pt-28 text-white"
    >
      <Parallax className="absolute -inset-y-[8%] -z-20 max-md:left-[-104%] max-md:w-[204%] md:inset-x-0">
        <GroundArt />
      </Parallax>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(7_26_44/0.92)_0%,rgb(7_26_44/0.62)_42%,transparent_72%)] max-md:bg-[linear-gradient(180deg,rgb(7_26_44/0.8)_0%,rgb(7_26_44/0.74)_60%,rgb(7_26_44/0.62)_100%)]"
      />

      <div className="mx-auto w-full max-w-7xl px-5 pb-16 md:px-8 md:pb-24">
        <div className="fade-up mb-6">
          <Logo width={110} />
        </div>
        <p
          className="fade-up mb-6 text-xs font-bold tracking-[0.22em] text-ball-light uppercase"
          style={{ animationDelay: "0.1s" }}
        >
          CCS Cricket Academy · Est. 2026
        </p>
        <h1 className="font-display text-[clamp(3.25rem,10vw,6.75rem)] leading-[0.92] font-bold tracking-tight uppercase">
          {headline.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-1">
              <span
                className="rise block"
                style={{ animationDelay: `${0.15 + i * 0.12}s` }}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>
        <p
          className="fade-up mt-7 max-w-xl text-base leading-relaxed text-white/85 md:text-lg"
          style={{ animationDelay: "0.6s" }}
        >
          Professional training, discipline and a strong foundation in the game,
          on a real cricket field.
        </p>
        <div
          className="fade-up mt-9 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: "0.75s" }}
        >
          <CtaLink href="#join">Join Now</CtaLink>
          <CtaLink href="#facilities" variant="ghost">
            See our facilities
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
