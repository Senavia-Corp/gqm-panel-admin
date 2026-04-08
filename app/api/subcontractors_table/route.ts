/**
 * app/api/subcontractors_table/route.ts
 *
 * Proxy hacia GET /subcontractors/subcontractors_table del backend Python.
 * Reenvía: page, limit, status, q
 */
import { type NextRequest, NextResponse } from "next/server"

const BASE = process.env.PYTHON_API_BASE_URL ?? ""

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const upstream = new URL(`${BASE}/subcontractors/subcontractors_table`)
    ;(["page", "limit", "status", "q"] as const).forEach((key) => {
      const val = searchParams.get(key)
      if (val !== null && val !== "") upstream.searchParams.set(key, val)
    })

    console.log("[proxy] GET /subcontractors_table →", upstream.toString())

    const authHeader = request.headers.get("Authorization")
    const res = await fetch(upstream.toString(), {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, detail: errText.slice(0, 300) },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error("[proxy] /subcontractors_table exception:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}