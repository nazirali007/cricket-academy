import Image from "next/image";
import { gallery } from "@/lib/content";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

export function Gallery() {
  return (
    <section id="gallery" className="bg-navy py-24 text-white md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Eyebrow onDark>Gallery</Eyebrow>
          <Heading>Life at the academy.</Heading>
        </Reveal>

        <ul className="mt-14 grid auto-rows-[220px] gap-3 sm:grid-cols-2 md:mt-20 md:auto-rows-[260px] md:grid-cols-3">
          {gallery.map((item, i) => (
            <li key={item.caption} className={item.span}>
              <Reveal delay={i * 0.06} className="h-full">
                <figure className="group relative h-full overflow-hidden">
                  {item.photo ? (
                    <Image
                      src={item.photo}
                      alt={item.caption}
                      fill
                      sizes="(min-width: 768px) 66vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="field-stripes h-full transition-transform duration-700 group-hover:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-navy/85 via-transparent to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                    <span className="font-display text-2xl font-bold uppercase md:text-3xl">
                      {item.caption}
                    </span>
                    {!item.photo && (
                      <span className="pb-1 text-xs whitespace-nowrap text-white/70">
                        Photo coming soon
                      </span>
                    )}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
