import type { Metadata } from "next";
import { About } from "@/components/site/about";
import { Admission } from "@/components/site/admission";
import { BookSlot } from "@/components/site/booking/book-slot";
import { Contact } from "@/components/site/contact";
import { Facilities } from "@/components/site/facilities";
import { Gallery } from "@/components/site/gallery";
import { Hero } from "@/components/site/hero";
import { MatchDay } from "@/components/site/match-day";
import { Teams } from "@/components/site/teams";
import { Ticker } from "@/components/site/ticker";
import { homeShareDescription, homeTitle, sharedOpenGraph } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    ...sharedOpenGraph,
    url: "/",
    title: homeTitle,
    description: homeShareDescription,
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <About />
      <Teams />
      <Facilities />
      <BookSlot showPageLink />
      <MatchDay />
      <Admission />
      <Gallery />
      <Contact />
    </>
  );
}
