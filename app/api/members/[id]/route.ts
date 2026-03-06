import { NextResponse } from "next/server"

const API_BASE_URL = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/member`

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log(`[members] GET /${id}`)
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: "Member not found", details: errorText }, { status: response.status })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[members] GET by id error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    console.log(`[members] PATCH /${id}:`, Object.keys(body))
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: "Failed to update member", details: errorText }, { status: response.status })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[members] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log(`[members] DELETE /${id}`)
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: "Failed to delete member", details: errorText }, { status: response.status })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[members] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}