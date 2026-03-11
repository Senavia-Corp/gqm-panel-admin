import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
const SUBCONTRACTORS_BASE = `${PYTHON_BASE_URL}subcontractors`

const DEFAULT_PAGE = "1"
const DEFAULT_LIMIT = "10"
const TIMEOUT_MS = 120_000

function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

async function proxyFetch(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

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
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
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
      ok: false,
      status: isAbort ? 504 : 502,
      data: null,
      raw: null,
      error: isAbort ? `Request timeout after ${TIMEOUT_MS}ms` : e?.message ?? "Failed to connect to Python API",
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

  const { searchParams } = new URL(request.url)

  // mode:
  // - "table" -> /subcontractors/subcontractors_table (ligero + paginado)
  // - default -> /subcontractors/ (pesado)
  const mode = (searchParams.get("mode") ?? "").toLowerCase()

  // Optional: allow GET by ID from same proxy: /api/subcontractors?id=SUBC123
  const id = searchParams.get("id")

  // -------------------------
  // GET by ID (full object)
  // -------------------------
  if (id) {
    const url = `${SUBCONTRACTORS_BASE}/${encodeURIComponent(id)}`
    console.log("[subcontractors proxy] GET by id ->", url)

    const result = await proxyFetch(url, { method: "GET" })
    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

    return NextResponse.json(result.data)
  }

  // -------------------------
  // Optimized table endpoint
  // -------------------------
  if (mode === "table") {
    const page = searchParams.get("page") ?? DEFAULT_PAGE
    const limit = searchParams.get("limit") ?? DEFAULT_LIMIT
    const status = searchParams.get("status")

    const endpoint = `${SUBCONTRACTORS_BASE}/subcontractors_table`

    const params = new URLSearchParams()
    params.set("page", page)
    params.set("limit", limit)
    if (status) params.set("status", status)

    const url = `${endpoint}?${params.toString()}`
    console.log("[subcontractors proxy] GET subcontractors_table ->", url)

    const result = await proxyFetch(url, { method: "GET" })
    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

    return NextResponse.json(result.data)
  }

  // -------------------------
  // Default: full list (heavy)
  // -------------------------
  const pythonUrl = `${SUBCONTRACTORS_BASE}/`
  console.log("[subcontractors proxy] GET full list ->", pythonUrl)

  const result = await proxyFetch(pythonUrl, { method: "GET" })
  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data)
}

export async function POST(request: NextRequest) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

  const { searchParams } = new URL(request.url)
  const syncPodio = (searchParams.get("sync_podio") ?? "false").toLowerCase() === "true"

  const body = await request.json().catch(() => null)
  if (!body) return jsonError("Invalid JSON body", 400)

  const url = `${SUBCONTRACTORS_BASE}/?sync_podio=${syncPodio ? "true" : "false"}`
  console.log("[subcontractors proxy] POST Body ->", JSON.stringify(body))

  const result = await proxyFetch(url, { method: "POST", body: JSON.stringify(body) })
  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data)
}