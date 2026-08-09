// app/api/members/[id]/role/[roleId]/route.ts
// Wraps Python:  POST/DELETE /permission_role/permission/:pid/role/:rid
// For members we use /role/:id endpoint directly (member has FK ID_Role)
// So linking a role to a member = PATCH /member/:id { ID_Role: roleId }
// and unlinking = PATCH /member/:id { ID_Role: null }

import { NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const MEMBER_API = `${getBackendUrl()}/member`

type Ctx = { params: Promise<{ id: string; roleId: string }> }

// Link role → member (replaces existing role since member has one role max)
export async function POST(req: Request, { params }: Ctx) {
  const { id, roleId } = await params

  const userIdHeader = req.headers.get("x-user-id")

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const _authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  if (_authHeader) headers["Authorization"] = _authHeader
  if (userIdHeader) headers["x-user-id"] = userIdHeader

  try {
    const res = await fetch(`${MEMBER_API}/${id}`, {
      method: "PATCH",
      headers,
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
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params

  const userIdHeader = req.headers.get("x-user-id")

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const _authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  if (_authHeader) headers["Authorization"] = _authHeader
  if (userIdHeader) headers["x-user-id"] = userIdHeader

  try {
    const res = await fetch(`${MEMBER_API}/${id}`, {
      method: "PATCH",
      headers,
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