/**
 * Utility to clear all authentication data and redirect to the login page.
 * This ensures a consistent logout experience across the application.
 */
export function logout() {
  if (typeof window === "undefined") return

  // Clear all auth-related items
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user_data")
  localStorage.removeItem("user_id")
  localStorage.removeItem("user_type")
  localStorage.removeItem("token_type")
  localStorage.removeItem("login_time")

  // Redirect to login using window.location to ensure a full page reload and reset state
  window.location.href = "/login"
}

/**
 * Checks if the user has basic authentication tokens present.
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem("access_token")
}
