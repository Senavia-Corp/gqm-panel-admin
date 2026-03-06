import { NextResponse } from "next/server"

const API_BASE_URL = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/member`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"

    const apiUrl = `${API_BASE_URL}/member_table?page=${page}&limit=${limit}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch members table", details: responseText },
        { status: response.status },
      )
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json(
        { error: "API returned non-JSON response", details: responseText },
        { status: 500 },
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[members_table] proxy error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}