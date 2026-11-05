import type { Metadata } from "next";
import { About } from "@/components/site/about";
import { Admission } from "@/components/site/admission";
import { BookSlot } from "@/components/site/booking/book-slot";
import { Contact } from "@/components/site/contact";
import { Facilities } from "@/components/site/facilities";
import { Gallery } from "@/components/site/gallery";
import { Hero } from "@/components/site/hero";
import { Members } from "@/components/site/members";
import { Ticker } from "@/components/site/ticker";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <About />
      <Members />
      <Facilities />
      <BookSlot />
      <Admission />
      <Gallery />
      <Contact />
    </>
  );
}
