import { NextResponse } from "next/server"

const API_BASE_URL = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/technician`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"
    const q = searchParams.get("q") || ""

    const urlParams = new URLSearchParams({ page, limit })
    if (q) urlParams.set("q", q)

    const apiUrl = `${API_BASE_URL}/?${urlParams.toString()}`

    const authHeader = request.headers.get("Authorization") ?? ""

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch technicians", details: responseText }, { status: response.status })
    }

    const data = JSON.parse(responseText)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in technician proxy:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const authHeader = request.headers.get("Authorization") ?? ""

    const response = await fetch(`${API_BASE_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to create technician", details: responseText }, { status: response.status })
    }

    const data = JSON.parse(responseText)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error creating technician:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
