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
  // `/jobs` sale de esta lista: ahora ES suyo. Sigue estándolo `/jobs/create`,
  // que cae bajo el mismo prefijo y al que el sub no puede llegar (no tiene
  // `job:create`; el formulario cargaría entero para morir en un 403).
  for (const path of ["/members", "/commissions", "/roles-permissions",
                      "/dashboard", "/jobs/create"]) {
    await page.goto(path)
    await expect(page).toHaveURL(home(), { timeout: 15_000 })
  }
})

test("«Trabajos» está en el menú y su lista carga", async ({ page }) => {
  await page.goto(`/subcontractors/${ids.sub()}`)
  await settle(page)
  await expect(sidebarLink(page, "/jobs")).toHaveCount(1)

  await page.goto("/jobs")
  // Positivo primero: si la página no cargó, la ausencia de nada no prueba nada.
  await expect(page).toHaveURL(/\/jobs(?:[/?#]|$)/, { timeout: 15_000 })
  await expect(page.getByRole("cell", { name: ids.job(), exact: true }).first())
    .toBeVisible({ timeout: 30_000 })
})

test("su lista de trabajos no ofrece controles de staff", async ({ page }) => {
  await page.goto("/jobs")
  await expect(page.getByRole("cell", { name: ids.job(), exact: true }).first())
    .toBeVisible({ timeout: 30_000 })
  await settle(page)
  // Enumerar, no contar: el conjunto dice CUÁL se cuela.
  const textos = await page.locator("button").allInnerTexts()
  const prohibidos = textos
    .map((x) => x.trim())
    .filter((x) => /add new|export|analyze|sync/i.test(x))
  expect(prohibidos, "controles de staff visibles al portal").toEqual([])
})

test("el detalle del job le da exactamente Details, Documents y Tasks", async ({ page }) => {
  await page.goto(`/jobs/${ids.job()}`)
  await expect(page).toHaveURL(new RegExp(`/jobs/${ids.job()}`), { timeout: 15_000 })
  const pestanas = page.getByTestId("job-tab")
  await expect(pestanas.first()).toBeVisible({ timeout: 30_000 })
  await settle(page)
  const nombres = (await pestanas.allInnerTexts()).map((x) => x.trim()).filter(Boolean)
  // Enumeración exacta: un `not.toContain("Subcontractors")` también pasaría
  // si el recorte se pasara de frenada y dejara sólo Details.
  expect(nombres.sort()).toEqual(["Details", "Documents", "Tasks"])
})

test("Documents: sólo la carpeta Technicians", async ({ page }) => {
  await page.goto(`/jobs/${ids.job()}?tab=documents`)
  // Señal positiva primero: la pestaña Documents cargó de verdad.
  await expect(page.getByText("Documents", { exact: true }).first())
    .toBeVisible({ timeout: 30_000 })
  await settle(page)
  // Y ahora la negativa. Enumerar las tarjetas de carpeta, no contar.
  await expect(page.getByText("Technicians", { exact: true })).toHaveCount(1)
  await expect(page.getByText("Members", { exact: true })).toHaveCount(0)
})

test("su ficha: sin Add Technician", async ({ page }) => {
  await page.goto(`/subcontractors/${ids.sub()}?tab=technicians`)
  await expectAbsentAfter(page, page.getByPlaceholder(/search technicians/i), addTechnicianButton(page))
})

test("/profile carga", async ({ page }) => {
  await page.goto("/profile")
  await expect(page.getByText(credentials("subcontractor").email)).toBeVisible({ timeout: 30_000 })
})
