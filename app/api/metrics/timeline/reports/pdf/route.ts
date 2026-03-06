// app/api/metrics/timeline/reports/pdf/route.ts
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
const TIMEOUT_MS      = 60_000   // PDF generation can take a few seconds

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

  const { searchParams } = request.nextUrl
  const jobId    = searchParams.get("job_id")
  const period   = searchParams.get("period")   ?? "month"
  const refDate  = searchParams.get("ref_date")

  if (!jobId) return jsonError("job_id is required", 400)

  const params = new URLSearchParams({ job_id: jobId, period })
  if (refDate) params.set("ref_date", refDate)

  const url = `${PYTHON_BASE_URL.replace(/\/$/, "")}/metrics/timeline/reports/pdf?${params}`

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store", signal: controller.signal })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return jsonError(data?.error ?? `Python API returned ${res.status}`, res.status)
    }

    const pdfBuffer   = await res.arrayBuffer()
    const disposition = res.headers.get("Content-Disposition") ?? `attachment; filename="timeline_${jobId}_${period}.pdf"`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length":      String(pdfBuffer.byteLength),
      },
    })
  } catch (e: any) {
    const isAbort = e?.name === "AbortError"
    return jsonError(isAbort ? `Timeout after ${TIMEOUT_MS}ms` : e?.message ?? "Connection failed", isAbort ? 504 : 502)
  } finally {
    clearTimeout(timeout)
  }
}