import { NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_BASE_URL = `${getBackendUrl()}/`

export async function GET(req: Request) {
  try {
    const url   = new URL(req.url)
    const type  = url.searchParams.get("type")  ?? "ALL"
    const year  = url.searchParams.get("year")
    const page  = url.searchParams.get("page")  ?? "1"
    const limit = url.searchParams.get("limit") ?? "50"

    const backend = PYTHON_BASE_URL
    if (!backend) {
      return NextResponse.json({ detail: "Missing PYTHON_API_BASE_URL env var" }, { status: 500 })
    }

    const qs = new URLSearchParams({ type, page, limit })
    if (year) qs.set("year", year)

    const target = `${backend.replace(/\/$/, "")}/job_metrics/member-pipeline?${qs.toString()}`

    const res  = await fetch(target, { method: "GET", headers: { "Content-Type": "application/json", "Authorization": (req.headers.get("authorization") || req.headers.get("Authorization") || "") }, cache: "no-store" })
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("application/json")) {
      const text = await res.text()
      console.error(`[jobs/member-pipeline] non-JSON response (${res.status}):`, text.slice(0, 300))
      return NextResponse.json({ detail: `Backend error ${res.status}` }, { status: res.status || 502 })
    }
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("Proxy metrics/jobs/member-pipeline error:", err)
    return NextResponse.json({ detail: "Internal proxy error" }, { status: 500 })
  }
}
