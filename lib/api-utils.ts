/**
 * Utility to get and sanitize the backend API URL.
 * Ensures no trailing slashes and logs clearly.
 */
export function getBackendUrl() {
  const url = process.env.PYTHON_API_BASE_URL || "https://gqm-api.vercel.app/"
  const sanitized = url.replace(/\/+$/, "")
  
  if (process.env.NODE_ENV === "development") {
    // console.log(`[API Proxy] Using backend: ${sanitized}`)
  }
  
  return sanitized
}
