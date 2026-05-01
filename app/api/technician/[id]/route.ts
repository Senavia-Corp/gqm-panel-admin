import { NextResponse } from "next/server"
const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const url = `${PYTHON_API_URL}/technician/${id}`

    const authHeader = request.headers.get("Authorization")
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: "Failed to fetch technician", details: errorText }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in technician GET API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const url = `${PYTHON_API_URL}/technician/${id}`

    const authHeader = request.headers.get("Authorization")
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to update technician", details: responseText }, { status: response.status })
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in technician PATCH API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const url = `${PYTHON_API_URL}/technician/${id}`

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
      return NextResponse.json({ error: "Failed to delete technician", details: responseText }, { status: response.status })
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in technician DELETE API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
