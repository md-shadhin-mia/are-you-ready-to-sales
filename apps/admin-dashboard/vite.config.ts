import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Shared UI files carry "use client" for Next.js; Vite can ignore it.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
    },
  },
  server: {
    port: 3002,
    allowedHosts: true,
    // Same-origin API access, so the dashboard also works through Cloudflare tunnels.
    proxy: {
      "/api": { target: process.env.API_URL || "http://127.0.0.1:4000", changeOrigin: true },
    },
  },
});
