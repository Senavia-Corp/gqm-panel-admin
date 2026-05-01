// app/api/timeline/client/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
const TIMEOUT_MS = 30_000

function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

  const { id } = await ctx.params
  const idClient = String(id ?? "").trim()
  if (!idClient) return jsonError("Missing client id", 400)

  const { searchParams } = _request.nextUrl
  const params = new URLSearchParams()
  if (searchParams.get("page"))  params.set("page",  searchParams.get("page")!)
  if (searchParams.get("limit")) params.set("limit", searchParams.get("limit")!)
  const qs = params.toString()

  const url = `${PYTHON_BASE_URL.replace(/\/$/, "")}/tlactivity/client/${encodeURIComponent(idClient)}${qs ? `?${qs}` : ""}`
  console.log("[timeline proxy] GET by ID_Client ->", url)

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method:  "GET",
      cache:   "no-store",
      headers: { "Content-Type": "application/json" },
      signal:  controller.signal,
    })

    const data = await res.json().catch(() => [])

    if (!res.ok) {
      const detail = data?.detail ?? data?.error ?? `Python API returned ${res.status}`
      return jsonError(detail, res.status)
    }

    return NextResponse.json(data)
  } catch (e: any) {
    const isAbort = e?.name === "AbortError"
    return jsonError(
      isAbort ? `Request timeout after ${TIMEOUT_MS}ms` : e?.message ?? "Failed to connect",
      isAbort ? 504 : 502
    )
  } finally {
    clearTimeout(timeout)
  }
}
