import { type NextRequest, NextResponse } from "next/server"

const BASE = (process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms").replace(/\/$/, "")

type RouteContext = { params: Promise<{ id: string }> }

function fwdHeaders(req: NextRequest) {
  const auth   = req.headers.get("Authorization") ?? ""
  const userId = req.headers.get("X-User-Id")
  return {
    "Content-Type": "application/json",
    ...(auth   ? { Authorization: auth }    : {}),
    ...(userId ? { "X-User-Id": userId }    : {}),
  }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const res = await fetch(`${BASE}/manager/${id}`, { method: "GET", headers: fwdHeaders(_req), cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const res  = await fetch(`${BASE}/manager/${id}`, {
    method:  "PATCH",
    headers: fwdHeaders(request),
    body:    JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const res = await fetch(`${BASE}/manager/${id}`, {
    method:  "DELETE",
    headers: fwdHeaders(request),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
