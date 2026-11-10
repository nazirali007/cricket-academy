"use client";

import { useInView } from "motion/react";
import { getImageProps } from "next/image";
import { useRef } from "react";
import { TiltedGridHero } from "@/components/ui/tilted-grid-hero";
import { autoCarouselPhotos } from "@/lib/gallery";

// Each photo goes through the Next image optimiser at ~1080px instead of the
// 2000px original, since the band fetches them all up front.
const reel = autoCarouselPhotos.map((p) => ({
  src: getImageProps({ src: p.src, alt: p.alt, width: 480, height: 270 }).props.src,
  alt: p.alt,
}));

const height = "h-[240px] sm:h-[320px] md:h-[440px]";

// Team photos curving round in a slow, endless loop.
export function CurvedReel() {
  const ref = useRef<HTMLDivElement>(null);
  // Mount (and start fetching photos) only as the band nears the screen.
  const near = useInView(ref, { once: true, margin: "400px 0px" });

  return (
    <div ref={ref}>
      {near ? (
        <TiltedGridHero
          images={reel}
          speed={3.5}
          tileHeight={46}
          axis={50}
          curve={70}
          fade={10}
          className={`w-full ${height}`}
        />
      ) : (
        <div className={height} />
      )}
    </div>
  );
}
