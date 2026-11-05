import path from "node:path";
import { defineConfig } from "vitest/config";

// Nothing in the unit suite may reach a real email provider. Strip the keys a
// mail module would read, so a test that forgets to mock sending fails closed
// instead of delivering real mail.
for (const key of ["RESEND_API_KEY", "POSTMARK_SERVER_TOKEN", "SMTP_PASSWORD"]) {
  delete process.env[key];
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".prove-work/**"],
  },
});
