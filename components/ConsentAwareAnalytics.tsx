"use client";

import { useSyncExternalStore } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { sanitizeAnalyticsEvent } from "@/lib/analytics";
import { analyticsEnabled } from "@/lib/client-state";
import { ANALYTICS_PREFERENCE_EVENT } from "@/lib/storage-keys";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ANALYTICS_PREFERENCE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ANALYTICS_PREFERENCE_EVENT, callback);
  };
}

function sanitizeEvent(event: BeforeSendEvent) {
  if (!analyticsEnabled()) return null;
  return sanitizeAnalyticsEvent(event);
}

export function ConsentAwareAnalytics() {
  const enabled = useSyncExternalStore(subscribe, analyticsEnabled, () => false);
  return enabled ? <Analytics beforeSend={sanitizeEvent} /> : null;
}
