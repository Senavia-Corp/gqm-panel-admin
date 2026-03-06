import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_URL  = `${process.env.PYTHON_API_BASE_URL}/clients/`

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Proxy: Fetching clients from Python API:", PYTHON_API_URL)

    const response = await fetch(PYTHON_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    console.log("[v0] Proxy: Clients response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] Proxy: Clients response body (first 200 chars):", responseText.substring(0, 200))

    if (!response.ok) {
      console.error("[v0] Proxy: Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API returned ${response.status}: ${responseText}` },
        { status: response.status },
      )
    }

    try {
      const data = JSON.parse(responseText)
      const clients = data.results || []
      console.log("[v0] Proxy: Successfully fetched", clients.length, "clients")
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("[v0] Proxy: Failed to parse JSON response:", parseError)
      return NextResponse.json(
        {
          error: "Invalid JSON response from Python API",
          details: responseText.substring(0, 500),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Proxy: Error calling Python API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to connect to Python API",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Proxy: Creating client with data:", body)

    const response = await fetch(PYTHON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    console.log("[v0] Proxy: Create client response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] Proxy: Create client response body:", responseText.substring(0, 200))

    if (!response.ok) {
      console.error("[v0] Proxy: Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API returned ${response.status}: ${responseText}` },
        { status: response.status },
      )
    }

    try {
      const data = JSON.parse(responseText)
      console.log("[v0] Proxy: Client created successfully")
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("[v0] Proxy: Failed to parse JSON response:", parseError)
      return NextResponse.json(
        {
          error: "Invalid JSON response from Python API",
          details: responseText.substring(0, 500),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Proxy: Error creating client:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to create client",
      },
      { status: 500 },
    )
  }
}
