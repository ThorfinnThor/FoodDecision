import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Food Decision Engine",
  description:
    "Erklärbare Produktvergleiche, Rankings und Scores für bessere Einkaufsentscheidungen.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Food Decision Engine",
    description:
      "Entscheidungshilfe für Lebensmittel mit nachvollziehbaren Scores und Datenqualität.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}<SiteFooter /></body>
    </html>
  );
}
