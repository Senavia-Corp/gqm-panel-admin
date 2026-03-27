/**
 * /api/jobs/by-member-role/route.ts
 *
 * Proxy → Python GET /jobs/by-member-role
 *
 * Accepted query params (all forwarded to Python):
 *   member_id  string   required
 *   rol        string   required  e.g. "Acc Rep Selling" | "Mgmt Member"
 *   type       string   optional  QID | PTL | PAR
 *   year       string   optional  e.g. "2026"
 *   month      string   optional  e.g. "JANUARY"
 *   page       number   optional  default 1
 *   limit      number   optional  default 50
 */

import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://localhost:80/"
const JOBS_BASE       = `${PYTHON_BASE_URL}jobs`
const TIMEOUT_MS      = 60_000

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
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: controller.signal,
    })
    const text = await res.text()
    let data: any = null
    if (text) { try { data = JSON.parse(text) } catch { data = null } }
    if (!res.ok) {
      const detail = (data && (data.detail || data.error || data.message)) ?? text?.slice(0, 1000) ?? `Python API returned ${res.status}`
      return { ok: false, status: res.status, data: null, error: detail }
    }
    return { ok: true, status: res.status, data: data ?? (text || null), error: null }
  } catch (e: any) {
    const isAbort = e?.name === "AbortError"
    return { ok: false, status: isAbort ? 504 : 502, data: null, error: isAbort ? `Timeout after ${TIMEOUT_MS}ms` : (e?.message ?? "Connection failed") }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

  const { searchParams } = new URL(request.url)

  const memberId = searchParams.get("member_id")
  const rol      = searchParams.get("rol")

  if (!memberId) return jsonError("Missing required query param: member_id", 400)
  if (!rol)      return jsonError("Missing required query param: rol", 400)

  // Build forwarded params — Python will ignore unknown ones gracefully
  const params = new URLSearchParams()
  params.set("member_id", memberId)
  params.set("rol",       rol)

  const type  = searchParams.get("type")
  const year  = searchParams.get("year")
  const month = searchParams.get("month")
  const page  = searchParams.get("page")  ?? "1"
  const limit = searchParams.get("limit") ?? "50"

  if (type)  params.set("type",  type)
  if (year)  params.set("year",  year)
  if (month) params.set("month", month)
  params.set("page",  page)
  params.set("limit", limit)

  const url = `${JOBS_BASE}/by-member-role?${params.toString()}`
  console.log("[jobs/by-member-role proxy] GET ->", url)

  const result = await proxyFetch(url, { method: "GET" })
  if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })

  return NextResponse.json(result.data)
}