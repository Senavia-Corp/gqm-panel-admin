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
  // El tablero sigue pidiendo datos un rato después de pintar. Si se le quita
  // la cookie a mitad, una de esas peticiones responde 401, `apiFetch` llama a
  // logout() y ESE salto del cliente cancela la navegación de abajo
  // (net::ERR_ABORTED). Medido: sin este settle falla 5 de 5; con él, 0 de 5.
  // No es un fallo del producto —acaba en /login igual— sino la prueba
  // compitiendo consigo misma.
  await settle(page)
  await page.context().clearCookies({ name: "gqm_role" })
  // Tiene que ser el middleware (redirección del servidor), no el logout()
  // del cliente que ya hacía isAuthenticated(). Por eso se navega desde una
  // PESTAÑA NUEVA del mismo contexto: comparte el tarro de cookies pero no ha
  // ejecutado ni una línea de la aplicación, así que el único que puede
  // mandarla a /login es el servidor.
  const limpia = await page.context().newPage()
  try {
    const resp = await limpia.goto("/dashboard")
    expect(new URL(resp!.url()).pathname).toBe("/login")
    await expect(limpia).toHaveURL(/\/login(?:[/?#]|$)/, { timeout: 15_000 })
  } finally {
    await limpia.close()
  }
  const cookies = await page.context().cookies()
  expect(cookies.find((c) => c.name === "gqm_at")).toBeUndefined()
})

test("subcontractors: vincular técnico es acción de STAFF y se le ofrece", async ({ page }) => {
  // La condición estaba INVERTIDA: `onLinkClick`/`onUnlinkClick` se pasaban
  // sólo si el rol era SUBCONTRACTOR — es decir, se ofrecían justo a quien el
  // API responde 403 (`POST /job_technician` exige `job:create`; el `DELETE`,
  // `job:update`), y el Full Admin y el GQM Member, que sí los tienen, no veían
  // ningún botón. Aquí se guarda el lado del staff.
  await page.goto(`/jobs/${ids.job()}?tab=subcontractors`)
  await expect(page.getByRole("button", { name: /Link Technician/i }).first())
    .toBeVisible({ timeout: 30_000 })
})
