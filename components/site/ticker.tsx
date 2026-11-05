import { ticker } from "@/lib/content";

export function Ticker() {
  // The animation moves by half the width, so both halves must match for the
  // loop to have no visible seam. Four copies keep wide screens filled.
  const items = [...ticker, ...ticker, ...ticker, ...ticker];

  return (
    <div
      aria-label={ticker.join(", ")}
      role="img"
      className="overflow-hidden bg-ball py-4 text-white"
    >
      <div className="marquee flex w-max items-center">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center font-display text-xl font-semibold tracking-wide whitespace-nowrap uppercase"
          >
            {item}
            <span aria-hidden className="mx-7 size-1.5 rounded-full bg-white/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
