import { NextResponse } from "next/server"

const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; perm_id: string }> }
) {
  try {
    const { id, perm_id } = await params
    // Correct backend endpoint: /permission_tech/permission/<permission_id>/tech/<tech_id>
    const url = `${PYTHON_API_URL}/permission_tech/permission/${perm_id}/tech/${id}`

    const authHeader = request.headers.get("Authorization")
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to link permission", details: responseText },
        { status: response.status }
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in technician link permission route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; perm_id: string }> }
) {
  try {
    const { id, perm_id } = await params
    // Correct backend endpoint: /permission_tech/permission/<permission_id>/tech/<tech_id>
    const url = `${PYTHON_API_URL}/permission_tech/permission/${perm_id}/tech/${id}`

    const authHeader = request.headers.get("Authorization")
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to unlink permission", details: responseText },
        { status: response.status }
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in technician unlink permission route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
