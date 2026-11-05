"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

function Wicket() {
  return (
    <span aria-hidden className="flex h-12 items-end gap-1">
      <span className="h-full w-0.5 bg-navy" />
      <span className="h-full w-0.5 bg-navy" />
      <span className="h-full w-0.5 bg-navy" />
    </span>
  );
}

// A ball travels from one wicket to the other as the visitor scrolls past.
export function PitchTrack() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "start 35%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.4,
  });
  const left = useTransform(progress, [0, 1], ["0%", "100%"]);
  const rotate = useTransform(progress, [0, 1], [0, 720]);

  return (
    <div ref={ref} className="flex items-end gap-4" aria-hidden>
      <Wicket />
      <div className="relative mb-px h-0.5 flex-1 bg-navy/15">
        <motion.span
          className="absolute inset-y-0 left-0 origin-left bg-ball"
          style={{ width: left }}
        />
        <motion.span
          className="absolute top-1/2 -mt-2.5 -ml-2.5 size-5 rounded-full bg-ball shadow-[0_6px_16px_rgb(201_40_31/0.45)]"
          style={{ left, rotate }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px bg-cream/80" />
        </motion.span>
      </div>
      <Wicket />
    </div>
  );
}
