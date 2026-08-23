"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"

/**
 * Permisos evaluados por el SERVIDOR (`/auth/can`): una sola petición por
 * montaje con todas las acciones pedidas. Fail-closed: hasta que llega la
 * respuesta —o si falla— todo es `false`. Complementa a usePermissions (que
 * evalúa en el cliente las políticas cacheadas) allí donde el gate tiene que
 * coincidir exactamente con lo que el API va a permitir.
 */
export function useCan(actions: string[]): { can: (action: string) => boolean; loaded: boolean } {
  const key = actions.join(",")
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!key) { setLoaded(true); return }
    let cancelled = false
    setLoaded(false)
    ;(async () => {
      try {
        const res = await apiFetch(`/api/auth/can?actions=${encodeURIComponent(key)}`, { cache: "no-store" })
        const data = res.ok ? await res.json() : null
        if (cancelled) return
        const r = data?.results
        setResults(r && typeof r === "object" ? r : {})
      } catch {
        if (!cancelled) setResults({})
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [key])

  const can = useMemo(() => (action: string) => results[action] === true, [results])
  return { can, loaded }
}
