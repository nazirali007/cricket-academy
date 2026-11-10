"use client";

import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";
import type { GalleryPhoto } from "@/lib/gallery";
import { Lightbox } from "./lightbox";

type Viewer = { photos: GalleryPhoto[]; index: number; direction: number };

// Full-screen viewer state for one section. `open` shows a photo and lets the
// visitor page through the list it came from; render `lightbox` once.
export function useLightbox() {
  const [viewer, setViewer] = useState<Viewer | null>(null);

  const open = useCallback((photos: GalleryPhoto[], photo: GalleryPhoto) => {
    setViewer({ photos, index: photos.indexOf(photo), direction: 0 });
  }, []);
  const change = useCallback(
    (index: number, direction: number) =>
      setViewer((v) => (v ? { ...v, index, direction } : v)),
    [],
  );
  const close = useCallback(() => setViewer(null), []);

  const lightbox = (
    <AnimatePresence>
      {viewer && (
        <Lightbox
          photos={viewer.photos}
          index={viewer.index}
          direction={viewer.direction}
          onChange={change}
          onClose={close}
        />
      )}
    </AnimatePresence>
  );

  return { open, lightbox };
}
