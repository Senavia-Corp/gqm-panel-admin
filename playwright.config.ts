import { defineConfig, devices } from "@playwright/test"

/**
 * Suite RBAC del panel (plan F3-4 §11). Se ejecuta contra un panel dev en
 * :3100 que habla con la API de dev en :8000. Las credenciales llegan SOLO por
 * variables de entorno (RBAC_<ROL>_EMAIL / RBAC_<ROL>_PASSWORD) desde un
 * wrapper fuera del repo; `trace: "off"` porque un trace grabaría el POST de
 * login con la contraseña.
 */
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/rbac/global-setup.ts",
  globalTeardown: "./tests/rbac/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PANEL_URL ?? "http://localhost:3100",
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "corepack pnpm@10.28.0 dev -p 3100",
    url: process.env.PANEL_URL ?? "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
