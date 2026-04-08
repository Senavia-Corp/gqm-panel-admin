// app/api/members/table/route.ts
// Proxy for GET /member/member_table with ?q=, page, limit support

import { NextResponse } from "next/server"

const API_BASE_URL = `${process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"}/member`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page  = searchParams.get("page")  || "1"
    const limit = searchParams.get("limit") || "20"
    const q     = searchParams.get("q")     || ""

    const upstream = new URL(`${API_BASE_URL}/member_table`)
    upstream.searchParams.set("page",  page)
    upstream.searchParams.set("limit", limit)
    if (q) upstream.searchParams.set("q", q)

    const authHeader = request.headers.get("Authorization") ?? ""

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch members table", details: text },
        { status: response.status },
      )
    }

    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[members/table] proxy error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}