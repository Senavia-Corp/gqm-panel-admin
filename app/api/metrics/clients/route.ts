import { NextResponse } from "next/server"

const PYTHON_BASE_URL =
  process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    const type = url.searchParams.get("type") ?? "ALL"
    const year = url.searchParams.get("year")
    const page = url.searchParams.get("page") ?? "1"
    const limit = url.searchParams.get("limit") ?? "25"
    const orderBy = url.searchParams.get("order_by") ?? "closed"
    const includeStatusBreakdown = url.searchParams.get("include_status_breakdown") ?? "1"
    const search = url.searchParams.get("search")

    const backend = PYTHON_BASE_URL
    if (!backend) {
      return NextResponse.json({ detail: "Missing PYTHON_API_BASE_URL env var" }, { status: 500 })
    }

    const qs = new URLSearchParams()
    qs.set("type", type)
    qs.set("page", page)
    qs.set("limit", limit)
    qs.set("order_by", orderBy)
    qs.set("include_status_breakdown", includeStatusBreakdown)
    if (year) qs.set("year", year)
    if (search) qs.set("search", search)

    const target = `${backend.replace(/\/$/, "")}/communities/clients?${qs.toString()}`

    const res = await fetch(target, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("application/json")) {
      const text = await res.text()
      console.error(`[clients] non-JSON response (${res.status}):`, text.slice(0, 300))
      return NextResponse.json({ detail: `Backend error ${res.status}` }, { status: res.status || 502 })
    }
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("Proxy metrics/clients error:", err)
    return NextResponse.json({ detail: "Internal proxy error" }, { status: 500 })
  }
}