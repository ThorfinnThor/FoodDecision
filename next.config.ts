import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const prefixes = ["best", "brand", "category", "compare", "favorites", "finder", "ingredient", "methodology", "nutrition", "preferences", "product", "products", "scan", "shopping-list"];
    return [
      ...prefixes.map((prefix) => ({ source: `/${prefix}/:path*`, destination: `/de/${prefix}/:path*`, permanent: true })),
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "static.openfoodfacts.org" },
    ],
  },
};

export default nextConfig;
