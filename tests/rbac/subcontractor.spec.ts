import { test, expect } from "@playwright/test"
import { settle, ids, sidebarLink, addTechnicianButton, expectAbsentAfter, credentials, stateFile } from "./helpers"

/**
 * Tabla 4.4 del plan — Subcontractor (portal): aterriza en su ficha y no sale
 * de /subcontractors ni /profile. Sesión de global-setup.
 */
test.use({ storageState: stateFile("subcontractor") })

const home = () => new RegExp(`/subcontractors/${ids.sub()}(?:[/?#]|$)`)

test("aterriza en su propia ficha", async ({ page }) => {
  await page.goto("/dashboard") // el login hace router.push("/dashboard")
  await expect(page).toHaveURL(home(), { timeout: 15_000 })
})

test("menú lateral: sin GQM Members, Commissions ni Roles & Permissions", async ({ page }) => {
  await page.goto(`/subcontractors/${ids.sub()}`)
  await expect(page.locator("aside nav a").first()).toBeVisible({ timeout: 30_000 })
  await settle(page)
  await expect(sidebarLink(page, "/members")).toHaveCount(0)
  await expect(sidebarLink(page, "/commissions")).toHaveCount(0)
  await expect(sidebarLink(page, "/roles-permissions")).toHaveCount(0)
})

test("URLs directas fuera del portal → su ficha", async ({ page }) => {
  for (const path of ["/members", "/commissions", "/roles-permissions", "/dashboard", "/jobs"]) {
    await page.goto(path)
    await expect(page).toHaveURL(home(), { timeout: 15_000 })
  }
})

test("su ficha: sin Add Technician", async ({ page }) => {
  await page.goto(`/subcontractors/${ids.sub()}?tab=technicians`)
  await expectAbsentAfter(page, page.getByPlaceholder(/search technicians/i), addTechnicianButton(page))
})

test("/profile carga", async ({ page }) => {
  await page.goto("/profile")
  await expect(page.getByText(credentials("subcontractor").email)).toBeVisible({ timeout: 30_000 })
})
