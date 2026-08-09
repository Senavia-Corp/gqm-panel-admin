// app/api/estimate/route.ts  (POST — X-User-Id added)
import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const API_BASE_URL = getBackendUrl()

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json()
    const userId = request.headers.get("X-User-Id")

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const _authHeader = (request.headers.get("authorization") || request.headers.get("Authorization") || "");
    if (_authHeader) headers["Authorization"] = _authHeader;
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
export async function GET(request: NextRequest) {
  try {
    const incoming = new URL(request.url)
    const url = new URL(`${API_BASE_URL}/estimate/`)
    incoming.searchParams.forEach((v, k) => url.searchParams.set(k, v))
    const headers: Record<string, string> = {}
    const auth = request.headers.get("authorization")
    if (auth) headers["Authorization"] = auth
    const response = await fetch(url.toString(), { headers, cache: "no-store" })
    const body = await response.json().catch(() => [])
    return NextResponse.json(body, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Proxy error" }, { status: 500 })
  }
}
