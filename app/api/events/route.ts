import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { validateJsonRequest } from "@/lib/api-security";
import { hasSupabaseServerConfig, supabaseServerRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

const allowedEvents = new Set([
  "finder_completed",
  "product_opened",
  "comparison_opened",
  "favorite_toggled",
  "shopping_list_toggled",
  "affiliate_clicked",
]);

function clipped(value: unknown, length: number) {
  return typeof value === "string" ? value.slice(0, length) : null;
}

export async function POST(request: Request) {
  const rejected = validateJsonRequest(request);
  if (rejected) return rejected;
  if (!hasSupabaseServerConfig()) return new NextResponse(null, { status: 204 });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const eventName = clipped(input.eventName, 64);
  if (!eventName || !allowedEvents.has(eventName)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const session = clipped(input.sessionId, 128);
  const metadata = input.metadata && typeof input.metadata === "object" && JSON.stringify(input.metadata).length <= 2000 ? input.metadata : {};
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
  return new NextResponse(null, { status: response.ok ? 204 : 502 });
}
