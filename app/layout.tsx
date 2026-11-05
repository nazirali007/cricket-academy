import type { Metadata } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { MotionProvider } from "@/components/site/reveal";
import { contact, siteUrl } from "@/lib/site";
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
  "CCS Cricket Academy is the best cricket academy in Lucknow (LKO), offering professional coaching on a real cricket field, fitness training and match practice for young and aspiring cricketers. Join now!";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CCS Cricket Academy | Best Cricket Academy in Lucknow",
    template: "%s | CCS Cricket Academy Lucknow",
  },
  description,
  keywords: [
    "best cricket academy in lucknow",
    "best academy in lucknow",
    "best cricket academy lko",
    "cricket coaching lucknow",
    "cricket academy near me",
    "CCS Cricket Academy",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "CCS Cricket Academy",
    title: "CCS Cricket Academy | Best Cricket Academy in Lucknow",
    description:
      "Professional cricket training on a real cricket field in Lucknow. Join now.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CCS Cricket Academy, cricket academy in Lucknow",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: "CCS Cricket Academy",
  description,
  foundingDate: "2026",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  image: `${siteUrl}/og-image.jpg`,
  email: contact.email,
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
