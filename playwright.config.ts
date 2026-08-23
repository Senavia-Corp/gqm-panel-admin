import { defineConfig, devices } from "@playwright/test"

/**
 * Hasta hoy este repo no tenía NINGUNA prueba automática: el único control era
 * `npm run lint`, que es `tsc --noEmit`. Los cambios de esta tanda tocan la
 * parte de dinero del panel (pestañas por tipo de job, errores de orden,
 * cuotas), así que necesitan una red.
 *
 * Los e2e interceptan `**\/api\/**` con `page.route` en vez de hablar con la API
 * Python real: las rutas del panel son proxies y la sesión va por cookie
 * httpOnly con refresh automático, así que un e2e "de verdad" exigiría login
 * contra dev y datos estables. Interceptar fija el CONTRATO, que es lo que
 * estos cambios rompen o arreglan.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: process.env.PANEL_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PANEL_URL
    ? undefined
    : {
        command: "npx next dev -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 180_000,
      },
})
