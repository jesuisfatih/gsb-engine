import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup-env.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
