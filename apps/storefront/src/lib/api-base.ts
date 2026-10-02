/**
 * Base URL for API calls.
 * - Browser: same origin ("") — next.config.js rewrites /api/* to the API, so this works behind tunnels.
 * - Server (SSR): absolute URL of the API on this machine.
 * NEXT_PUBLIC_API_URL still overrides both when the API is hosted elsewhere.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window === "undefined" ? process.env.API_URL || "http://localhost:4000" : "");
