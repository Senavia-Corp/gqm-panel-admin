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

test("del job no puede modificar nada", async ({ page }) => {
  // CERROJO, y conviene decir qué NO prueba.
  //
  // Se intentó convertirla en detector de la guarda nueva por cookie
  // (`readOnly={esPortal || ...}`) falsificando `localStorage.user_policies`
  // para concederse `job:update`. No funciona, y por una buena razón:
  // `usePermissions` se siembra de localStorage pero acto seguido REFRESCA
  // desde `/api/auth/me`, así que la política del servidor gana y el campo
  // sigue siendo de sólo lectura. Medido: con la guarda por cookie quitada,
  // esta prueba sigue verde.
  //
  // Conclusión honesta: para el subcontratista el sólo-lectura ya lo imponía
  // el permiso, y `esPortal` es defensa en profundidad cuyo efecto NO se puede
  // demostrar desde el navegador. Lo que esta prueba sí guarda es el resultado:
  // que el portal no pueda editar la ficha. El control de que no mide el aire
  // es el admin, que en la misma pantalla tiene 7 campos editables.
  await page.addInitScript(() => {
    window.localStorage.setItem("user_policies", JSON.stringify(
      [{ Statement: [{ Effect: "Allow", Action: ["*"], Resource: ["*"] }] }]))
  })
  await page.goto(`/jobs/${ids.job()}`)
  // Positivo primero: la ficha cargó de verdad.
  await expect(page.getByTestId("job-tab").first()).toBeVisible({ timeout: 30_000 })
  await settle(page)

  // Lo OBSERVABLE es que los campos de Details no se puedan editar. Guardar y
  // el interruptor de Podio cuelgan además de `jobDetail.hasChanges`, que un
  // rol de portal no puede activar precisamente porque todo es de sólo
  // lectura: por eso una sonda que sólo mirase esos dos botones no puede
  // ponerse roja nunca — comprobado— y estaría midiendo el aire.
  const editables = page.locator(
    "main input:not([readonly]):not([disabled]), main textarea:not([readonly]):not([disabled])")
  expect(await editables.count(), "campos editables en la ficha del job").toBe(0)

  const botones = (await page.locator("button").allInnerTexts()).map((x) => x.trim())
  expect(botones.filter((x) => /^save$|guardar|podio/i.test(x))).toEqual([])
})

test("la ficha de su técnico no le ofrece asignarle trabajos", async ({ page }) => {
  await page.goto(`/subcontractors/${ids.sub()}/technicians/${process.env.RBAC_TECHNICAL_ID}`)
  // Positivo primero: la ficha del técnico cargó.
  await expect(page.getByText("DEV Technician").first()).toBeVisible({ timeout: 30_000 })
  await settle(page)
  await expect(page.getByRole("button", { name: /Assign New Job/i })).toHaveCount(0)
})


test("(control) el staff sí puede editar esa misma ficha", async ({ page, browser }) => {
  // Sin este control, el `toBe(0)` de la prueba de arriba pasaría igual si la
  // pantalla no pintara nada: mediría el aire. Medido: 7 campos editables.
  const ctx = await browser.newContext({ storageState: stateFile("full_admin") })
  const p2 = await ctx.newPage()
  await p2.goto(`/jobs/${ids.job()}`)
  await p2.getByTestId("job-tab").first().waitFor({ timeout: 30_000 })
  await settle(p2)
  expect(await p2.locator("main input:not([readonly]):not([disabled])").count())
    .toBeGreaterThan(0)
  await ctx.close()
})
