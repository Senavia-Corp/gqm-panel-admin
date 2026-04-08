"use client"

import { useState, useEffect } from "react"

export function usePermissions() {
  const [policies, setPolicies] = useState<any[]>([])

  useEffect(() => {
    // Load policies from localStorage
    const savedPolicies = localStorage.getItem("user_policies")
    if (savedPolicies) {
      try {
        setPolicies(JSON.parse(savedPolicies))
      } catch (e) {
        console.error("Failed to parse user policies", e)
      }
    }
  }, [])

  const hasPermission = (action: string, resource: string = "*"): boolean => {
    // If no policies exist, default to false
    if (!policies || policies.length === 0) return false

    let allowed = false

    // helper function to match wildcards e.g., "job:*"
    const matchWildcard = (pattern: string, text: string) => {
      if (pattern === text) return true
      if (pattern === "*") return true
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1)
        return text.startsWith(prefix) // e.g., text="job:create", prefix="job:"
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
            return false // Deny overrules everything
          } else if (Effect === "Allow") {
            allowed = true
          }
        }
      }
    }

    return allowed
  }

  return { hasPermission, policies }
}
