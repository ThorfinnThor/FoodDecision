import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self'${isDevelopment ? " ws: http:" : ""}`,
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: blob: https://images.openfoodfacts.org https://static.openfoodfacts.org",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
    webpackBuildWorker: false,
    workerThreads: true,
  },
  async headers() {
    const scannerPermissions = [{ key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/de/scan", headers: scannerPermissions },
      { source: "/en-us/scan", headers: scannerPermissions },
    ];
  },
  async redirects() {
    const prefixes = ["best", "brand", "category", "compare", "favorites", "finder", "ingredient", "methodology", "nutrition", "preferences", "privacy", "product", "products", "scan", "shopping-list"];
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
