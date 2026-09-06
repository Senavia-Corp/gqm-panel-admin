import { expect, type Locator, type Page } from "@playwright/test"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * Utilidades de la suite RBAC (plan F3-4 §11).
 *
 * Credenciales e IDs llegan SOLO por entorno (las exporta un wrapper fuera
 * del repo). Nunca se imprimen: si falta una variable el error da el NOMBRE,
 * no el valor.
 */
/** Los 4 roles originales (PR #49). Los specs existentes solo usan estos. */
export type CoreRole = "full_admin" | "gqm_member" | "subcontractor" | "technical"

/**
 * Sujetos añadidos por la auditoría de portal (sep-2026).
 *
 * Con UN solo sujeto por rol el objeto «ajeno» no existe y un IDOR entre pares
 * es invisible por construcción. `sub_b` no comparte ningún job con
 * `subcontractor`, y por eso sirve de control.
 *
 * `tech_independiente` no es un caso de borde: `Technician.ID_Subcontractor` es
 * nullable y la UI de alta ofrece el subcontratista como opcional.
 */
export type AuditRole = "sub_b" | "tech_de_sub_b" | "tech_independiente"

export type Role = CoreRole | AuditRole

const ROLE_ENV: Record<Role, string> = {
  full_admin: "FULL_ADMIN",
  gqm_member: "GQM_MEMBER",
  subcontractor: "SUBCONTRACTOR",
  technical: "TECHNICAL",
  sub_b: "SUB_B",
  tech_de_sub_b: "TECH_DE_SUB_B",
  tech_independiente: "TECH_INDEPENDIENTE",
}

export function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta la variable de entorno ${name} (exportarla desde el wrapper)`)
  return v
}

export function credentials(role: Role) {
  const key = ROLE_ENV[role]
  return { email: env(`RBAC_${key}_EMAIL`), password: env(`RBAC_${key}_PASSWORD`) }
}

export const ids = {
  job: () => env("RBAC_JOB_ID"),
  jobTasks: () => env("RBAC_JOB_ID_TASKS"),
  sub: () => env("RBAC_SUB_ID"),
  // Añadidos por la auditoría de portal: el «otro lado» contra el que probar.
  subB: () => env("RBAC_SUB_B_ID"),
  jobB: () => env("RBAC_JOB_B_ID"),
}

/** Dónde aterriza cada rol tras el login (redirecciones del middleware). */
export function homeFor(role: Role): RegExp {
  switch (role) {
    case "subcontractor":
      return new RegExp(`/subcontractors/${ids.sub()}(?:[/?#]|$)`)
    case "sub_b":
      return new RegExp(`/subcontractors/${ids.subB()}(?:[/?#]|$)`)
    case "technical":
    case "tech_de_sub_b":
    case "tech_independiente":
      // U-01 arreglado: `PORTAL_PREFIXES.technical` ya no apunta a
      // /subcontractors (que exige `subcontractor:read`, permiso que el técnico
      // no tiene) sino a /dashboard, donde `app/dashboard/page.tsx` le sirve
      // `LeadTechnicianDashboard`: sus jobs, sus tareas y sus certificados.
      return /\/dashboard(?:[/?#]|$)/
    default:
      return /\/dashboard(?:[/?#]|$)/
  }
}

/** Carpeta (fuera del repo) con el storageState de cada rol; la llena global-setup. */
export function stateDir(): string {
  return process.env.RBAC_STATE_DIR ?? join(tmpdir(), "gqm-rbac-state")
}

export function stateFile(role: Role): string {
  return join(stateDir(), `${role}.json`)
}

/** Espera a que la página deje de pedir cosas (gates asíncronos resueltos). */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(1_000)
}

/**
 * Negativa robusta: primero exige una señal positiva de que la vista ya cargó
 * (si no, un `toHaveCount(0)` pasaría en blanco antes de que pinte nada),
 * después deja que se resuelvan los gates y comprueba la ausencia.
 * `toHaveCount(0)` y no `not.toBeVisible()` por el doble render
 * tarjetas+tabla (una copia siempre está oculta por CSS).
 */
export async function expectAbsentAfter(page: Page, loaded: Locator, absent: Locator): Promise<void> {
  await expect(loaded.first()).toBeVisible({ timeout: 30_000 })
  await settle(page)
  await expect(absent).toHaveCount(0)
}

/** Enlace del menú lateral de escritorio (el drawer móvil no se monta cerrado). */
export function sidebarLink(page: Page, href: string): Locator {
  return page.locator(`aside nav a[href="${href}"]`)
}

/** Botón «Delete job» de /jobs en sus dos renders (tabla con aria-label, tarjeta con texto). */
export function deleteJobButtons(page: Page): Locator {
  return page
    .locator('button[aria-label^="Delete job"]')
    .or(page.locator("button").filter({ hasText: /^Delete$/ }))
}

/** Botón Delete job que de verdad se ve (la tarjeta móvil está oculta en escritorio). */
export function visibleDeleteJobButton(page: Page): Locator {
  return deleteJobButtons(page).filter({ visible: true }).first()
}

export function addMultiplierButton(page: Page): Locator {
  return page.getByRole("button", { name: "Add Multiplier" })
}

export function addTechnicianButton(page: Page): Locator {
  return page.getByRole("button", { name: "Add Technician" })
}

/** Abre la primera tarjeta de tarea del tablero y devuelve el diálogo. */
export async function openFirstTask(page: Page): Promise<Locator> {
  await page.goto(`/jobs/${ids.jobTasks()}?tab=tasks`)
  await expect(page.getByRole("button", { name: "New Task" }).first()).toBeVisible({ timeout: 30_000 })
  // La tarjeta es arrastrable (dnd-kit, distancia 8 px): un click limpio abre.
  const cards = page.locator('[role="button"][aria-roledescription="sortable"]')
  await expect(cards.first()).toBeVisible({ timeout: 30_000 })
  await cards.first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  return dialog
}
