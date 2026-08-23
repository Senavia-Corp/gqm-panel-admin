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
