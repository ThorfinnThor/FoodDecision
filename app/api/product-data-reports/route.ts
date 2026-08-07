import { NextResponse } from "next/server";
import { validateJsonRequest } from "@/lib/api-security";
import { parseProductDataReport } from "@/lib/product-data-report";
import { getCatalog } from "@/lib/static-data";
import { hasSupabaseServerConfig, supabaseServerRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rejected = validateJsonRequest(request, 4_096);
  if (rejected) return rejected;
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });

  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (input.website) return NextResponse.json({ ok: true });

  const report = parseProductDataReport(input);
  if (!report) return NextResponse.json({ error: "invalid_report" }, { status: 400 });
  const { details, issueType, locale, productSlug } = report;
  if (!getCatalog(locale).getProduct(productSlug)) return NextResponse.json({ error: "product_not_found" }, { status: 404 });

  const response = await supabaseServerRequest("product_data_reports", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      product_slug: productSlug,
      market: locale === "de-DE" ? "DE" : "US",
      locale,
      issue_type: issueType,
      details: details || null,
    }),
  });
  if (!response.ok) return NextResponse.json({ error: "storage_failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
