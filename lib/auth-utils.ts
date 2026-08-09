/**
 * Utility to clear all authentication data and redirect to the login page.
 * This ensures a consistent logout experience across the application.
 *
 * Sesión httpOnly (REG-108): las cookies gqm_* las borra el servidor en
 * /api/auth/logout; aquí solo se limpia el estado de UI en localStorage.
 */
export function logout() {
  if (typeof window === "undefined") return

  // Clear UI state
  localStorage.removeItem("access_token") // legacy, por si quedó de sesiones viejas
  localStorage.removeItem("refresh_token") // legacy
  localStorage.removeItem("token_type") // legacy
  localStorage.removeItem("login_time") // legacy
  localStorage.removeItem("user_data")
  localStorage.removeItem("user_id")
  localStorage.removeItem("user_type")
  localStorage.removeItem("user_policies")

  // Borrar cookies de sesión en el servidor y redirigir con recarga completa
  fetch("/api/auth/logout", { method: "POST" })
    .catch(() => {})
    .finally(() => {
      window.location.href = "/login"
    })
}

/**
 * Checks if the user has an active session (cookie legible gqm_role; los
 * tokens httpOnly no son visibles desde JS a propósito).
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return document.cookie.split("; ").some((c) => c.startsWith("gqm_role="))
}
