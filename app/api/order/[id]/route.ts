// app/api/order/[id]/route.ts  (PATCH + DELETE — X-User-Id added)
import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_API_URL = getBackendUrl()

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const incomingUrl = new URL(request.url)
    const syncPodio   = incomingUrl.searchParams.get("sync_podio")
    const year        = incomingUrl.searchParams.get("year")
    const body        = await request.json()

    const pythonUrl = new URL(`${PYTHON_API_URL}/order/${encodeURIComponent(id)}`)
    if (syncPodio != null) pythonUrl.searchParams.set("sync_podio", syncPodio)
    if (year      != null) pythonUrl.searchParams.set("year", year)

    // ── Forward X-User-Id ───────────────────────────────────────────────────
    const userId  = request.headers.get("X-User-Id")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const _authHeader = (request.headers.get("authorization") || request.headers.get("Authorization") || "");
    if (_authHeader) headers["Authorization"] = _authHeader;
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(pythonUrl.toString(), { method: "PATCH", headers, body: JSON.stringify(body) })
    const ct       = response.headers.get("content-type") || ""
    const respBody = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(respBody, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ detail: "Proxy error", error: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const incomingUrl = new URL(request.url)
    const syncPodio   = incomingUrl.searchParams.get("sync_podio")
    const year        = incomingUrl.searchParams.get("year")

    const pythonUrl = new URL(`${PYTHON_API_URL}/order/${encodeURIComponent(id)}`)
    if (syncPodio != null) pythonUrl.searchParams.set("sync_podio", syncPodio)
    if (year      != null) pythonUrl.searchParams.set("year", year)

    // ── Forward X-User-Id ───────────────────────────────────────────────────
    const userId  = request.headers.get("X-User-Id")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const _authHeader = (request.headers.get("authorization") || request.headers.get("Authorization") || "");
    if (_authHeader) headers["Authorization"] = _authHeader;
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(pythonUrl.toString(), { method: "DELETE", headers })
    const ct       = response.headers.get("content-type") || ""
    const respBody = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(respBody, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ detail: "Proxy error", error: e?.message ?? String(e) }, { status: 500 })
  }
}
export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const headers: Record<string, string> = {}
    const auth = request.headers.get("authorization")
    if (auth) headers["Authorization"] = auth
    const response = await fetch(`${PYTHON_API_URL}/order/${encodeURIComponent(id)}`, {
      headers, cache: "no-store",
    })
    const body = await response.json().catch(() => ({}))
    return NextResponse.json(body, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Proxy error" }, { status: 500 })
  }
}
