import type { MetadataRoute } from "next";
import { allPhotos } from "@/lib/gallery";
import { siteUrl, stadiumPagePath } from "@/lib/site";

// Add each new public page here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Lists every photo on the home page so they can show in image search.
    { url: siteUrl, images: allPhotos.map((p) => `${siteUrl}${p.src}`) },
    { url: `${siteUrl}${stadiumPagePath}` },
    { url: `${siteUrl}/terms` },
    { url: `${siteUrl}/privacy` },
    { url: `${siteUrl}/refund-policy` },
  ];
}
