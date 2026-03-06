import { NextRequest, NextResponse } from "next/server"

const REALM_ID = "123146192121004"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ job_code: string }> }
) {
  const { job_code } = await params

  if (!job_code) {
    return NextResponse.json({ error: "job_code is required" }, { status: 400 })
  }

  const pythonBaseUrl = process.env.PYTHON_API_BASE_URL
  if (!pythonBaseUrl) {
    return NextResponse.json({ error: "PYTHON_API_BASE_URL is not configured" }, { status: 500 })
  }

  // Forward optional query params (start, limit, dry_run)
  const { searchParams } = request.nextUrl
  const forwardedParams = new URLSearchParams()
  if (searchParams.has("start"))   forwardedParams.set("start",   searchParams.get("start")!)
  if (searchParams.has("limit"))   forwardedParams.set("limit",   searchParams.get("limit")!)
  if (searchParams.has("dry_run")) forwardedParams.set("dry_run", searchParams.get("dry_run")!)

  const base = pythonBaseUrl.replace(/\/$/, "")
  const query = forwardedParams.toString()
  const targetUrl = `${base}/qbo/sync-full-job/${REALM_ID}/${job_code}${query ? `?${query}` : ""}`

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[QBO sync-full-job] fetch error:", error)
    return NextResponse.json({ error: "Failed to reach the Python API" }, { status: 502 })
  }
}