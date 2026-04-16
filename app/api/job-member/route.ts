// app/api/job-member/route.ts
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL
  ? `${process.env.PYTHON_API_BASE_URL}job_member`
  : "https://6qh4h0kx-80.use.devtunnels.ms/job_member"

function parseBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v
  if (typeof v === "string")  return v.toLowerCase() === "true"
  return fallback
}
function parseYear(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) && n > 2000 ? n : null
}

export async function POST(request: NextRequest) {
  try {
    const body     = await request.json().catch(() => ({}))
    const { jobId, memberId, rol, sync_podio, year } = body ?? {}

    if (!jobId || !memberId) return NextResponse.json({ error: "jobId and memberId are required" }, { status: 400 })
    if (!rol)                return NextResponse.json({ error: "rol is required" }, { status: 400 })

    const syncPodio = parseBool(sync_podio, false)
    const y         = parseYear(year)
    if (syncPodio && !y) return NextResponse.json({ error: "year is required when sync_podio=true" }, { status: 400 })

    const url = new URL(`${PYTHON_API_URL}/jobs/${jobId}/members/${memberId}`)
    url.searchParams.set("sync_podio", syncPodio ? "true" : "false")
    if (y) url.searchParams.set("year", String(y))

    // ── Forward X-User-Id ───────────────────────────────────────────────────
    const userId  = request.headers.get("X-User-Id")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(url.toString(), { method: "POST", headers, body: JSON.stringify({ rol }) })
    const text = await response.text()
    if (!response.ok) return NextResponse.json({ error: text || "Python API error" }, { status: response.status })
    try { return NextResponse.json(text ? JSON.parse(text) : { success: true }) } catch { return NextResponse.json({ success: true }) }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body     = await request.json().catch(() => ({}))
    const { jobId, memberId, rol, sync_podio, year } = body ?? {}

    if (!jobId || !memberId) return NextResponse.json({ error: "jobId and memberId are required" }, { status: 400 })

    const syncPodio = parseBool(sync_podio, false)
    const y         = parseYear(year)
    if (syncPodio && !y) return NextResponse.json({ error: "year is required when sync_podio=true" }, { status: 400 })

    const url = new URL(`${PYTHON_API_URL}/jobs/${jobId}/members/${memberId}`)
    url.searchParams.set("sync_podio", syncPodio ? "true" : "false")
    if (y) url.searchParams.set("year", String(y))
    if (rol) url.searchParams.set("rol", String(rol))

    // ── Forward X-User-Id ───────────────────────────────────────────────────
    const userId  = request.headers.get("X-User-Id")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(url.toString(), { method: "DELETE", headers })
    const text = await response.text()
    if (!response.ok) return NextResponse.json({ error: text || "Python API error" }, { status: response.status })
    try { return NextResponse.json(text ? JSON.parse(text) : { success: true }) } catch { return NextResponse.json({ success: true }) }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}