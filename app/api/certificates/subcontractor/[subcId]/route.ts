import { type NextRequest, NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

const API_BASE = getBackendUrl()

type Ctx = { params: Promise<{ subcId: string }> }

function fwdHeaders(req: NextRequest): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  const auth   = req.headers.get("Authorization")
  const userId = req.headers.get("X-User-Id")
  if (auth)   h["Authorization"] = auth
  if (userId) h["X-User-Id"]     = userId
  return h
}

// GET /api/certificates/subcontractor/[subcId] — list certificates by subcontractor
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { subcId } = await params
    const url = `${API_BASE}/certificate/subcontractor/${encodeURIComponent(subcId)}`
    const res = await fetch(url, { method: "GET", headers: fwdHeaders(req), cache: "no-store" })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: "Proxy error", details: e?.message }, { status: 500 })
  }
}

// POST /api/certificates/subcontractor/[subcId] — create certificate for subcontractor
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { subcId } = await params
    const payload = await req.json()
    const url = `${API_BASE}/certificate/`
    const res = await fetch(url, {
      method: "POST",
      headers: fwdHeaders(req),
      body: JSON.stringify({ ...payload, ID_Subcontractor: subcId }),
      cache: "no-store",
    })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: "Proxy error", details: e?.message }, { status: 500 })
  }
}
