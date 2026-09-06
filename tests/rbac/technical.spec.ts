import { test, expect } from "@playwright/test"
import { homeFor, settle, sidebarLink, credentials, stateFile } from "./helpers"

/**
 * Tabla 4.4 del plan — Technical (portal): aterriza en /dashboard y no sale de
 * /dashboard, /technicians ni /profile. Sesión de global-setup.
 *
 * La landing cambió al arreglar U-01: /subcontractors exige
 * `subcontractor:read`, que la política `technical-portal` no concede, así que
 * la primera pantalla del técnico era «Access Denied». Ahora /dashboard está
 * en `PORTAL_PREFIXES.technical` y le sirve `LeadTechnicianDashboard`.
 */
test.use({ storageState: stateFile("technical") })

const home = homeFor("technical")

test("aterriza en /dashboard", async ({ page }) => {
  await page.goto("/dashboard") // el login hace router.push("/dashboard")
  await expect(page).toHaveURL(home, { timeout: 15_000 })
})

test("menú lateral: sin GQM Members, Commissions ni Roles & Permissions", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page.locator("aside")).toBeVisible({ timeout: 30_000 })
  await settle(page)
  await expect(sidebarLink(page, "/members")).toHaveCount(0)
  await expect(sidebarLink(page, "/commissions")).toHaveCount(0)
  await expect(sidebarLink(page, "/roles-permissions")).toHaveCount(0)
})

test("URLs directas fuera del portal → /dashboard", async ({ page }) => {
  // /subcontractors sale del portal técnico: es la pantalla que le denegaba el
  // acceso, y ya no está entre sus prefijos.
  for (const path of ["/members", "/commissions", "/roles-permissions", "/jobs", "/subcontractors"]) {
    await page.goto(path)
    await expect(page).toHaveURL(home, { timeout: 15_000 })
  }
})

test("/profile carga", async ({ page }) => {
  await page.goto("/profile")
  await expect(page.getByText(credentials("technical").email)).toBeVisible({ timeout: 30_000 })
})
