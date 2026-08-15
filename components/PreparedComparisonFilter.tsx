"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SiteLocale } from "@/lib/types";
import { pick } from "@/lib/i18n";

type Option = { slug: string; label: string; count: number };

export function PreparedComparisonFilter({ locale, options, selected }: { locale: SiteLocale; options: Option[]; selected: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const changeCategory = (category: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (category) next.set("category", category);
    else next.delete("category");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return <label className="prepared-comparison-filter">
    <span>{pick(locale, "Kategorie filtern", "Filter by category")}</span>
    <select onChange={(event) => changeCategory(event.target.value)} value={selected}>
      <option value="">{pick(locale, "Alle Kategorien", "All categories")}</option>
      {options.map((option) => <option key={option.slug} value={option.slug}>{option.label} ({option.count})</option>)}
    </select>
  </label>;
}
