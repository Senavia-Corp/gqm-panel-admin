// app/api/change-order/[id]/route.ts  (GET + PATCH + DELETE — X-User-Id added to PATCH/DELETE)
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ detail: "Missing id" }, { status: 400 })
    const pythonUrl = new URL(`${PYTHON_API_URL}/change_order/${encodeURIComponent(id)}`)
    new URL(request.url).searchParams.forEach((v, k) => pythonUrl.searchParams.set(k, v))
    const response = await fetch(pythonUrl.toString(), { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" })
    const ct   = response.headers.get("content-type") || ""
    const body = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(body, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ detail: "Proxy error", error: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ detail: "Missing id" }, { status: 400 })

    const incomingUrl = new URL(request.url)
    const syncPodio   = incomingUrl.searchParams.get("sync_podio")
    const year        = incomingUrl.searchParams.get("year")
    const body        = await request.json()

    const pythonUrl = new URL(`${PYTHON_API_URL}/change_order/${encodeURIComponent(id)}`)
    if (syncPodio != null) pythonUrl.searchParams.set("sync_podio", syncPodio)
    if (year      != null) pythonUrl.searchParams.set("year", year)

    // ── Forward X-User-Id ───────────────────────────────────────────────────
    const userId  = request.headers.get("X-User-Id")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(pythonUrl.toString(), { method: "PATCH", headers, body: JSON.stringify(body), redirect: "follow" })
    const ct       = response.headers.get("content-type") || ""
    const respBody = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(respBody, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ detail: "Internal server error", error: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ detail: "Missing id" }, { status: 400 })

    const incomingUrl = new URL(request.url)
    const syncPodio   = incomingUrl.searchParams.get("sync_podio")
    const year        = incomingUrl.searchParams.get("year")

    const pythonUrl = new URL(`${PYTHON_API_URL}/change_order/${encodeURIComponent(id)}`)
    if (syncPodio != null) pythonUrl.searchParams.set("sync_podio", syncPodio)
    if (year      != null) pythonUrl.searchParams.set("year", year)

    // ── Forward X-User-Id ───────────────────────────────────────────────────
    const userId  = request.headers.get("X-User-Id")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(pythonUrl.toString(), { method: "DELETE", headers, cache: "no-store" })
    const ct       = response.headers.get("content-type") || ""
    const respBody = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(respBody, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ detail: "Internal server error", error: e?.message ?? String(e) }, { status: 500 })
  }
}