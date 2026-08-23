import { chromium, type FullConfig } from "@playwright/test"
import { mkdirSync } from "node:fs"
import { credentials, homeFor, stateDir, stateFile, type Role } from "./helpers"

const ROLES: Role[] = ["full_admin", "gqm_member", "subcontractor", "technical"]

/**
 * Un login por rol para toda la corrida (rate-limit 5/60 s por correo en la
 * API; un fallo en modo normal reinicia el worker y repetiría el beforeAll).
 * El storageState (cookies + localStorage) va FUERA del repo y se borra en
 * global-teardown.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? process.env.PANEL_URL ?? "http://localhost:3100"
  mkdirSync(stateDir(), { recursive: true, mode: 0o700 })
  const browser = await chromium.launch()
  try {
    for (const role of ROLES) {
      const context = await browser.newContext({ baseURL })
      const page = await context.newPage()
      const { email, password } = credentials(role)
      await page.goto("/login")
      await page.locator("#email").fill(email)
      await page.locator("#password").fill(password)
      await page.getByRole("button", { name: /sign in/i }).click()
      await page.waitForURL(homeFor(role), { timeout: 60_000 })
      await context.storageState({ path: stateFile(role) })
      await context.close()
    }
  } finally {
    await browser.close()
  }
}
