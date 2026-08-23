import { test, expect } from "@playwright/test"
import {
  settle, ids, sidebarLink, deleteJobButtons, addMultiplierButton,
  addTechnicianButton, openFirstTask, expectAbsentAfter, credentials, stateFile,
} from "./helpers"

/**
 * Tabla 4.4 del plan — GQM Member: todo menos gestión de miembros, comisiones,
 * roles, borrar jobs y multiplicadores. Escrito contra la SPEC, no contra el
 * comportamiento actual. Sesión de global-setup (un login por rol y corrida).
 */
test.use({ storageState: stateFile("gqm_member") })

test("menú lateral: sin GQM Members, Commissions ni Roles & Permissions", async ({ page }) => {
  await page.goto("/dashboard")
  // Señal positiva de que las políticas ya se aplicaron al menú.
  await expect(sidebarLink(page, "/subcontractors")).toBeVisible({ timeout: 30_000 })
  await settle(page)
  await expect(sidebarLink(page, "/members")).toHaveCount(0)
  await expect(sidebarLink(page, "/commissions")).toHaveCount(0)
  await expect(sidebarLink(page, "/roles-permissions")).toHaveCount(0)
})

test("URLs directas /members, /commissions y /roles-permissions → /dashboard", async ({ page }) => {
  for (const path of ["/members", "/commissions", "/roles-permissions"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 })
  }
})

test("dashboard carga y conserva la vista Members (member:read_basics)", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.locator("aside")).toBeVisible()
  await expect(page.getByRole("button", { name: "Members", exact: true })).toBeVisible({ timeout: 30_000 })
})

test("/jobs: sin botón Delete job", async ({ page }) => {
  await page.goto("/jobs")
  // Editar sí lo tiene (job:update): cuando aparece, las políticas ya están aplicadas.
  await expectAbsentAfter(page, page.locator('button[aria-label^="Edit "]'), deleteJobButtons(page))
})

test("pricing: sin Add Multiplier", async ({ page }) => {
  await page.goto(`/jobs/${ids.job()}?tab=pricing`)
  await expectAbsentAfter(page, page.getByText("Pricing Multipliers"), addMultiplierButton(page))
})

test("tasks: New Task visible", async ({ page }) => {
  await page.goto(`/jobs/${ids.jobTasks()}?tab=tasks`)
  await expect(page.getByRole("button", { name: "New Task" }).first()).toBeVisible({ timeout: 30_000 })
})

test("tasks: Delete Task visible al abrir una tarea (tasks:delete no está denegado)", async ({ page }) => {
  const dialog = await openFirstTask(page)
  await expect(dialog.getByRole("button", { name: "Delete Task" })).toBeVisible()
  await page.keyboard.press("Escape")
})

test("detalle de job: pestaña Members visible", async ({ page }) => {
  await page.goto(`/jobs/${ids.job()}`)
  await expect(page.getByRole("button", { name: "Members", exact: true })).toBeVisible({ timeout: 30_000 })
})

test("subcontratista: Add Technician visible", async ({ page }) => {
  await page.goto(`/subcontractors/${ids.sub()}?tab=technicians`)
  await expect(addTechnicianButton(page)).toBeVisible({ timeout: 30_000 })
})

test("/profile carga sin toast de error", async ({ page }) => {
  await page.goto("/profile")
  await expect(page.getByText(credentials("gqm_member").email)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Failed to load/i)).toHaveCount(0)
})

test("/subcontractors/create con rol preseleccionado", async ({ page }) => {
  await page.goto("/subcontractors/create")
  const roleSelect = page.locator("select").filter({ has: page.locator("option", { hasText: /subcontractor/i }) })
  await expect(roleSelect).toBeVisible({ timeout: 30_000 })
  await expect(roleSelect.locator("option:checked")).toHaveText(/subcontractor/i, { timeout: 15_000 })
})

test("/technicians/create carga", async ({ page }) => {
  await page.goto("/technicians/create")
  await expect(page.getByText("Creating new technician")).toBeVisible({ timeout: 30_000 })
  await settle(page)
  await expect(page.getByText(/Application error/i)).toHaveCount(0)
})
