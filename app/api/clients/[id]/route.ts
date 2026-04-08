import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    console.log(`[v0] Proxy: Fetching client ${id} from Python API`)

    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(`${PYTHON_API_BASE_URL}/clients/${id}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`[v0] Proxy: Client fetch failed with status ${response.status}`)
      return NextResponse.json({ error: "Failed to fetch client" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Proxy: Successfully fetched client")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Proxy error fetching client:", error)
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Leer sync_podio del query param y reenviarlo al backend
    const { searchParams } = new URL(request.url)
    const syncPodio = searchParams.get("sync_podio") ?? "false"

    const upstream = new URL(`${PYTHON_API_BASE_URL}/clients/${id}`)
    upstream.searchParams.set("sync_podio", syncPodio)

    console.log(`[v0] Proxy: Updating client ${id} — sync_podio:`, syncPodio)

    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(upstream.toString(), {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error(`[v0] Proxy: Client update failed with status ${response.status}`)
      return NextResponse.json({ error: "Failed to update client" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Proxy: Successfully updated client")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Proxy error updating client:", error)
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    // ✅ Leer sync_podio del query param y reenviarlo al backend
    const { searchParams } = new URL(request.url)
    const syncPodio = searchParams.get("sync_podio") ?? "false"

    const upstream = new URL(`${PYTHON_API_BASE_URL}/clients/${id}`)
    upstream.searchParams.set("sync_podio", syncPodio)

    console.log(`[v0] Proxy: Deleting client ${id} — sync_podio:`, syncPodio)

    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(upstream.toString(), {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    if (!response.ok) {
      console.error(`[v0] Proxy: Client deletion failed with status ${response.status}`)
      return NextResponse.json({ error: "Failed to delete client" }, { status: response.status })
    }

    console.log("[v0] Proxy: Successfully deleted client")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Proxy error deleting client:", error)
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 })
  }
}