import type { Metadata } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { MotionProvider } from "@/components/site/reveal";
import { programs } from "@/lib/content";
import { carouselPhotos } from "@/lib/gallery";
import { homeShareDescription, homeTitle, sharedOpenGraph } from "@/lib/seo";
import {
  bookingPhone,
  businessId,
  contact,
  mapsUrl,
  siteUrl,
  stadiumPagePath,
} from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const description =
  "CCS Cricket Academy is the best cricket academy in Lucknow (LKO), with professional coaching, match practice and an affordable cricket stadium to book online.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: homeTitle,
    template: "%s | CCS Cricket Academy Lucknow",
  },
  description,
  keywords: [
    "cricket academy in lucknow",
    "lucknow cricket academy",
    "best cricket academy in lucknow",
    "top cricket academy in lucknow",
    "cricket academy lucknow fees",
    "cricket academy lucknow admission",
    "cricket coaching in lucknow",
    "cricket coaching classes lucknow",
    "cricket training lucknow",
    "cricket coach lucknow",
    "cricket academy for kids lucknow",
    "cricket coaching for adults lucknow",
    "cricket academy near me",
    "cricket academy chinhat",
    "cricket academy chinhat lucknow",
    "cricket academy satrikh road",
    "best cricket academy lko",
    "cricket academy in uttar pradesh",
    "cricket stadium in lucknow",
    "best cricket stadium in lucknow",
    "affordable cricket stadium lucknow",
    "cricket ground in lucknow",
    "cricket ground booking lucknow",
    "cricket ground on rent lucknow",
    "corporate cricket match ground lucknow",
    "CCS Cricket Academy",
    "CCS Academy Lucknow",
  ],
  openGraph: {
    ...sharedOpenGraph,
    title: homeTitle,
    description: homeShareDescription,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SportsActivityLocation", "SportsOrganization"],
  "@id": businessId,
  name: "CCS Cricket Academy",
  alternateName: ["CCS Academy", "CCS Cricket Academy Lucknow"],
  description,
  foundingDate: "2026",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  image: [
    `${siteUrl}/og-image.jpg`,
    ...carouselPhotos.slice(0, 3).map((p) => `${siteUrl}${p.src}`),
  ],
  email: contact.email,
  telephone: bookingPhone.replace(/\s/g, ""),
  priceRange: "₹5,000 - ₹15,000",
  hasMap: mapsUrl,
  sport: "Cricket",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Satrikh Road, Near Amor, Opp. Nayra Petrol Pump, Chinhat",
    addressLocality: "Lucknow",
    addressRegion: "Uttar Pradesh",
    postalCode: "226028",
    addressCountry: "IN",
  },
  areaServed: { "@type": "City", name: "Lucknow" },
  knowsAbout: ["Cricket coaching", "Cricket training", "Cricket ground booking"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Cricket coaching and ground booking",
    itemListElement: [
      ...programs.map((program) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: `Cricket coaching for ${program.title.toLowerCase()} in Lucknow`,
          description: program.text,
        },
      })),
      {
        "@type": "Offer",
        url: `${siteUrl}${stadiumPagePath}`,
        itemOffered: {
          "@type": "Service",
          name: "Cricket stadium booking in Lucknow",
        },
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <MotionProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
