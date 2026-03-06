import type { Multiplier } from "@/lib/types"

const MULTIPLIERS_API_URL = "/api/multipliers"
const JOB_MULTIPLIERS_API_URL = "/api/job-multipliers"

interface MultipliersAPIResponse {
  limit: number
  page: number
  results: Multiplier[]
  total: number
}

export async function fetchMultipliers(): Promise<Multiplier[]> {
  try {
    console.log("[v0] Fetching multipliers from API proxy")

    const response = await fetch(`${MULTIPLIERS_API_URL}?page=1&limit=100`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    console.log("[v0] Multipliers response:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] Error fetching multipliers:", errorData)
      throw new Error(`Failed to fetch multipliers: ${response.status}`)
    }

    const data: MultipliersAPIResponse = await response.json()
    console.log("[v0] Received", data.results.length, "multipliers from API")
    return data.results
  } catch (error) {
    console.error("[v0] Error fetching multipliers:", error)
    throw error
  }
}

export async function createMultiplier(multiplierData: {
  Start_value: number
  End_value: number
  Multiplier: number
}): Promise<Multiplier> {
  try {
    console.log("[v0] Creating multiplier:", multiplierData)

    const response = await fetch(MULTIPLIERS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(multiplierData),
    })

    console.log("[v0] Create multiplier response:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] Error creating multiplier:", errorData)
      throw new Error(`Failed to create multiplier: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Successfully created multiplier:", data)
    return data
  } catch (error) {
    console.error("[v0] Error creating multiplier:", error)
    throw error
  }
}

export async function linkMultiplierToJob(jobId: string, multiplierId: string): Promise<any> {
  try {
    console.log("[v0] Linking multiplier", multiplierId, "to job", jobId)

    const response = await fetch(JOB_MULTIPLIERS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, multiplierId }),
    })

    console.log("[v0] Link multiplier response:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] Error linking multiplier:", errorData)
      throw new Error(`Failed to link multiplier: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Successfully linked multiplier:", data)
    return data
  } catch (error) {
    console.error("[v0] Error linking multiplier:", error)
    throw error
  }
}

export async function unlinkMultiplierFromJob(jobId: string, multiplierId: string): Promise<any> {
  try {
    console.log("[v0] Unlinking multiplier", multiplierId, "from job", jobId)

    const response = await fetch(JOB_MULTIPLIERS_API_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, multiplierId }),
    })

    console.log("[v0] Unlink multiplier response:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] Error unlinking multiplier:", errorData)
      throw new Error(`Failed to unlink multiplier: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Successfully unlinked multiplier:", data)
    return data
  } catch (error) {
    console.error("[v0] Error unlinking multiplier:", error)
    throw error
  }
}

export function findApplicableMultiplier(formulaPricing: number, multipliers: Multiplier[]): Multiplier | null {
  const applicable = multipliers.filter((m) => {
    const s = Number(m.Start_value)
    const e = Number(m.End_value)
    return Number.isFinite(s) && Number.isFinite(e) && formulaPricing >= s && formulaPricing <= e
  })

  if (applicable.length === 0) return null

  applicable.sort((a, b) => {
    const ra = Number(a.End_value) - Number(a.Start_value)
    const rb = Number(b.End_value) - Number(b.Start_value)
    if (ra !== rb) return ra - rb // más específico primero
    return Number(b.Start_value) - Number(a.Start_value) // luego el más “alto”
  })

  return applicable[0]
}

export function calculateAdjFormulaPricing(formulaPricing: number, multiplier: Multiplier | null): number {
  if (!multiplier) return formulaPricing
  return formulaPricing * multiplier.Multiplier
}
