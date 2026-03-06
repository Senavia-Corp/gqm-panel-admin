// app/api/financial/summary/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const pythonBaseUrl = process.env.PYTHON_API_BASE_URL
  if (!pythonBaseUrl) {
    return NextResponse.json(
      { error: "PYTHON_API_BASE_URL is not configured" },
      { status: 500 }
    )
  }

  // Forward all query params to the Python API
  const { searchParams } = request.nextUrl
  const forwardedParams = new URLSearchParams()

  for (const [key, value] of searchParams.entries()) {
    forwardedParams.set(key, value)
  }

  const base = pythonBaseUrl.replace(/\/$/, "")
  const query = forwardedParams.toString()
  const targetUrl = `${base}/metrics/financial/summary${query ? `?${query}` : ""}`

  try {
    const response = await fetch(targetUrl, { method: "GET" })
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[financial/summary] fetch error:", error)
    return NextResponse.json(
      { error: "Failed to reach the Python API" },
      { status: 502 }
    )
  }
}