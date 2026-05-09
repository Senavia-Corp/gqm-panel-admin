/**
 * Utility to get and sanitize the backend API URL.
 * Ensures no trailing slashes and logs clearly.
 */
export function getBackendUrl() {
  const url = process.env.PYTHON_API_BASE_URL || "https://6qh4h0kx-80.use.devtunnels.ms"
  const sanitized = url.replace(/\/+$/, "")
  
  if (process.env.NODE_ENV === "development") {
    // console.log(`[API Proxy] Using backend: ${sanitized}`)
  }
  
  return sanitized
}
