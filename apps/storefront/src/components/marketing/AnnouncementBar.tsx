"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

import { API_BASE } from "../../lib/api-base";
interface AnnouncementBarProps {
  storeSlug: string;
}

export function AnnouncementBar({ storeSlug }: AnnouncementBarProps) {
  const [banner, setBanner] = useState<{
    bannerText?: string | null;
    bannerLink?: string | null;
    bannerBgColor?: string | null;
    bannerActive?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/stores/${storeSlug}/banner`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.bannerActive && data.bannerText) {
          setBanner(data);
        }
      })
      .catch(() => {});
  }, [storeSlug]);

  if (!banner || !banner.bannerActive || !banner.bannerText) {
    return null;
  }

  const content = (
    <div
      style={{ backgroundColor: banner.bannerBgColor || "hsl(var(--primary))" }}
      className="text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 transition-all shadow-xs"
    >
      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 animate-pulse" />
      <span>{banner.bannerText}</span>
      {banner.bannerLink && (
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 ml-1 opacity-80" />
      )}
    </div>
  );

  if (banner.bannerLink) {
    return (
      <a
        href={banner.bannerLink}
        className="block hover:opacity-95 transition-opacity"
      >
        {content}
      </a>
    );
  }

  return content;
}
