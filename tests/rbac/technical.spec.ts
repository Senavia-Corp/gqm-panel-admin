import { test, expect } from "@playwright/test"
import { env, homeFor, settle, sidebarLink, credentials, stateFile } from "./helpers"

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


/**
 * U-18 — a `technical` se le dio `/technicians` en sus prefijos (U-01) sin
 * ninguna comprobación de a QUIÉN pide.
 *
 * La guarda de pertenencia que U-03 añadió al middleware está condicionada a
 * `role === "subcontractor"`, así que un técnico podía abrir la ficha de
 * cualquier otro. Medido antes del arreglo: el middleware le dejaba pasar y la
 * pantalla se quedaba en blanco, porque el API sí le niega los datos. No hay
 * fuga — pero sí un callejón sin salida y sin mensaje, que es exactamente lo
 * que U-01 vino a quitar.
 */
test("la ficha de OTRO técnico rebota a su inicio (U-18)", async ({ page }) => {
  const ajeno = env("RBAC_TEC_B_ID")   // el técnico del otro subcontratista
  await page.goto(`/technicians/${ajeno}`)
  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 })
})

test("y la suya propia sigue abriéndose (no se cierra de más)", async ({ page }) => {
  // El control: una guarda que rebotara TODO también pasaría la prueba de
  // arriba, y le habría quitado al técnico su propia ficha.
  const propio = env("RBAC_TECHNICAL_ID")
  const resp = await page.goto(`/technicians/${propio}`)
  expect(new URL(resp!.url()).pathname).toBe(`/technicians/${propio}`)
})
