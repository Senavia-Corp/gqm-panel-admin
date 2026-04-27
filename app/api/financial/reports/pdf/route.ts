// app/api/financial/reports/pdf/route.ts
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
  const targetUrl = `${base}/metrics/jobs/reports/pdf${query ? `?${query}` : ""}`

  try {
    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(targetUrl, { 
      method: "GET",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: body?.detail ?? `Request failed (HTTP ${response.status})` },
        { status: response.status }
      )
    }

    const pdfBytes = await response.arrayBuffer()

    // Preserve the filename from the Python API if present
    const contentDisposition =
      response.headers.get("Content-Disposition") ??
      'attachment; filename="financial_report.pdf"'

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[financial/reports/pdf] fetch error:", error)
    return NextResponse.json(
      { error: "Failed to reach the Python API" },
      { status: 502 }
    )
  }
}