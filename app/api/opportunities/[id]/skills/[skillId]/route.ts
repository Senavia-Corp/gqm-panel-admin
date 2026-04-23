import { type NextRequest, NextResponse } from "next/server"

const BASE = process.env.PYTHON_API_BASE_URL ?? ""
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

type Params = { params: Promise<{ id: string; skillId: string }> }

/** POST /api/opportunities/[id]/skills/[skillId] — link skill */
export async function POST(request: NextRequest, { params }: Params) {
  const { id, skillId } = await params
  const authHeader = request.headers.get("Authorization")
  const url = `${BASE}/opportunities_skills/opportunities/${id}/skills/${skillId}`
  const result = await proxyFetch(url, { method: "POST" }, authHeader)
  if (!result.ok) return jsonError(`API error (${result.status})`, result.status, { detail: result.error })
  return NextResponse.json(result.data)
}

/** DELETE /api/opportunities/[id]/skills/[skillId] — unlink skill */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, skillId } = await params
  const authHeader = request.headers.get("Authorization")
  const url = `${BASE}/opportunities_skills/opportunities/${id}/skills/${skillId}`
  const result = await proxyFetch(url, { method: "DELETE" }, authHeader)
  if (!result.ok) return jsonError(`API error (${result.status})`, result.status, { detail: result.error })
  return NextResponse.json(result.data)
}
