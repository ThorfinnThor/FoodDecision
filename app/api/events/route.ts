import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { readLimitedJson, validateJsonRequest } from "@/lib/api-security";
import { hasSupabaseServerConfig, supabaseServerRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

const allowedEvents = new Set([
  "finder_completed",
  "product_opened",
  "comparison_opened",
  "favorite_toggled",
  "shopping_list_toggled",
  "affiliate_clicked",
  "alternative_compared",
  "favorites_added_to_shopping_list",
  "shopping_completed_removed",
  "saved_collection_cleared",
  "shopping_list_copied",
]);

function clipped(value: unknown, length: number) {
  return typeof value === "string" ? value.slice(0, length) : null;
}

function sanitizedMetadata(eventName: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed: Record<string, Array<[string, "boolean" | "count" | "text"]>> = {
    finder_completed: [["goal", "text"], ["category", "text"], ["resultCount", "count"]],
    favorite_toggled: [["selected", "boolean"]],
    shopping_list_toggled: [["selected", "boolean"]],
    affiliate_clicked: [["offerId", "text"], ["merchant", "text"]],
    alternative_compared: [["goal", "text"], ["scoreDelta", "count"]],
    favorites_added_to_shopping_list: [["count", "count"]],
    shopping_completed_removed: [["count", "count"]],
    saved_collection_cleared: [["count", "count"]],
    shopping_list_copied: [["count", "count"]],
  };
  const metadata: Record<string, boolean | number | string> = {};
  for (const [key, type] of allowed[eventName] ?? []) {
    const candidate = source[key];
    if (type === "boolean" && typeof candidate === "boolean") metadata[key] = candidate;
    if (type === "count" && typeof candidate === "number" && Number.isFinite(candidate)) metadata[key] = Math.max(0, Math.min(100_000, Math.round(candidate)));
    if (type === "text" && typeof candidate === "string") metadata[key] = candidate.slice(0, 100);
  }
  return metadata;
}

export async function POST(request: Request) {
  const rejected = validateJsonRequest(request);
  if (rejected) return rejected;
  if (!hasSupabaseServerConfig()) return new NextResponse(null, { status: 204 });
  const parsed = await readLimitedJson(request);
  if (parsed.response) return parsed.response;
  const input = parsed.value;
  const eventName = clipped(input.eventName, 64);
  if (!eventName || !allowedEvents.has(eventName)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const session = clipped(input.sessionId, 128);
  const metadata = sanitizedMetadata(eventName, input.metadata);
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
