import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
const JOBS_BASE       = `${PYTHON_BASE_URL}jobs`

const DEFAULT_PAGE  = "1"
const DEFAULT_LIMIT = "10"
const TIMEOUT_MS    = 120_000

function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

async function proxyFetch(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    })

    const text = await res.text()
    let data: any = null
    if (text) {
      try { data = JSON.parse(text) } catch { data = null }
    }

    if (!res.ok) {
      const detail =
        (data && (data.detail || data.error || data.message)) ??
        text?.slice(0, 1000) ??
        `Python API returned ${res.status}`
      return { ok: false, status: res.status, data: null, raw: text, error: detail }
    }

    return { ok: true, status: res.status, data: data ?? (text ? text : null), raw: text, error: null }
  } catch (e: any) {
    const isAbort = e?.name === "AbortError"
    return {
      ok:     false,
      status: isAbort ? 504 : 502,
      data:   null,
      raw:    null,
      error:  isAbort
        ? `Request timeout after ${TIMEOUT_MS}ms`
        : e?.message ?? "Failed to connect to Python API",
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_URL env var", 500)

  const { searchParams } = new URL(request.url)

  const page   = searchParams.get("page")  ?? DEFAULT_PAGE
  const limit  = searchParams.get("limit") ?? DEFAULT_LIMIT
  const status = searchParams.get("status")
  const type   = searchParams.get("type")
  const year   = searchParams.get("year")
  const search = searchParams.get("search")

  const clientId        = searchParams.get("clientId")
  const memberId        = searchParams.get("memberId")
  const subcontractorId = searchParams.get("subcontractorId")
  const dateAssigned    = searchParams.get("dateAssigned")

  const params = new URLSearchParams()
  params.set("page",  page)
  params.set("limit", limit)
  if (type)            params.set("type",            type)
  if (year)            params.set("year",            year)
  if (status)          params.set("status",          status)
  if (search)          params.set("search",          search)
  if (clientId)        params.set("clientId",        clientId)
  if (memberId)        params.set("memberId",        memberId)
  if (subcontractorId) params.set("subcontractorId", subcontractorId)
  if (dateAssigned)    params.set("dateAssigned",    dateAssigned)

  const url = `${JOBS_BASE}/jobs_table?${params.toString()}`
  console.log("[jobs proxy] GET jobs_table ->", url)

  const result = await proxyFetch(url, { method: "GET" })
  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data)
}

export async function POST(request: NextRequest) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_URL env var", 500)

  const { searchParams } = new URL(request.url)
  const syncPodio = (searchParams.get("sync_podio") ?? "false").toLowerCase() === "true"

  const body = await request.json().catch(() => null)
  if (!body) return jsonError("Invalid JSON body", 400)

  // ── Extract year from body and forward it as a query param to Python ──────
  // The Python backend expects year as ?year=2025, not inside the JSON body.
  const year                    = body?.year ?? null
  const { year: _year, ...jobPayload } = body   // strip year from the payload

  const params = new URLSearchParams()
  params.set("sync_podio", syncPodio ? "true" : "false")
  if (year) params.set("year", String(year))

  const url = `${JOBS_BASE}/?${params.toString()}`
  console.log("[jobs proxy] POST ->", url)

  const userId = request.headers.get("X-User-Id")

  const result = await proxyFetch(url, {
    method:  "POST",
    body:    JSON.stringify(jobPayload),
    headers: userId ? { "X-User-Id": userId } : {},
  })

  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data)
}