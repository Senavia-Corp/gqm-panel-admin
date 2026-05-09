import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const upstream = new URL(`${PYTHON_API_BASE_URL}/clients/${id}/metrics`)
    if (searchParams.get("month")) upstream.searchParams.set("month", searchParams.get("month")!)
    if (searchParams.get("year"))  upstream.searchParams.set("year",  searchParams.get("year")!)

    const authHeader = request.headers.get("Authorization") ?? ""
    const userId     = request.headers.get("X-User-Id")

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(userId     ? { "X-User-Id": userId }       : {}),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch metrics" }, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error("[metrics] Proxy error:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}
