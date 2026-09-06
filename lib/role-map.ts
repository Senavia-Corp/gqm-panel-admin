/**
 * Mapeo único user_type + rol → slug de rol del modelo de 4 roles
 * (REG-038/REG-107). Compartido por el login (cookie gqm_role), el
 * middleware y el gating de UI.
 */
export type RoleSlug = "full_admin" | "gqm_member" | "subcontractor" | "technical" | "none"

export function roleSlugFrom(
  userType?: string | null,
  roleName?: string | null,
): RoleSlug {
  if (userType === "subcontractor") return "subcontractor"
  if (userType === "technician") return "technical"
  // Un member sin rol (ID_Role NULL) no es un GQM Member: antes caía en
  // gqm_member y heredaba todo el menú; ahora solo llega a /profile.
  if (userType === "member" && !roleName) return "none"
  const name = (roleName || "").toLowerCase()
  if (name.includes("full admin") || name.includes("administrator")) return "full_admin"
  return "gqm_member"
}

/**
 * Vocabulario del SERVIDOR para el gating de UI (auditoría de portal, D6).
 *
 * Coexisten dos vocabularios de rol: el del servidor (cookie `gqm_role`, el
 * mismo que evalúa `middleware.ts`) y el del cliente
 * (`localStorage.user_data.role`, con un valor `LEAD_TECHNICIAN` que el
 * backend no emite). El segundo se reescribe desde devtools, así que toda
 * guarda nueva o tocada debe preguntarle a la cookie, no a localStorage.
 *
 * Devuelve `null` en el servidor (SSR) y si no hay sesión.
 */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(document.cookie)
  return m?.[1] ? decodeURIComponent(m[1]) : null
}

export function roleSlugFromCookie(): RoleSlug | null {
  return readCookie("gqm_role") as RoleSlug | null
}

/** Id del usuario de la sesión (cookie legible `gqm_uid`, la que usa el middleware). */
export function uidFromCookie(): string | null {
  return readCookie("gqm_uid")
}

/** Roles de portal: subcontratista y técnico. */
export function isPortalRole(role: RoleSlug | null | undefined): boolean {
  return role === "subcontractor" || role === "technical"
}
