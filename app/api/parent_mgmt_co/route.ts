import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const PYTHON_PARENT_MGMT_CO_URL = `${PYTHON_API_BASE_URL}/parent_mgmt_co/`

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    // Forward query params (page, limit, filters, etc.)
    const pythonUrl = new URL(PYTHON_PARENT_MGMT_CO_URL)
    url.searchParams.forEach((value, key) => pythonUrl.searchParams.set(key, value))

    console.log("[v0] Proxy: Fetching parent mgmt co from Python API:", pythonUrl.toString())

    const response = await fetch(pythonUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store"
    })

    console.log("[v0] Proxy: ParentMgmtCo response status:", response.status)

    const responseText = await response.text()
    console.log(
      "[v0] Proxy: ParentMgmtCo response body (first 200 chars):",
      responseText.substring(0, 200)
    )

    if (!response.ok) {
      console.error("[v0] Proxy: Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API returned ${response.status}: ${responseText}` },
        { status: response.status }
      )
    }

    // Python retorna JSON (tu ejemplo trae { limit, page, results, total })
    try {
      const data = JSON.parse(responseText)
      const items = data.results || []
      console.log("[v0] Proxy: Successfully fetched", items.length, "parent mgmt co records")
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("[v0] Proxy: Failed to parse JSON response:", parseError)
      return NextResponse.json(
        {
          error: "Invalid JSON response from Python API",
          details: responseText.substring(0, 500)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[v0] Proxy: Error calling Python API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to connect to Python API"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Proxy: Creating parent mgmt co with data:", body)

    const response = await fetch(PYTHON_PARENT_MGMT_CO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    console.log("[v0] Proxy: Create ParentMgmtCo response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] Proxy: Create ParentMgmtCo response body (first 200 chars):", responseText.substring(0, 200))

    if (!response.ok) {
      console.error("[v0] Proxy: Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API returned ${response.status}: ${responseText}` },
        { status: response.status }
      )
    }

    try {
      const data = JSON.parse(responseText)
      console.log("[v0] Proxy: ParentMgmtCo created successfully")
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("[v0] Proxy: Failed to parse JSON response:", parseError)
      return NextResponse.json(
        {
          error: "Invalid JSON response from Python API",
          details: responseText.substring(0, 500)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[v0] Proxy: Error creating ParentMgmtCo:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to create ParentMgmtCo"
      },
      { status: 500 }
    )
  }
}
