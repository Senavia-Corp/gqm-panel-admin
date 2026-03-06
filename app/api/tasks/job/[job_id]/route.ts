// app/api/tasks/job/[job_id]/route.ts
// GET /api/tasks/job/<job_id>?tech_id=<ID_Technician>
// Maps to Python: GET /tasks/job/<id_jobs>/tech/<id_tech>
//
// tech_id is optional — if omitted the proxy uses a wildcard sentinel so the
// backend returns all tasks for the job regardless of technician.
// NOTE: Python route requires both segments. If your backend adds a
//       "GET /tasks/job/<id_jobs>" route later, update the URL below.

import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const TIMEOUT_MS   = 20_000

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { job_id: string } }
) {
  const { job_id }    = params
  const { searchParams } = request.nextUrl
  const techId        = searchParams.get("tech_id") ?? "ALL"

  if (!job_id) return jsonError("job_id is required", 400)

  const url = `${API_BASE_URL}/tasks/job/${encodeURIComponent(job_id)}/tech/${encodeURIComponent(techId)}`

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store", signal: controller.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return jsonError(`Python API error: ${text || res.statusText}`, res.status)
    }
    const data = await res.json().catch(() => [])
    return NextResponse.json(data)
  } catch (e: any) {
    if (e?.name === "AbortError") return jsonError(`Timeout after ${TIMEOUT_MS}ms`, 504)
    return jsonError(e?.message ?? "Connection failed", 502)
  } finally {
    clearTimeout(timeout)
  }
}