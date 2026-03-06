// app/api/estimate/[id]/route.ts  (PATCH + DELETE — X-User-Id added)
import { NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL || process.env.API_BASE_URL || "https://6qh4h0kx-80.use.devtunnels.ms"

type Ctx = { params: Promise<{ id: string }> }

function buildHeaders(req: Request): Headers {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  // Forward auth if present
  const auth = req.headers.get("authorization")
  if (auth) headers.set("authorization", auth)
  // ── Forward X-User-Id ───────────────────────────────────────────────────
  const userId = req.headers.get("X-User-Id")
  if (userId) headers.set("X-User-Id", userId)
  return headers
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!API_BASE_URL) return NextResponse.json({ error: "Missing API_BASE_URL" }, { status: 500 })

  const upstream = await fetch(`${API_BASE_URL}/estimate/${encodeURIComponent(id)}`, {
    method: "DELETE", headers: buildHeaders(req), cache: "no-store",
  })
  const text = await upstream.text().catch(() => "")
  try { return NextResponse.json(text ? JSON.parse(text) : {}, { status: upstream.status }) }
  catch { return new NextResponse(text, { status: upstream.status }) }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!API_BASE_URL) return NextResponse.json({ error: "Missing API_BASE_URL" }, { status: 500 })

  const body     = await req.json().catch(() => ({}))
  const upstream = await fetch(`${API_BASE_URL}/estimate/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: buildHeaders(req), body: JSON.stringify(body), cache: "no-store",
  })
  const text = await upstream.text().catch(() => "")
  try { return NextResponse.json(text ? JSON.parse(text) : {}, { status: upstream.status }) }
  catch { return new NextResponse(text, { status: upstream.status }) }
}