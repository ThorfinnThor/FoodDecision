const JSON_CONTENT_TYPE = "application/json";

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function validateJsonRequest(request: Request, maxBytes = 8_192) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== JSON_CONTENT_TYPE) return errorResponse("unsupported_media_type", 415);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return errorResponse("payload_too_large", 413);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return errorResponse("cross_origin_request", 403);

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return errorResponse("cross_site_request", 403);

  return null;
}

export async function readLimitedJson(request: Request, maxBytes = 8_192) {
  if (!request.body) return { response: errorResponse("invalid_json", 400), value: null } as const;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("payload_too_large");
        return { response: errorResponse("payload_too_large", 413), value: null } as const;
      }
      chunks.push(value);
    }
  } catch {
    return { response: errorResponse("invalid_json", 400), value: null } as const;
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json_object");
    return { response: null, value: value as Record<string, unknown> } as const;
  } catch {
    return { response: errorResponse("invalid_json", 400), value: null } as const;
  }
}
