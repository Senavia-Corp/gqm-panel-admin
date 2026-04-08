// app/api/parent_mgmt_co/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    console.log(`[proxy] GET parent_mgmt_co/${id}`)

    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(`${PYTHON_API_BASE_URL}/parent_mgmt_co/${id}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[proxy] fetch failed ${response.status}`, text.substring(0, 200))
      return NextResponse.json({ error: "Failed to fetch parent mgmt co" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[proxy] Error fetching parent mgmt co:", error)
    return NextResponse.json({ error: "Failed to fetch parent mgmt co" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const url = new URL(request.url)

    // ✅ Forward sync_podio param to Python backend
    const syncPodio = url.searchParams.get("sync_podio") ?? "false"
    const pythonUrl = new URL(`${PYTHON_API_BASE_URL}/parent_mgmt_co/${id}`)
    pythonUrl.searchParams.set("sync_podio", syncPodio)

    const body = await request.json()
    console.log(`[proxy] PATCH parent_mgmt_co/${id} | sync_podio=%s`, syncPodio)

    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(pythonUrl.toString(), {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[proxy] update failed ${response.status}`, text.substring(0, 200))
      return NextResponse.json({ error: "Failed to update parent mgmt co" }, { status: response.status })
    }

    const data = await response.json()
    console.log(`[proxy] ParentMgmtCo ${id} updated. sync_podio=%s`, syncPodio)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[proxy] Error updating parent mgmt co:", error)
    return NextResponse.json({ error: "Failed to update parent mgmt co" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const url = new URL(request.url)

    // ✅ Forward sync_podio param to Python backend
    const syncPodio = url.searchParams.get("sync_podio") ?? "false"
    const pythonUrl = new URL(`${PYTHON_API_BASE_URL}/parent_mgmt_co/${id}`)
    pythonUrl.searchParams.set("sync_podio", syncPodio)

    console.log(`[proxy] DELETE parent_mgmt_co/${id} | sync_podio=%s`, syncPodio)

    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(pythonUrl.toString(), {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[proxy] delete failed ${response.status}`, text.substring(0, 200))
      return NextResponse.json({ error: "Failed to delete parent mgmt co" }, { status: response.status })
    }

    console.log(`[proxy] ParentMgmtCo ${id} deleted. sync_podio=%s`, syncPodio)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[proxy] Error deleting parent mgmt co:", error)
    return NextResponse.json({ error: "Failed to delete parent mgmt co" }, { status: 500 })
  }
}