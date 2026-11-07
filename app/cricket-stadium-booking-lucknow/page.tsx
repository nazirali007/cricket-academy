import { MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookSlot } from "@/components/site/booking/book-slot";
import { Reveal } from "@/components/site/reveal";
import { CtaLink, Eyebrow, Heading } from "@/components/site/ui";
import {
  BALL_PRICE,
  formatRupees,
  MAX_DAYS_AHEAD,
  UMPIRES_PRICE,
  weekdaySlots,
  weekendSlots,
} from "@/lib/booking";
import { sharedOpenGraph } from "@/lib/seo";
import {
  bookingPhone,
  businessId,
  contact,
  mapsUrl,
  siteUrl,
  stadiumPagePath,
} from "@/lib/site";

const PATH = stadiumPagePath;
const rates = [...weekdaySlots, ...weekendSlots].map((slot) => slot.rate);
const lowest = Math.min(...rates);
const highest = Math.max(...rates);
const title = `Book a Cricket Stadium in Lucknow from ${formatRupees(lowest)} | CCS Academy`;
const description = `Book an affordable cricket stadium in Lucknow for corporate, club and private matches. Slots from ${formatRupees(lowest)} at Satrikh Road, Chinhat. Check live availability.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [
    "cricket stadium in lucknow",
    "best cricket stadium in lucknow",
    "affordable cricket stadium lucknow",
    "cricket stadium booking lucknow",
    "cricket ground booking lucknow",
    "cricket ground on rent lucknow",
    "corporate cricket match ground lucknow",
    "cricket ground chinhat lucknow",
  ],
  alternates: { canonical: PATH },
  openGraph: {
    ...sharedOpenGraph,
    url: PATH,
    title,
    description,
  },
};

const rateList = (slots: typeof weekdaySlots) =>
  slots
    .map((slot) => `${slot.name} ${slot.timing}: ${formatRupees(slot.rate)}`)
    .join("; ");

const faqs = [
  {
    question: "How much does it cost to book the cricket stadium in Lucknow?",
    answer: `Rates start at ${formatRupees(lowest)} and go up to ${formatRupees(highest)}, depending on the day and time. Monday to Friday: ${rateList(weekdaySlots)}. Saturday and Sunday: ${rateList(weekendSlots)}.`,
  },
  {
    question: "Where is the cricket stadium located?",
    answer: `CCS Academy is at ${contact.address.replace(/\n/g, " ")}`,
  },
  {
    question: "Can I book the ground for a corporate match or at night?",
    answer:
      "Yes. Companies, clubs and private groups can all book, and there are morning, evening and night slots every day, plus an afternoon slot on weekends.",
  },
  {
    question: "Do the rates include umpires and match balls?",
    answer: `No. Rates are without umpire and without ball. You can add match balls at ${formatRupees(BALL_PRICE)} per ball and 2 umpires for ${formatRupees(UMPIRES_PRICE)} per match while booking.`,
  },
  {
    question: "How do I book a slot?",
    answer: `Choose a date and a green Available slot on this page, add any extras, then enter your name and mobile number. You can book up to ${MAX_DAYS_AHEAD} days ahead, or call ${bookingPhone}.`,
  },
  {
    question: "What are the rules at the ground?",
    answer:
      "Smoking, tobacco and gutkha are not allowed at the ground. A canteen is available inside.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Cricket Stadium Booking in Lucknow",
      serviceType: "Cricket ground and stadium hire",
      description,
      url: `${siteUrl}${PATH}`,
      provider: { "@id": businessId },
      areaServed: { "@type": "City", name: "Lucknow" },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: lowest,
        highPrice: highest,
        offerCount: rates.length,
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        {
          "@type": "ListItem",
          position: 2,
          name: "Cricket Stadium Booking",
          item: `${siteUrl}${PATH}`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

const audiences = [
  {
    title: "Corporate matches",
    text: "Book the ground for office tournaments and team days, with slots after work and on weekends.",
  },
  {
    title: "Clubs and teams",
    text: "A real cricket field for club fixtures and practice matches, with umpires and match balls available.",
  },
  {
    title: "Private games",
    text: "Play with friends and family at a time that suits you, from morning to late at night.",
  },
];

export default function CricketStadiumBookingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="bg-navy pt-36 pb-20 text-white md:pt-44 md:pb-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-white/70">
            <Link href="/" className="underline-offset-4 hover:underline">
              Home
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span aria-current="page">Cricket Stadium Booking</span>
          </nav>
          <h1 className="max-w-5xl font-display text-[clamp(3.25rem,9vw,6.5rem)] leading-[0.95] font-bold tracking-tight uppercase">
            Cricket stadium booking in Lucknow
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/85">
            Looking for an affordable cricket stadium in Lucknow? Book the CCS
            Academy ground at Satrikh Road, Chinhat, for corporate matches, club
            games and private events. Slots start at {formatRupees(lowest)}, and
            you can see what&apos;s available on any date before you book.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <CtaLink href="#pick-a-slot">Check availability</CtaLink>
            <CtaLink href="#faq" variant="ghost">
              Read common questions
            </CtaLink>
          </div>
        </div>
      </div>

      <BookSlot />

      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Eyebrow>Who it&apos;s for</Eyebrow>
            <Heading>A ground for every kind of match.</Heading>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {audiences.map((audience, i) => (
              <Reveal key={audience.title} delay={i * 0.08}>
                <div className="border-t-2 border-navy pt-5">
                  <h3 className="font-display text-3xl font-bold uppercase">
                    {audience.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {audience.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-mist py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <Reveal>
            <Eyebrow>Common questions</Eyebrow>
            <Heading>Before you book.</Heading>
          </Reveal>
          <div className="divide-y divide-navy/20 border-y border-navy/20">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-8 text-lg font-bold marker:hidden">
                  <h3 className="inline">{faq.question}</h3>
                </summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-bold uppercase md:text-5xl">
              Find the stadium
            </h2>
            <p className="mt-5 flex gap-3 leading-relaxed text-white/85">
              <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-gold" />
              <span className="whitespace-pre-line">{contact.address}</span>
            </p>
            <a
              href={`tel:${bookingPhone.replace(/\s/g, "")}`}
              className="mt-4 flex items-center gap-3 font-display text-3xl font-bold hover:text-gold"
            >
              <Phone aria-hidden className="size-5 shrink-0 text-gold" />
              {bookingPhone}
            </a>
          </div>
          <div className="flex flex-col gap-4 lg:items-end">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center justify-center bg-ball px-7 text-sm font-bold text-white transition-colors hover:bg-[#a81f18]"
            >
              Get directions
            </a>
            <Link href="/" className="font-semibold underline underline-offset-4">
              Looking for coaching? See CCS Cricket Academy
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
