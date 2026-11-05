import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Add each new public page here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl }];
}
