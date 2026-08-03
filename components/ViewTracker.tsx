"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/client-state";

export function ViewTracker({ entityId, entityType, eventName }: { entityId: string; entityType: string; eventName: string }) {
  useEffect(() => { trackEvent(eventName, { entityId, entityType }); }, [entityId, entityType, eventName]);
  return null;
}
