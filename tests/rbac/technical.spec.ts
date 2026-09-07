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
  // `/technicians` entra en la lista: la ficha de técnico es superficie de
  // gestión del subcontratista, no del técnico. Su portal es sus tareas y su
  // perfil.
  for (const path of ["/members", "/commissions", "/roles-permissions", "/jobs",
                      "/subcontractors", "/technicians"]) {
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

test("y la suya propia TAMBIÉN rebota: /technicians salió de su portal", async ({ page }) => {
  // Antes esto afirmaba lo contrario, y era el control de la guarda por id de
  // U-18. Esa guarda ya no existe porque el prefijo entero salió de
  // `PORTAL_PREFIXES.technical`: al técnico se le retira toda la superficie de
  // gestión y le quedan sus tareas y su perfil. El control de «no se cierra de
  // más» pasa a ser la prueba de abajo, que exige que su portal SIGA vivo.
  const propio = env("RBAC_TECHNICAL_ID")
  await page.goto(`/technicians/${propio}`)
  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 })
})

test("su /dashboard ES su lista de tareas, sin pasar por nada más", async ({ page }) => {
  // El control de que no se ha cerrado de más: `/dashboard` es el primer
  // prefijo de su portal, o sea su destino de redirección. Si no sirviera sus
  // tareas, el técnico se quedaría sin sitio donde caer.
  await page.goto("/dashboard")
  await expect(page.getByText("AUDIT-PORTAL-A-tarea-de-tech-A", { exact: false }).first())
    .toBeVisible({ timeout: 30_000 })
})

test("ve su tarea aunque no tenga subcontratista asignado", async ({ page }) => {
  // CERROJO, no detector de regresión de este cambio: medido, con el código
  // anterior esta tarea TAMBIÉN se veía, porque el filtro en cliente por
  // subcontratista nacía nulo (el id llega por fetch, después del `useState`).
  // Lo que guarda esta prueba es que el tablero del técnico siga siendo el suyo
  // el día que ese orden de render cambie —o que alguien siembre el filtro—,
  // que es justo el escenario en el que la tarea desaparecería sin ruido.
  await page.goto("/dashboard")
  await expect(page.getByText("AUDIT-PORTAL-A-tarea-de-tech-A-sin-sub", { exact: false }).first())
    .toBeVisible({ timeout: 30_000 })
})
