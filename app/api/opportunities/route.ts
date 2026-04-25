import { type NextRequest, NextResponse } from "next/server"

const BASE = process.env.PYTHON_API_BASE_URL ?? ""
const OPP_BASE = `${BASE}/oppotunities`
const TIMEOUT_MS = 120_000

function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

async function proxyFetch(url: string, init?: RequestInit, authHeader?: string | null) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    })
    const text = await res.text()
    let data: any = null
    if (text) { try { data = JSON.parse(text) } catch { data = null } }
    if (!res.ok) {
      const detail = (data && (data.detail || data.error || data.message)) ?? text?.slice(0, 1000) ?? `API error ${res.status}`
      return { ok: false, status: res.status, data: null, error: detail }
    }
    return { ok: true, status: res.status, data: data ?? (text || null), error: null }
  } catch (e: any) {
    const isAbort = e?.name === "AbortError"
    return { ok: false, status: isAbort ? 504 : 502, data: null, error: isAbort ? `Timeout after ${TIMEOUT_MS}ms` : e?.message ?? "Connection failed" }
  } finally {
    clearTimeout(timeout)
  }
}

/** GET /api/opportunities?page=1&limit=10&q=...&state=active&priority=High */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get("Authorization")
  const params = new URLSearchParams()
  ;(["page", "limit", "q", "state", "priority", "job_id"] as const).forEach((k) => {
    const v = searchParams.get(k)
    if (v) params.set(k, v)
  })
  const result = await proxyFetch(`${OPP_BASE}/?${params}`, { method: "GET" }, authHeader)
  if (!result.ok) return jsonError(`API error (${result.status})`, result.status, { detail: result.error })
  return NextResponse.json(result.data)
}

/** POST /api/opportunities */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  const body = await request.json().catch(() => null)
  if (!body) return jsonError("Invalid JSON body", 400)
  const result = await proxyFetch(`${OPP_BASE}/`, { method: "POST", body: JSON.stringify(body) }, authHeader)
  if (!result.ok) return jsonError(`API error (${result.status})`, result.status, { detail: result.error })
  return NextResponse.json(result.data, { status: 201 })
}
