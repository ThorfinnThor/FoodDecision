import type { MetadataRoute } from "next";
import { getCategories, products } from "@/lib/data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-decision-engine.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/finder`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...getCategories().map((category) => ({
      url: `${siteUrl}/category/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products
      .filter((product) => product.publishability === "published" || product.publishability === "ranking_eligible")
      .map((product) => ({
        url: `${siteUrl}/product/${product.slug}`,
        lastModified: new Date(product.importedAt),
        changeFrequency: "monthly" as const,
        priority: 0.65,
      })),
  ];
}
