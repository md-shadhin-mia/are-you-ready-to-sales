"use client";

import { useEffect, useCallback, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface AttributionData {
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export function useFunnelTracker(storeSlug: string) {
  const [sessionId, setSessionId] = useState<string>("");
  const [attribution, setAttribution] = useState<AttributionData>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Session ID management
    let currentSessionId = localStorage.getItem("sf_session_id");
    if (!currentSessionId) {
      currentSessionId = "sess_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
      localStorage.setItem("sf_session_id", currentSessionId);
    }
    setSessionId(currentSessionId);

    // 2. Attribution capture from URL query params
    const searchParams = new URLSearchParams(window.location.search);
    const ref = searchParams.get("ref");
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");

    let storedAttribution: AttributionData = {};
    const rawStored = sessionStorage.getItem("sf_attribution");
    if (rawStored) {
      try {
        storedAttribution = JSON.parse(rawStored);
      } catch {}
    }

    const updatedAttribution: AttributionData = {
      ref: ref || storedAttribution.ref || undefined,
      utmSource: utmSource || storedAttribution.utmSource || undefined,
      utmMedium: utmMedium || storedAttribution.utmMedium || undefined,
      utmCampaign: utmCampaign || storedAttribution.utmCampaign || undefined,
    };

    if (ref || utmSource || utmMedium || utmCampaign) {
      sessionStorage.setItem("sf_attribution", JSON.stringify(updatedAttribution));
    }
    setAttribution(updatedAttribution);
  }, []);

  const sendBeacon = useCallback(
    async (
      eventType: "PAGE_VIEW" | "PRODUCT_VIEW" | "ADD_TO_CART" | "CHECKOUT_INITIATED" | "ORDER_COMPLETED",
      entityId?: string,
      metadata: Record<string, any> = {},
    ) => {
      if (!storeSlug) return;
      const sid =
        sessionId ||
        (typeof window !== "undefined"
          ? localStorage.getItem("sf_session_id") || "anonymous"
          : "anonymous");

      try {
        await fetch(`${API_BASE}/api/v1/stores/${storeSlug}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            eventType,
            entityId,
            metadata: {
              ...metadata,
              path: typeof window !== "undefined" ? window.location.pathname : undefined,
              ...attribution,
            },
          }),
        });
      } catch {
        // Beacon failures should never crash storefront UI
      }
    },
    [storeSlug, sessionId, attribution],
  );

  return {
    sessionId,
    attribution,
    sendBeacon,
    trackPageView: (path?: string) => sendBeacon("PAGE_VIEW", undefined, { path }),
    trackProductView: (productId: string) => sendBeacon("PRODUCT_VIEW", productId),
    trackAddToCart: (productId: string) => sendBeacon("ADD_TO_CART", productId),
    trackCheckoutInitiated: () => sendBeacon("CHECKOUT_INITIATED"),
  };
}
