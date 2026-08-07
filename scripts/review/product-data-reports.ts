#!/usr/bin/env node --experimental-strip-types
import { parseProductDataReviewArgs, reviewStatusForAction, type ProductDataReportStatus } from "../../lib/product-data-review.ts";

type ReportRow = {
  id: string;
  product_slug: string;
  market: "DE" | "US";
  locale: "de-DE" | "en-US";
  issue_type: string;
  details: string | null;
  status: ProductDataReportStatus;
  resolution_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function requireEnv(name: "SUPABASE_URL") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function adminKey() {
  const value = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  return value;
}

function clipped(value: string, maxLength = 500) {
  const clean = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = adminKey();
  const response = await fetch(`${requireEnv("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase review request failed ${response.status}: ${clipped(body, 240)}`);
  return (body.trim() ? JSON.parse(body) : null) as T;
}

function printReports(rows: ReportRow[]) {
  if (!rows.length) {
    console.log("No product data reports match this queue.");
    return;
  }
  console.table(rows.map((row) => ({
    id: row.id,
    market: row.market,
    product: row.product_slug,
    issue: row.issue_type,
    created: row.created_at.slice(0, 10),
  })));
  for (const row of rows) {
    console.log(`\n${row.id}\n  ${row.market} · ${row.product_slug} · ${row.issue_type}\n  ${clipped(row.details || "No optional note provided.")}`);
  }
}

async function main() {
  const command = parseProductDataReviewArgs(process.argv.slice(2));
  if (!command) {
    throw new Error("Usage: review:product-data [list [--status new|reviewing|resolved|dismissed] [--limit 25] | start|resolve|dismiss <uuid> [--note \"internal note\"]]");
  }

  if (command.action === "list") {
    const query = new URLSearchParams({
      select: "id,product_slug,market,locale,issue_type,details,status,resolution_note,created_at,reviewed_at",
      status: `eq.${command.status}`,
      order: "created_at.asc",
      limit: String(command.limit),
    });
    printReports(await request<ReportRow[]>(`product_data_reports?${query}`));
    return;
  }

  const status = reviewStatusForAction(command.action);
  const body = {
    status,
    reviewed_at: status === "reviewing" ? null : new Date().toISOString(),
    ...(command.note ? { resolution_note: command.note } : {}),
  };
  const rows = await request<ReportRow[]>(`product_data_reports?id=eq.${command.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (rows.length !== 1) throw new Error(`No report found for ${command.id}.`);
  console.log(`Updated ${command.id} to ${status}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
