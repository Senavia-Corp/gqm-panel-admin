import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const BASE = (getBackendUrl()).replace(/\/$/, "")

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pmcId = searchParams.get("parent_mgmt_co_id")
  if (!pmcId) return NextResponse.json({ error: "parent_mgmt_co_id is required" }, { status: 400 })

  const authHeader = request.headers.get("Authorization") ?? ""
  const userId     = request.headers.get("X-User-Id")

  const upstream = `${BASE}/jobs/oldest?parent_mgmt_co_id=${encodeURIComponent(pmcId)}`
  const res = await fetch(upstream, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(userId     ? { "X-User-Id": userId }       : {}),
    },
    cache: "no-store",
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
