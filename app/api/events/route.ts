import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { readLimitedJson, validateJsonRequest } from "@/lib/api-security";
import { hasSupabaseServerConfig, supabaseServerRequest } from "@/lib/supabase-server";
import { isAnalyticsEventName, sanitizedAnalyticsMetadata } from "@/lib/analytics-events";

export const runtime = "nodejs";

function clipped(value: unknown, length: number) {
  return typeof value === "string" ? value.slice(0, length) : null;
}

export async function POST(request: Request) {
  const rejected = validateJsonRequest(request);
  if (rejected) return rejected;
  if (!hasSupabaseServerConfig()) return new NextResponse(null, { status: 204 });
  const parsed = await readLimitedJson(request);
  if (parsed.response) return parsed.response;
  const input = parsed.value;
  const eventName = clipped(input.eventName, 64);
  if (!eventName || !isAnalyticsEventName(eventName)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const session = clipped(input.sessionId, 128);
  const metadata = sanitizedAnalyticsMetadata(eventName, input.metadata);
  try {
    const response = await supabaseServerRequest("analytics_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_name: eventName,
        session_id: session ? createHash("sha256").update(session).digest("hex") : null,
        path: clipped(input.path, 300),
        entity_type: clipped(input.entityType, 80),
        entity_id: clipped(input.entityId, 200),
        metadata,
      }),
    });
    if (!response.ok) console.error("analytics_event_storage_failed", { status: response.status });
    return new NextResponse(null, { status: response.ok ? 204 : 502 });
  } catch (error) {
    console.error("analytics_event_upstream_unavailable", { name: error instanceof Error ? error.name : "unknown" });
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  }
}
