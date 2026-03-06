import { NextResponse } from "next/server"

const API_BASE_URL = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/member`

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log(`[v0] Fetching member ${params.id}...`)

    const response = await fetch(`${API_BASE_URL}/member/${params.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Proxy: Member fetch failed with status ${response.status}`)
      return NextResponse.json({ error: "Member not found", details: errorText }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    console.log(`[v0] Updating member ${params.id}:`, body)

    const response = await fetch(`${API_BASE_URL}/member/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] Error updating member:", errorText)
      return NextResponse.json({ error: "Failed to update member", details: errorText }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error updating member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log(`[v0] Deleting member ${params.id}...`)

    const response = await fetch(`${API_BASE_URL}/member/${params.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] Error deleting member:", errorText)
      return NextResponse.json({ error: "Failed to delete member", details: errorText }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
