import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.module.ts", "src/**/*.dto.ts", "src/**/dto/**", "src/main.ts"],
      reporter: ["text-summary", "html"],
    },
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
