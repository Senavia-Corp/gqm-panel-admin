// app/api/order/route.ts  (POST + GET — unchanged logic, X-User-Id added to POST)
import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_API_URL = getBackendUrl()

export async function POST(request: NextRequest) {
  try {
    const incomingUrl = new URL(request.url)
    const syncPodio   = incomingUrl.searchParams.get("sync_podio")
    const year        = incomingUrl.searchParams.get("year")
    const body        = await request.json()

    const pythonUrl = new URL(`${PYTHON_API_URL}/order/`)
    if (syncPodio != null) pythonUrl.searchParams.set("sync_podio", syncPodio)
    if (year      != null) pythonUrl.searchParams.set("year", year)

    // ── Forward X-User-Id ───────────────────────────────────────────────────
    const userId  = request.headers.get("X-User-Id")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const _authHeader = (request.headers.get("authorization") || request.headers.get("Authorization") || "");
    if (_authHeader) headers["Authorization"] = _authHeader;
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(pythonUrl.toString(), { method: "POST", headers, body: JSON.stringify(body), redirect: "follow" })
    const ct       = response.headers.get("content-type") || ""
    const respBody = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(respBody, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const incomingUrl     = new URL(request.url)
    const jobId           = incomingUrl.searchParams.get("ID_Jobs") || incomingUrl.searchParams.get("id_job") || incomingUrl.searchParams.get("jobId")
    const subcontractorId = incomingUrl.searchParams.get("ID_Subcontractor") || incomingUrl.searchParams.get("id_subcontractor") || incomingUrl.searchParams.get("subcontractor") || incomingUrl.searchParams.get("subcontractorId")
    const jobPodioId      = incomingUrl.searchParams.get("job_podio_id") || incomingUrl.searchParams.get("jobPodioId") || incomingUrl.searchParams.get("podio_id") || incomingUrl.searchParams.get("podioId")

    let pythonUrl: URL
    if (jobId && subcontractorId) {
      pythonUrl = new URL(`${PYTHON_API_URL}/order/subcontractor/${encodeURIComponent(subcontractorId)}/job/${encodeURIComponent(jobId)}`)
    } else if (jobPodioId) {
      pythonUrl = new URL(`${PYTHON_API_URL}/order/job/${encodeURIComponent(jobPodioId)}`)
    } else if (jobId) {
      pythonUrl = new URL(`${PYTHON_API_URL}/order/job-id/${encodeURIComponent(jobId)}`)
    } else if (subcontractorId) {
      // Todas las órdenes de un subcontratista (REG-024)
      pythonUrl = new URL(`${PYTHON_API_URL}/order/`)
      pythonUrl.searchParams.set("subcontractor_id", subcontractorId)
    } else {
      return NextResponse.json({ detail: "Missing job or subcontractor identifier." }, { status: 400 })
    }

    const skipKeys = new Set(["jobId","id_job","ID_Jobs","job_podio_id","jobPodioId","podio_id","podioId","ID_Subcontractor","id_subcontractor","subcontractor","subcontractorId"])
    incomingUrl.searchParams.forEach((v, k) => { if (!skipKeys.has(k)) pythonUrl.searchParams.set(k, v) })

    const response = await fetch(pythonUrl.toString(), { method: "GET", headers: { "Content-Type": "application/json", "Authorization": (request.headers.get("authorization") || request.headers.get("Authorization") || "") }, cache: "no-store" })
    const ct       = response.headers.get("content-type") || ""
    const body     = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(body, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ detail: "Proxy error", error: e?.message ?? String(e) }, { status: 500 })
  }
}