// app/api/chat/job/[jobId]/route.ts
//
// Proxy entre el frontend y los endpoints del chat en Python:
//   GET  /chat/job/<id_job>?desde_id=MSG001  → lista mensajes
//   POST /chat/job/<id_job>                  → envía un mensaje
//
// El backend usa el JWT para identificar al miembro que escribe.
// El proxy lo forwardea sin modificarlo — nunca toca el body para inyectar IDs.

import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const TIMEOUT_MS      = 15_000

type Ctx = { params: Promise<{ jobId: string }> }

function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

async function proxyFetch(url: string, init: RequestInit) {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      ...init,
      cache:  "no-store",
      signal: controller.signal,
    })

    const text = await res.text()
    let data: unknown = null
    if (text) {
      try { data = JSON.parse(text) } catch { data = null }
    }

    if (!res.ok) {
      const detail =
        (data && typeof data === "object" &&
          ((data as any).detail ?? (data as any).error ?? (data as any).message)) ??
        text?.slice(0, 500) ??
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

// ─── GET /api/chat/job/[jobId] ────────────────────────────────────────────────
// Query params forwarded:
//   ?desde_id=MSG001   (optional — for incremental polling)
//
// Returns the last 50 messages on first load, or only newer messages
// when desde_id is provided.

export async function GET(request: NextRequest, ctx: Ctx) {
  const { jobId } = await ctx.params
  if (!jobId) return jsonError("Missing jobId", 400)

  // Forward the JWT so Python can validate the member session
  const authorization = request.headers.get("Authorization")
  if (!authorization) return jsonError("Missing Authorization header", 401)

  // Forward optional polling param
  const { searchParams } = new URL(request.url)
  const desdeId = searchParams.get("desde_id")

  const qs  = desdeId ? `?desde_id=${encodeURIComponent(desdeId)}` : ""
  const url = `${PYTHON_BASE_URL}/chat/job/${encodeURIComponent(jobId)}${qs}`
  console.log("[chat proxy] GET →", url)

  const result = await proxyFetch(url, {
    method:  "GET",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": authorization,
    },
  })

  if (!result.ok) {
    return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
  }

  return NextResponse.json(result.data)
}

// ─── POST /api/chat/job/[jobId] ───────────────────────────────────────────────
// Body: { content: string }
//
// The member ID is extracted from the JWT by the Python backend.
// The frontend must NOT include ID_Member in the body.

export async function POST(request: NextRequest, ctx: Ctx) {
  const { jobId } = await ctx.params
  if (!jobId) return jsonError("Missing jobId", 400)

  // Forward the JWT — Python needs it to identify the sender
  const authorization = request.headers.get("Authorization")
  if (!authorization) return jsonError("Missing Authorization header", 401)

  const body = await request.json().catch(() => null)
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return jsonError("Request body must include a non-empty 'content' field", 400)
  }

  const url = `${PYTHON_BASE_URL}/chat/job/${encodeURIComponent(jobId)}`
  console.log("[chat proxy] POST →", url)

  const result = await proxyFetch(url, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": authorization,
    },
    body: JSON.stringify({ content: body.content }),
  })

  if (!result.ok) {
    return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
  }

  return NextResponse.json(result.data, { status: 201 })
}