// app/api/job-subcontractor/route.ts
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
const PYTHON_API_URL  = `${PYTHON_BASE_URL}job_subcontractor`
const TIMEOUT_MS      = 120_000

function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

async function proxyFetch(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res  = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, signal: controller.signal })
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    if (!res.ok) {
      const detail = (data && (data.detail || data.error || data.message)) ?? text?.slice(0, 1000) ?? `Python API returned ${res.status}`
      return { ok: false, status: res.status, data: null, error: detail }
    }
    return { ok: true, status: res.status, data: data ?? (text || null), error: null }
  } catch (e: any) {
    const isAbort = e?.name === "AbortError"
    return { ok: false, status: isAbort ? 504 : 502, data: null, error: isAbort ? `Timeout after ${TIMEOUT_MS}ms` : e?.message ?? "Failed to connect" }
  } finally { clearTimeout(timeout) }
}

function toBoolString(v: unknown) { return v ? "true" : "false" }
function normalizeYear(v: unknown): number | null {
  const n = Number(String(v ?? ""))
  return Number.isFinite(n) && n >= 2000 && n <= 2100 ? Math.trunc(n) : null
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return jsonError("Invalid JSON body", 400)

  const { jobId, subcontractorId, sync_podio, year } = body as any
  if (!jobId || !subcontractorId) return jsonError("jobId and subcontractorId are required", 400)

  const syncPodio = toBoolString(sync_podio ?? false)
  const y         = normalizeYear(year)
  if (syncPodio === "true" && !y) return jsonError("year is required when sync_podio=true", 400)

  const params = new URLSearchParams({ sync_podio: syncPodio })
  if (y) params.set("year", String(y))

  const url = `${PYTHON_API_URL}/jobs/${encodeURIComponent(jobId)}/subcontractors/${encodeURIComponent(subcontractorId)}?${params}`

  // ── Forward Authorization & X-User-Id ──────────────────────────────────────
  const authHeader = request.headers.get("Authorization")
  const userId = request.headers.get("X-User-Id")
  const result = await proxyFetch(url, { 
    method: "POST", 
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(userId ? { "X-User-Id": userId } : {}),
    }
  })
  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
  return NextResponse.json(result.data ?? { success: true })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return jsonError("Invalid JSON body", 400)

  const { jobId, subcontractorId, sync_podio, year } = body as any
  if (!jobId || !subcontractorId) return jsonError("jobId and subcontractorId are required", 400)

  const syncPodio = toBoolString(sync_podio ?? false)
  const y         = normalizeYear(year)
  if (syncPodio === "true" && !y) return jsonError("year is required when sync_podio=true", 400)

  const params = new URLSearchParams({ sync_podio: syncPodio })
  if (y) params.set("year", String(y))

  const url = `${PYTHON_API_URL}/jobs/${encodeURIComponent(jobId)}/subcontractors/${encodeURIComponent(subcontractorId)}?${params}`

  // ── Forward Authorization & X-User-Id ──────────────────────────────────────
  const authHeader = request.headers.get("Authorization")
  const userId = request.headers.get("X-User-Id")
  const result = await proxyFetch(url, { 
    method: "DELETE", 
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(userId ? { "X-User-Id": userId } : {}),
    }
  })
  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
  return NextResponse.json(result.data ?? { success: true })
}