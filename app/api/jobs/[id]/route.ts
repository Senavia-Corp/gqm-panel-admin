import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
const JOBS_BASE  = `${PYTHON_BASE_URL}jobs`
const TIMEOUT_MS = 30_000

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
        ...(init?.headers ?? {}),   // ← caller-supplied headers win
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
      return { ok: false, status: res.status, data: null, error: detail }
    }

    return { ok: true, status: res.status, data: data ?? (text ? text : null), error: null }
  } catch (e: any) {
    const isAbort = e?.name === "AbortError"
    return {
      ok:     false,
      status: isAbort ? 504 : 502,
      data:   null,
      error:  isAbort
        ? `Request timeout after ${TIMEOUT_MS}ms`
        : e?.message ?? "Failed to connect to Python API",
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_URL env var", 500)

  const { id } = await ctx.params
  const idJobs = String(id ?? "")
  if (!idJobs) return jsonError("Missing job id", 400)

  const url = `${JOBS_BASE}/${encodeURIComponent(idJobs)}`
  console.log("[jobs proxy] GET by ID_Jobs ->", url)

  // GETs don't need X-User-Id
  const result = await proxyFetch(url, { method: "GET" })
  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data)
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

  const body = await request.json().catch(() => null)
  if (!body) return jsonError("Invalid JSON body", 400)

  const { id } = await ctx.params
  const idJob  = String(id ?? "").trim()
  if (!idJob) return jsonError("Missing job id", 400)

  const search = request.nextUrl.search?.trim() ?? ""
  const url    = `${JOBS_BASE}/${encodeURIComponent(idJob)}${search}`
  console.log("[jobs proxy] PATCH ->", url)

  // ── Forward X-User-Id so the Python audit decorator can read it ──────────
  const userId = request.headers.get("X-User-Id")

  const result = await proxyFetch(url, {
    method:  "PATCH",
    body:    JSON.stringify(body),
    headers: userId ? { "X-User-Id": userId } : {},   // ← forwarded
  })

  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data)
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

  const { id } = await ctx.params
  const idJob  = String(id ?? "").trim()
  if (!idJob) return jsonError("Missing job id", 400)

  const search = request.nextUrl.search?.trim() ?? ""
  const url    = `${JOBS_BASE}/${encodeURIComponent(idJob)}${search}`
  console.log("[jobs proxy] DELETE ->", url)

  // ── Forward X-User-Id so the Python audit decorator can read it ──────────
  const userId = request.headers.get("X-User-Id")

  const result = await proxyFetch(url, {
    method:  "DELETE",
    headers: userId ? { "X-User-Id": userId } : {},   // ← forwarded
  })

  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data ?? { success: true })
}