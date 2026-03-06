import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    console.log(`[v0] Proxy: Fetching parent mgmt co ${id} from Python API`)

    const response = await fetch(`${PYTHON_API_BASE_URL}/parent_mgmt_co/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store"
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[v0] Proxy: ParentMgmtCo fetch failed with status ${response.status}`, text.substring(0, 200))
      return NextResponse.json({ error: "Failed to fetch parent mgmt co" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Proxy: Successfully fetched parent mgmt co")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Proxy error fetching parent mgmt co:", error)
    return NextResponse.json({ error: "Failed to fetch parent mgmt co" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()

    console.log(`[v0] Proxy: Updating parent mgmt co ${id}`)

    const response = await fetch(`${PYTHON_API_BASE_URL}/parent_mgmt_co/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[v0] Proxy: ParentMgmtCo update failed with status ${response.status}`, text.substring(0, 200))
      return NextResponse.json({ error: "Failed to update parent mgmt co" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Proxy: Successfully updated parent mgmt co")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Proxy error updating parent mgmt co:", error)
    return NextResponse.json({ error: "Failed to update parent mgmt co" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    console.log(`[v0] Proxy: Deleting parent mgmt co ${id}`)

    const response = await fetch(`${PYTHON_API_BASE_URL}/parent_mgmt_co/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[v0] Proxy: ParentMgmtCo deletion failed with status ${response.status}`, text.substring(0, 200))
      return NextResponse.json({ error: "Failed to delete parent mgmt co" }, { status: response.status })
    }

    console.log("[v0] Proxy: Successfully deleted parent mgmt co")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Proxy error deleting parent mgmt co:", error)
    return NextResponse.json({ error: "Failed to delete parent mgmt co" }, { status: 500 })
  }
}
