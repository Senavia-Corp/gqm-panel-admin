import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_API_BASE_URL = getBackendUrl()

type RouteContext = { params: Promise<{ clientId: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { clientId } = await params
  const { searchParams } = new URL(request.url)

  const upstream = new URL(`${PYTHON_API_BASE_URL}/jobs/client/${clientId}`)
  upstream.searchParams.set("page",  searchParams.get("page")  ?? "1")
  upstream.searchParams.set("limit", searchParams.get("limit") ?? "500")

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
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: response.status })
  }

  return NextResponse.json(await response.json())
}
