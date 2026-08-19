"use client"

import { useState, useEffect, useCallback } from "react"

export function usePermissions() {
  const [policies, setPolicies] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false

    // 1) Semilla desde localStorage: evita que la UI parpadee sin permisos
    //    mientras llega la respuesta del servidor.
    const savedPolicies = localStorage.getItem("user_policies")
    if (savedPolicies) {
      try {
        setPolicies(JSON.parse(savedPolicies))
      } catch (e) {
        console.error("Failed to parse user policies", e)
      }
    }

    // 2) Y acto seguido se piden las vigentes. Antes esto no existía: las
    //    políticas se escribían SOLO en el login y no se refrescaban nunca, así
    //    que un cambio de rol no tenía efecto y una copia ausente o vacía dejaba
    //    `hasPermission` devolviendo false para todo — el sidebar se quedaba en
    //    cuatro entradas sin avisar de nada.
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const fresh = data?.user_data?.policies
        if (!Array.isArray(fresh) || cancelled) return
        setPolicies(fresh)
        localStorage.setItem("user_policies", JSON.stringify(fresh))
      } catch {
        // Sin red se sigue con la semilla local: el servidor es quien manda de
        // verdad en cada petición, esto solo decide qué se dibuja.
      }
    })()

    return () => { cancelled = true }
  }, [])

  const hasPermission = useCallback((action: string, resource: string = "*"): boolean => {
    if (!policies || policies.length === 0) return false

    let allowed = false

    const matchWildcard = (pattern: string, text: string) => {
      if (pattern === text) return true
      if (pattern === "*") return true
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1)
        return text.startsWith(prefix)
      }
      return false
    }

    for (const policy of policies) {
      if (!policy || !policy.Statement) continue

      for (const statement of policy.Statement) {
        const { Effect, Action, Resource } = statement

        const actionsInStatement = Array.isArray(Action) ? Action : [Action]
        const resourcesInStatement = Array.isArray(Resource) ? Resource : (Resource ? [Resource] : ["*"])

        const actionMatch = actionsInStatement.some((a) => matchWildcard(a, action))
        const resourceMatch = resourcesInStatement.some((r) => matchWildcard(r, resource))

        if (actionMatch && resourceMatch) {
          if (Effect === "Deny") {
            return false
          } else if (Effect === "Allow") {
            allowed = true
          }
        }
      }
    }

    return allowed
  }, [policies])

  return { hasPermission, policies }
}
