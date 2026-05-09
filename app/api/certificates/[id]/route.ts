import { type NextRequest, NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

const API_BASE = getBackendUrl()

type Ctx = { params: Promise<{ id: string }> }

function fwdHeaders(req: NextRequest): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  const auth   = req.headers.get("Authorization")
  const userId = req.headers.get("X-User-Id")
  if (auth)   h["Authorization"] = auth
  if (userId) h["X-User-Id"]     = userId
  return h
}

// GET /api/certificates/[id]
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const url = `${API_BASE}/certificate/${encodeURIComponent(id)}`
    const res = await fetch(url, { method: "GET", headers: fwdHeaders(req), cache: "no-store" })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: "Proxy error", details: e?.message }, { status: 500 })
  }
}

// PATCH /api/certificates/[id]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const payload = await req.json()
    const url = `${API_BASE}/certificate/${encodeURIComponent(id)}`
    const res = await fetch(url, {
      method: "PATCH",
      headers: fwdHeaders(req),
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: "Proxy error", details: e?.message }, { status: 500 })
  }
}

// DELETE /api/certificates/[id]
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const url = `${API_BASE}/certificate/${encodeURIComponent(id)}`
    const res = await fetch(url, { method: "DELETE", headers: fwdHeaders(req), cache: "no-store" })
    const body = await res.json().catch(() => ({ success: true }))
    return NextResponse.json(body, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: "Proxy error", details: e?.message }, { status: 500 })
  }
}
