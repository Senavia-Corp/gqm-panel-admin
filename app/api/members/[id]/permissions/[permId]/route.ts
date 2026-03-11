// app/api/members/[id]/permissions/[permId]/route.ts
// Wraps Python: POST/DELETE /permission_member/permission/:pid/member/:mid

import { NextResponse } from "next/server"

const PERM_API = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/permission_member`

type Ctx = { params: Promise<{ id: string; permId: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const { id, permId } = await params
  try {
    const res = await fetch(`${PERM_API}/permission/${permId}/member/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "Failed to link permission", details: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e) {
    return NextResponse.json({ error: "Internal server error", details: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, permId } = await params
  try {
    const res = await fetch(`${PERM_API}/permission/${permId}/member/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "Failed to unlink permission", details: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e) {
    return NextResponse.json({ error: "Internal server error", details: String(e) }, { status: 500 })
  }
}