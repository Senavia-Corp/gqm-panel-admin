// app/api/members/[id]/permissions/[permId]/route.ts
// Wraps Python: POST/DELETE /permission_member/permission/:pid/member/:mid

import { NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PERM_API = `${getBackendUrl()}/permission_member`

type Ctx = { params: Promise<{ id: string; permId: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id, permId } = await params
  try {
    const res = await fetch(`${PERM_API}/permission/${permId}/member/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": (request.headers.get("authorization") || request.headers.get("Authorization") || "") },
      cache: "no-store",
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "Failed to link permission", details: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e) {
    return NextResponse.json({ error: "Internal server error", details: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id, permId } = await params
  try {
    const res = await fetch(`${PERM_API}/permission/${permId}/member/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "Authorization": (request.headers.get("authorization") || request.headers.get("Authorization") || "") },
      cache: "no-store",
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "Failed to unlink permission", details: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e) {
    return NextResponse.json({ error: "Internal server error", details: String(e) }, { status: 500 })
  }
}