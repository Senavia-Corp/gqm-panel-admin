/**
 * Única fuente de la URL del backend Python (server-side).
 *
 * Sin PYTHON_API_BASE_URL el proxy no puede operar y se falla con un error
 * claro (el handler responde 500) — jamás un fallback a devtunnels ni a
 * producción (REG-022/REG-045).
 */
export function getBackendUrl() {
  const url = process.env.PYTHON_API_BASE_URL
  if (!url) {
    throw new Error(
      "PYTHON_API_BASE_URL no está configurada — el proxy del panel no sabe a qué backend hablar",
    )
  }
  return url.replace(/\/+$/, "")
}
