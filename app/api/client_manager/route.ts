// app/api/client_manager/route.ts
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

function buildUpstream(clientId: string, managerId: string, syncPodio: string) {
  return `${PYTHON_BASE_URL}/client_manager/client/${encodeURIComponent(clientId)}/manager/${encodeURIComponent(managerId)}?sync_podio=${syncPodio}`
}

function forwardHeaders(request: NextRequest) {
  const authHeader = request.headers.get("Authorization") ?? ""
  const userId     = request.headers.get("X-User-Id")
  return {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...(userId     ? { "X-User-Id": userId }       : {}),
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const clientId  = searchParams.get("clientId")
  const managerId = searchParams.get("managerId")
  const syncPodio = searchParams.get("sync_podio") ?? "false"

  if (!clientId || !managerId) {
    return NextResponse.json({ error: "Missing clientId or managerId" }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const url  = buildUpstream(clientId, managerId, syncPodio)
    console.log("[proxy] POST client_manager ->", url)

    const res = await fetch(url, {
      method: "POST",
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] Error linking manager to client:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const clientId  = searchParams.get("clientId")
  const managerId = searchParams.get("managerId")
  const syncPodio = searchParams.get("sync_podio") ?? "false"

  if (!clientId || !managerId) {
    return NextResponse.json({ error: "Missing clientId or managerId" }, { status: 400 })
  }

  try {
    const url = buildUpstream(clientId, managerId, syncPodio)
    console.log("[proxy] DELETE client_manager ->", url)

    const res = await fetch(url, {
      method: "DELETE",
      headers: forwardHeaders(request),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] Error unlinking manager from client:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const clientId  = searchParams.get("clientId")
  const managerId = searchParams.get("managerId")

  if (!clientId || !managerId) {
    return NextResponse.json({ error: "Missing clientId or managerId" }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const url  = `${PYTHON_BASE_URL}/client_manager/client/${encodeURIComponent(clientId)}/manager/${encodeURIComponent(managerId)}/rol`
    console.log("[proxy] PATCH client_manager rol ->", url)

    const res = await fetch(url, {
      method: "PATCH",
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] Error updating manager role:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
