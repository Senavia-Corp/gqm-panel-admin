import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "100"

    const url = `${PYTHON_API_BASE_URL}/multiplier/?page=${page}&limit=${limit}`
    console.log("[v0] Fetching multipliers from Python API:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] Python API response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] Python API response body (first 200 chars):", responseText.substring(0, 200))

    if (!response.ok) {
      console.error("[v0] Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in multipliers proxy:", error)
    return NextResponse.json({ error: "Failed to fetch multipliers", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Creating multiplier via Python API:", body)

    const url = `${PYTHON_API_BASE_URL}/multiplier/`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    console.log("[v0] Python API response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] Python API response body:", responseText)

    if (!response.ok) {
      console.error("[v0] Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in create multiplier proxy:", error)
    return NextResponse.json({ error: "Failed to create multiplier", details: String(error) }, { status: 500 })
  }
}
