import { NextResponse } from "next/server"

const API_BASE_URL = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/member`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"

    console.log("[v0] Fetching members from API...")
    const apiUrl = `${API_BASE_URL}/?page=${page}&limit=${limit}`
    console.log("[v0] API URL:", apiUrl)

    const authHeader = request.headers.get("Authorization") ?? ""

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    console.log("[v0] Response status:", response.status)
    console.log("[v0] Response content-type:", response.headers.get("content-type"))

    const responseText = await response.text()
    console.log("[v0] Response body (first 200 chars):", responseText.substring(0, 200))

    if (!response.ok) {
      console.log(`[v0] Proxy: Member fetch failed with status ${response.status}`)
      return NextResponse.json({ error: "Failed to fetch members", details: responseText }, { status: response.status })
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
      console.log("[v0] Response is not JSON, content-type:", response.headers.get("content-type"))
      return NextResponse.json({ error: "API returned non-JSON response", details: responseText }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    console.log(`[v0] Successfully fetched ${data.results?.length || 0} members`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in member proxy:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Creating member:", body)

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
    console.log("[v0] Create response:", responseText.substring(0, 200))

    if (!response.ok) {
      console.log("[v0] Error creating member:", responseText)
      return NextResponse.json({ error: "Failed to create member", details: responseText }, { status: response.status })
    }

    const data = JSON.parse(responseText)
    console.log("[v0] Member created successfully:", data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error creating member:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
