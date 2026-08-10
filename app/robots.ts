import type { MetadataRoute } from "next";
import { aiCrawlerPolicy } from "@/lib/geo";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiCrawlerPolicy.search.map((userAgent) => ({ userAgent, allow: "/" })),
      ...aiCrawlerPolicy.training.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
