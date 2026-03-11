import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_URL = `${process.env.PYTHON_API_BASE_URL}/clients/`

export async function GET(request: NextRequest) {
  try {
    // Forward all incoming query params to the Python backend
    const { searchParams } = new URL(request.url)
    const upstream = new URL(PYTHON_API_URL)
    searchParams.forEach((value, key) => upstream.searchParams.set(key, value))

    console.log("[v0] Proxy: Fetching clients from Python API:", upstream.toString())

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
        { error: "Invalid JSON response from Python API", details: responseText.substring(0, 500) },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Proxy: Error calling Python API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", details: "Failed to connect to Python API" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Leer sync_podio del query param del request entrante y reenviarlo al backend
    const { searchParams } = new URL(request.url)
    const syncPodio = searchParams.get("sync_podio") ?? "false"

    const upstream = new URL(PYTHON_API_URL)
    upstream.searchParams.set("sync_podio", syncPodio)

    console.log("[v0] Proxy: Creating client — sync_podio:", syncPodio)

    const response = await fetch(upstream.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        { error: "Invalid JSON response from Python API", details: responseText.substring(0, 500) },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Proxy: Error creating client:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", details: "Failed to create client" },
      { status: 500 },
    )
  }
}