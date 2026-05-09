import { type NextRequest, NextResponse } from "next/server"

const BASE = (process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms").replace(/\/$/, "")

function fwdHeaders(req: NextRequest) {
  const auth   = req.headers.get("Authorization") ?? ""
  const userId = req.headers.get("X-User-Id")
  return {
    "Content-Type": "application/json",
    ...(auth   ? { Authorization: auth }    : {}),
    ...(userId ? { "X-User-Id": userId }    : {}),
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const upstream = new URL(`${BASE}/manager/`)
  const page  = searchParams.get("page")  ?? "1"
  const limit = searchParams.get("limit") ?? "100"
  const q     = searchParams.get("q")

  upstream.searchParams.set("page",  page)
  upstream.searchParams.set("limit", limit)
  if (q) upstream.searchParams.set("q", q)

  const res = await fetch(upstream.toString(), { method: "GET", headers: fwdHeaders(request), cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const res  = await fetch(`${BASE}/manager/`, {
    method:  "POST",
    headers: fwdHeaders(request),
    body:    JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
