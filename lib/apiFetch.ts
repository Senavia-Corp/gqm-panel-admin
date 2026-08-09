import { logout } from "./auth-utils"

// Singleton to track and share the refresh request if multiple requests fail at the same time
let refreshPromise: Promise<boolean> | null = null

/**
 * Drop-in replacement for fetch() para llamadas same-origin al proxy /api.
 *
 * Sesión httpOnly (REG-108): los tokens viven en cookies que el navegador
 * adjunta solo; el middleware inyecta Authorization hacia el backend. Ante un
 * 401 se intenta UN refresh (cookie gqm_rt) y se reintenta la petición.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  // Smart Redirect: If a technician ID (starting with TEC) is being fetched from the members endpoint,
  // redirect it to the technician endpoint to avoid 404 errors.
  let finalUrl = url
  if (url.includes("/api/members/TEC")) {
    finalUrl = url.replace("/api/members/", "/api/technician/")
  }

  const userId = _getUserId()
  const headers = new Headers(options.headers)

  if (userId && !headers.has("X-User-Id")) {
    headers.set("X-User-Id", userId)
  }

  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json")
  }

  // 1. First attempt (cookies same-origin viajan solas)
  let response = await fetch(finalUrl, { ...options, headers })

  // 2. 401 → refresh de sesión por cookie y un único reintento
  if (response.status === 401) {
    const refreshed = await _getRefreshPromise()
    if (refreshed) {
      response = await fetch(finalUrl, { ...options, headers })
      if (response.status === 401) {
        logout()
      }
    } else {
      logout()
    }
  }

  return response
}

/**
 * Ensures only one refresh request is active at a time.
 */
async function _getRefreshPromise(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const resp = await fetch("/api/auth/refresh", { method: "POST" })
      return resp.ok
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
