import { type NextRequest, NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

export const dynamic = "force-dynamic"

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
  const start = Date.now()
  try {
    const { subcId } = await params
    const payload = await req.json()
    const url = `${API_BASE}/certificate/`
    
    console.log(`[cert create proxy] Starting POST for subc: ${subcId}`)
    console.log(`[cert create proxy] Destination: ${url}`)

    const res = await fetch(url, {
      method: "POST",
      headers: fwdHeaders(req),
      body: JSON.stringify({ ...payload, ID_Subcontractor: subcId }),
      cache: "no-store",
    })

    const duration = Date.now() - start
    console.log(`[cert create proxy] Backend responded with status ${res.status} in ${duration}ms`)

    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (e: any) {
    const duration = Date.now() - start
    console.error(`[cert create proxy] FATAL ERROR after ${duration}ms:`, e?.message)
    return NextResponse.json({ error: "Proxy error", details: e?.message }, { status: 500 })
  }
}
