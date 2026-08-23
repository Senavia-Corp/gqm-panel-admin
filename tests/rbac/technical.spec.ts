import { test, expect } from "@playwright/test"
import { settle, sidebarLink, credentials, stateFile } from "./helpers"

/**
 * Tabla 4.4 del plan — Technical (portal): aterriza en /subcontractors y no
 * sale de /subcontractors, /technicians ni /profile. Sesión de global-setup.
 */
test.use({ storageState: stateFile("technical") })

const home = /\/subcontractors(?:[/?#]|$)/

test("aterriza en /subcontractors", async ({ page }) => {
  await page.goto("/dashboard") // el login hace router.push("/dashboard")
  await expect(page).toHaveURL(home, { timeout: 15_000 })
})

test("menú lateral: sin GQM Members, Commissions ni Roles & Permissions", async ({ page }) => {
  await page.goto("/subcontractors")
  await expect(page.locator("aside")).toBeVisible({ timeout: 30_000 })
  await settle(page)
  await expect(sidebarLink(page, "/members")).toHaveCount(0)
  await expect(sidebarLink(page, "/commissions")).toHaveCount(0)
  await expect(sidebarLink(page, "/roles-permissions")).toHaveCount(0)
})

test("URLs directas fuera del portal → /subcontractors", async ({ page }) => {
  for (const path of ["/members", "/commissions", "/roles-permissions", "/dashboard", "/jobs"]) {
    await page.goto(path)
    await expect(page).toHaveURL(home, { timeout: 15_000 })
  }
})

test("/profile carga", async ({ page }) => {
  await page.goto("/profile")
  await expect(page.getByText(credentials("technical").email)).toBeVisible({ timeout: 30_000 })
})
