import { NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const url  = new URL(req.url)
    const year = url.searchParams.get("year")

    const backend = PYTHON_BASE_URL
    if (!backend) {
      return NextResponse.json({ detail: "Missing PYTHON_API_BASE_URL env var" }, { status: 500 })
    }

    const qs = new URLSearchParams()
    if (year) qs.set("year", year)

    const query  = qs.toString()
    const target = `${backend.replace(/\/$/, "")}/member_metrics/acc-rep-selling/${id}${query ? `?${query}` : ""}`

    const res  = await fetch(target, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" })
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("application/json")) {
      const text = await res.text()
      console.error(`[members/[id]] non-JSON response (${res.status}):`, text.slice(0, 300))
      return NextResponse.json({ detail: `Backend error ${res.status}` }, { status: res.status || 502 })
    }
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("Proxy metrics/members/[id] error:", err)
    return NextResponse.json({ detail: "Internal proxy error" }, { status: 500 })
  }
}
