"use client";

import React from "react";
import { StoreThemeConfig } from "@repo/api-client";

interface ThemeProviderProps {
  themeConfig?: StoreThemeConfig;
  children: React.ReactNode;
}

export function ThemeProvider({ themeConfig, children }: ThemeProviderProps) {
  const primaryColor = themeConfig?.primaryColor || "#2563eb"; // default blue-600
  const secondaryColor = themeConfig?.secondaryColor || "#475569"; // slate-600
  const fontFamily = themeConfig?.fontFamily || "Inter, system-ui, sans-serif";
  const borderRadius = themeConfig?.borderRadius || "0.75rem"; // 12px rounded-xl

  const styleVariables = {
    "--store-primary": primaryColor,
    "--store-secondary": secondaryColor,
    "--store-radius": borderRadius,
    fontFamily: fontFamily,
  } as React.CSSProperties;

  return (
    <div style={styleVariables} className="min-h-screen flex flex-col font-sans">
      <style jsx global>{`
        :root {
          --store-primary: ${primaryColor};
          --store-secondary: ${secondaryColor};
          --store-radius: ${borderRadius};
        }
        .btn-store-primary {
          background-color: var(--store-primary);
          color: #ffffff;
        }
        .btn-store-primary:hover {
          filter: brightness(0.92);
        }
        .text-store-primary {
          color: var(--store-primary);
        }
        .border-store-primary {
          border-color: var(--store-primary);
        }
        .bg-store-primary-soft {
          background-color: color-mix(in srgb, var(--store-primary) 12%, transparent);
        }
      `}</style>
      {children}
    </div>
  );
}
