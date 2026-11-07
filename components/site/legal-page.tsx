import type { ReactNode } from "react";

export const LEGAL_UPDATED = "7 November 2026";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="bg-navy pt-32 pb-12 text-white">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <h1 className="font-display text-5xl font-bold uppercase md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">{intro}</p>
          <p className="mt-3 text-sm text-white/60">Last updated: {LEGAL_UPDATED}</p>
        </div>
      </div>
      <div className="bg-cream py-14 md:py-20">
        <article className="mx-auto max-w-3xl space-y-4 px-5 leading-relaxed text-navy md:px-8 [&_a]:font-semibold [&_a]:underline [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:uppercase [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
          {children}
        </article>
      </div>
    </>
  );
}
