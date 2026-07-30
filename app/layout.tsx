import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Food Decision Engine",
  description:
    "Erklaerbare Produktvergleiche, Rankings und Scores fuer bessere Einkaufsentscheidungen.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Food Decision Engine",
    description:
      "Entscheidungshilfe fuer Lebensmittel mit nachvollziehbaren Scores und Datenqualitaet.",
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
      <body>{children}</body>
    </html>
  );
}
