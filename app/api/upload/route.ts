import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

/**
 * POST /api/upload
 *
 * Forwards the multipart FormData to the Python backend's /attachments/upload
 * endpoint, which handles Cloudinary upload, optional Podio attachment, and
 * DB record creation all in one shot.
 *
 * Expected FormData fields (forwarded as-is):
 *   - file          File       The file to upload
 *   - entity_id     string     Internal DB ID (e.g. "PAR5147", "QID60123")
 *   - year          string?    Job year — required when sync_podio=true
 *   - description   string?    Optional description
 *   - tag           string?    Tag (default: "general")
 *
 * Query params forwarded:
 *   - sync_podio    "true"|"false"   Whether to attach to Podio item
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const syncPodio = searchParams.get("sync_podio") ?? "false"

    // Read the raw FormData from the incoming request
    const incomingForm = await request.formData()

    // Build a new FormData to forward — we re-append every field so we can
    // also inject the year from the form if not already there
    const outgoingForm = new FormData()
    for (const [key, value] of incomingForm.entries()) {
      outgoingForm.append(key, value)
    }

    const targetUrl = `${PYTHON_API_URL}/attachments/upload?sync_podio=${syncPodio}`
    console.log("[upload proxy] POST →", targetUrl)

    const authHeader   = request.headers.get("Authorization")
    const userIdHeader = request.headers.get("X-User-Id")
    const uploadHeaders: Record<string, string> = {}
    if (authHeader)   uploadHeaders["Authorization"] = authHeader
    if (userIdHeader) uploadHeaders["X-User-Id"]     = userIdHeader
    // Do NOT set Content-Type — fetch sets it automatically with the correct
    // multipart boundary when body is FormData.

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: uploadHeaders,
      body: outgoingForm,
    })

    const contentType = response.headers.get("content-type") ?? ""
    const isJson = contentType.includes("application/json")

    if (!response.ok) {
      const body = isJson
        ? await response.json().catch(() => ({}))
        : { error: await response.text().catch(() => `HTTP ${response.status}`) }
      console.error("[upload proxy] backend error:", response.status, body)
      return NextResponse.json(body, { status: response.status })
    }

    const result = isJson ? await response.json() : { success: true }
    return NextResponse.json(result, { status: response.status })

  } catch (error) {
    console.error("[upload proxy] unhandled error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}