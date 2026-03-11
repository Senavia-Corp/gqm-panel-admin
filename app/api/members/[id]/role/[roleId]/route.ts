// app/api/members/[id]/role/[roleId]/route.ts
// Wraps Python:  POST/DELETE /permission_role/permission/:pid/role/:rid
// For members we use /role/:id endpoint directly (member has FK ID_Role)
// So linking a role to a member = PATCH /member/:id { ID_Role: roleId }
// and unlinking = PATCH /member/:id { ID_Role: null }

import { NextResponse } from "next/server"

const MEMBER_API = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/member`

type Ctx = { params: Promise<{ id: string; roleId: string }> }

// Link role → member (replaces existing role since member has one role max)
export async function POST(_req: Request, { params }: Ctx) {
  const { id, roleId } = await params
  try {
    const res = await fetch(`${MEMBER_API}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID_Role: roleId }),
      cache: "no-store",
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "Failed to assign role", details: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e) {
    return NextResponse.json({ error: "Internal server error", details: String(e) }, { status: 500 })
  }
}

// Unlink role from member
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const res = await fetch(`${MEMBER_API}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID_Role: null }),
      cache: "no-store",
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "Failed to remove role", details: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e) {
    return NextResponse.json({ error: "Internal server error", details: String(e) }, { status: 500 })
  }
}