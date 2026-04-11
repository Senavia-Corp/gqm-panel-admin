import { logout } from "./auth-utils"

// Singleton to track and share the refresh token request if multiple requests fail at the same time
let refreshPromise: Promise<boolean> | null = null

/**
 * Drop-in replacement for fetch() that automatically injects
 * headers and handles token expiration (401) by attempting a refresh.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const userId = _getUserId()
  const headers = new Headers(options.headers)

  // Inject user id if available and not already set
  if (userId && !headers.has("X-User-Id")) {
    headers.set("X-User-Id", userId)
  }

  // Inject the JWT authorization token from localStorage
  const token = localStorage.getItem("access_token")
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  // Default Content-Type for JSON bodies
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json")
  }

  // 1. First Attempt
  let response = await fetch(url, { ...options, headers })

  // 2. Handle 401 Unauthorized - Possible token expiration
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token")

    // If we don't even have a refresh token, just logout immediately
    if (!refreshToken) {
      logout()
      return response
    }

    try {
      // 3. Attempt to refresh the token (or wait if another request is already refreshing)
      const success = await _getRefreshPromise(refreshToken)

      if (success) {
        // 4. Update the Authorization header with the new token
        const newToken = localStorage.getItem("access_token")
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`)
          
          // 5. Retry the original request
          response = await fetch(url, { ...options, headers })
          
          // If still 401 after refresh, then the refresh token might be actually invalid
          if (response.status === 401) {
            logout()
          }
        } else {
          logout()
        }
      } else {
        // Refresh failed (likely refresh token expired)
        logout()
      }
    } catch (error) {
      console.error("[apiFetch] Error during token refresh:", error)
      logout()
    }
  }

  return response
}

/**
 * Ensures only one refresh request is active at a time.
 */
async function _getRefreshPromise(refreshToken: string): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const resp = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (resp.ok) {
        const data = await resp.json()
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token)
          return true
        }
      }
      return false
    } catch (err) {
      console.error("[apiFetch] Refresh fetch failed:", err)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function _getUserId(): string | null {
  try {
    const directId = localStorage.getItem("user_id")
    if (directId) return directId

    const raw = localStorage.getItem("user_data")
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id ?? user?.ID_Member ?? null
  } catch {
    return null
  }
}