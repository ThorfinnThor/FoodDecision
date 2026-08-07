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
