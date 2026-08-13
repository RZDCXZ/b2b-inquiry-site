import "dotenv/config";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
    },
  },
  test: {
    fileParallelism: false,
    include: ["tests/integration/**/*.test.ts"],
  },
});
