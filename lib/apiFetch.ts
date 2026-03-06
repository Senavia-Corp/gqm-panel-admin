// lib/apiFetch.ts
/**
 * Drop-in replacement for fetch() that automatically injects
 * the X-User-Id header from localStorage so the backend can
 * attribute every action to the correct Member in the timeline.
 *
 * Usage — replace:
 *   fetch("/api/jobs/QID001", { method: "PATCH", body: ... })
 * With:
 *   apiFetch("/api/jobs/QID001", { method: "PATCH", body: ... })
 *
 * Everything else (await, .json(), error handling) stays identical.
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

  // Default Content-Type for JSON bodies
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json")
  }

  return fetch(url, { ...options, headers })
}

function _getUserId(): string | null {
  try {
    // Primary: standalone user_id key (e.g. "MEM60001")
    const directId = localStorage.getItem("user_id")
    console.log("Direct ID:", directId);

    if (directId) return directId

    // Fallback: user_data JSON object — field is "id" not "ID_Member"
    const raw = localStorage.getItem("user_data")
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id ?? user?.ID_Member ?? null
  } catch {
    return null
  }
}