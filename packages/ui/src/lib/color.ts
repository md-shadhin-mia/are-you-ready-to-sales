/** Convert a hex color (#rgb or #rrggbb) to "h s% l%" channels for use in shadcn CSS variables. */
export function hexToHslChannels(hex: string): string | null {
  const match = hex.trim().replace(/^#/, "");
  const full =
    match.length === 3
      ? match
          .split("")
          .map((c) => c + c)
          .join("")
      : match;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Pick a readable foreground ("h s% l%") for a given hex background. */
export function readableForegroundChannels(hex: string): string {
  const full = hex.replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(full)) return "0 0% 100%";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "222 47% 11%" : "0 0% 100%";
}
