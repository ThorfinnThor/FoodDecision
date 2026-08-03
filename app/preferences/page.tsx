import type { Metadata } from "next";
import { PreferencesForm } from "@/components/PreferencesForm";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Präferenzen - Food Decision Engine", robots: { index: false, follow: true } };
export default function PreferencesPage() { return <main><SiteHeader /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Ohne Konto personalisieren</p><h1>Deine Standard-Präferenzen</h1><p>Diese Einstellungen bleiben nur in deinem Browser und werden beim nächsten Finder-Start vorgeschlagen.</p></section><section className="section"><PreferencesForm /></section></main>; }
