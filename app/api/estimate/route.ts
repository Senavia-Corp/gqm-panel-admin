// app/api/estimate/route.ts  (POST — X-User-Id added)
import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json()
    const userId = request.headers.get("X-User-Id")

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (userId) headers["X-User-Id"] = userId   // ← forwarded

    const response = await fetch(`${API_BASE_URL}/estimate/`, {
      method: "POST", headers, body: JSON.stringify(body), redirect: "follow",
    })

    const responseText = await response.text()
    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText)
        return NextResponse.json({ error: errorData.error || "Failed to create estimate cost" }, { status: response.status })
      } catch {
        return NextResponse.json({ error: "Backend returned non-JSON response" }, { status: response.status })
      }
    }
    try {
      return NextResponse.json(JSON.parse(responseText))
    } catch {
      return NextResponse.json({ error: "Backend returned non-JSON response" }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 })
  }
}