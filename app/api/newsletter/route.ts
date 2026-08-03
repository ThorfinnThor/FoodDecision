import { NextResponse } from "next/server";
import { hasSupabaseServerConfig, supabaseServerRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
  let input: { email?: unknown; website?: unknown; source?: unknown; consent?: unknown };
  try { input = await request.json() as typeof input; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (input.website) return NextResponse.json({ ok: true });
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!emailPattern.test(email) || email.length > 254) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (input.consent !== true) return NextResponse.json({ error: "consent_required" }, { status: 400 });
  const normalized = email.toLowerCase();
  const response = await supabaseServerRequest("newsletter_subscribers?on_conflict=email_normalized", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ email, email_normalized: normalized, source: typeof input.source === "string" ? input.source.slice(0, 80) : "homepage", status: "pending", consented_at: new Date().toISOString() }),
  });
  if (!response.ok) return NextResponse.json({ error: "storage_failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
