"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/client-state";
import type { AnalyticsEventName } from "@/lib/analytics-events";

export function ViewTracker({ entityId, entityType, eventName }: { entityId: string; entityType: string; eventName: AnalyticsEventName }) {
  useEffect(() => { trackEvent(eventName, { entityId, entityType }); }, [entityId, entityType, eventName]);
  return null;
}
