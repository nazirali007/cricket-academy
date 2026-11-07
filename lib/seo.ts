// Next.js replaces a parent page's openGraph settings rather than merging them,
// so every page that sets its own must include these too.
export const sharedOpenGraph = {
  type: "website" as const,
  locale: "en_IN",
  siteName: "CCS Cricket Academy",
  images: [
    {
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "CCS Cricket Academy, cricket academy in Lucknow",
    },
  ],
};

export const homeTitle =
  "CCS Cricket Academy | Best Cricket Academy & Stadium in Lucknow";
export const homeShareDescription =
  "Professional cricket training and an affordable cricket stadium to book in Lucknow. Join now.";
