import { test, expect } from "@playwright/test"
import {
  settle, ids, sidebarLink, visibleDeleteJobButton, addMultiplierButton,
  addTechnicianButton, openFirstTask, stateFile,
} from "./helpers"

/**
 * Tabla 4.4 del plan — Full Admin: ve y puede todo. La sesión la abre
 * global-setup (un login por rol y corrida); cada test recibe un contexto
 * nuevo con ese storageState.
 */
test.use({ storageState: stateFile("full_admin") })

test("menú lateral: GQM Members, Commissions y Roles & Permissions visibles", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(sidebarLink(page, "/members")).toBeVisible({ timeout: 30_000 })
  await expect(sidebarLink(page, "/commissions")).toBeVisible()
  await expect(sidebarLink(page, "/roles-permissions")).toBeVisible()
})

test("URLs directas /members, /commissions y /roles-permissions abren", async ({ page }) => {
  for (const path of ["/members", "/commissions", "/roles-permissions"]) {
    await page.goto(path)
    await settle(page)
    await expect(page).toHaveURL(new RegExp(`${path}(?:[/?#]|$)`))
  }
})

test("dashboard carga", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.locator("aside")).toBeVisible()
})

test("/jobs: botón Delete job visible", async ({ page }) => {
  await page.goto("/jobs")
  await expect(visibleDeleteJobButton(page)).toBeVisible({ timeout: 30_000 })
})

test("pricing: Add Multiplier visible", async ({ page }) => {
  await page.goto(`/jobs/${ids.job()}?tab=pricing`)
  await expect(page.getByText("Pricing Multipliers")).toBeVisible({ timeout: 30_000 })
  await expect(addMultiplierButton(page)).toBeVisible()
})

test("tasks: New Task visible", async ({ page }) => {
  await page.goto(`/jobs/${ids.jobTasks()}?tab=tasks`)
  await expect(page.getByRole("button", { name: "New Task" }).first()).toBeVisible({ timeout: 30_000 })
})

test("tasks: Delete Task visible al abrir una tarea (sin pulsarlo)", async ({ page }) => {
  const dialog = await openFirstTask(page)
  await expect(dialog.getByRole("button", { name: "Delete Task" })).toBeVisible()
  await page.keyboard.press("Escape")
})

test("subcontratista: Add Technician visible", async ({ page }) => {
  await page.goto(`/subcontractors/${ids.sub()}?tab=technicians`)
  await expect(addTechnicianButton(page)).toBeVisible({ timeout: 30_000 })
})

test("sin cookie gqm_role → /login (nunca se degrada a otro rol)", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/dashboard/)
  await page.context().clearCookies({ name: "gqm_role" })
  // Tiene que ser el middleware (redirección del servidor), no el logout()
  // del cliente que ya hacía isAuthenticated(): se mira la respuesta final
  // de la navegación, antes de que corra ningún efecto de React.
  const resp = await page.goto("/dashboard")
  expect(new URL(resp!.url()).pathname).toBe("/login")
  await expect(page).toHaveURL(/\/login(?:[/?#]|$)/, { timeout: 15_000 })
  const cookies = await page.context().cookies()
  expect(cookies.find((c) => c.name === "gqm_at")).toBeUndefined()
})
