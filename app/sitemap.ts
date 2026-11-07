import type { MetadataRoute } from "next";
import { siteUrl, stadiumPagePath } from "@/lib/site";

// Add each new public page here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl },
    { url: `${siteUrl}${stadiumPagePath}` },
    { url: `${siteUrl}/terms` },
    { url: `${siteUrl}/privacy` },
    { url: `${siteUrl}/refund-policy` },
  ];
}
