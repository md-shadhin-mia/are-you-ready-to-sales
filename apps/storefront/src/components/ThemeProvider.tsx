import React from "react";
import { StoreThemeConfig } from "@repo/api-client";
import { hexToHslChannels, readableForegroundChannels } from "@repo/ui";

interface ThemeProviderProps {
  themeConfig?: StoreThemeConfig;
  children: React.ReactNode;
}

const SAFE_RADIUS = /^\d*\.?\d+(rem|px|em)$/;
const SAFE_FONT = /^[\w\s,"'-]+$/;

/**
 * Applies a store's branding by overriding the shared design tokens (see @repo/ui tokens.css).
 * Overrides go on :root so portaled overlays (cart sheet, dialogs) pick them up too.
 * Anything the store hasn't customised falls back to the platform's emerald theme.
 */
export function ThemeProvider({ themeConfig, children }: ThemeProviderProps) {
  const vars: string[] = [];

  const primaryHex = themeConfig?.primaryColor;
  const primary = primaryHex ? hexToHslChannels(primaryHex) : null;
  if (primaryHex && primary) {
    vars.push(`--primary: ${primary};`, `--ring: ${primary};`);
    vars.push(`--primary-foreground: ${readableForegroundChannels(primaryHex)};`);
  }
  if (themeConfig?.borderRadius && SAFE_RADIUS.test(themeConfig.borderRadius)) {
    vars.push(`--radius: ${themeConfig.borderRadius};`);
  }
  if (themeConfig?.fontFamily && SAFE_FONT.test(themeConfig.fontFamily)) {
    vars.push(`--font-sans: ${themeConfig.fontFamily};`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {vars.length > 0 && <style dangerouslySetInnerHTML={{ __html: `:root { ${vars.join(" ")} }` }} />}
      {children}
    </div>
  );
}
