import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

// ─── PATCH — update attachment metadata (description, etc.) ──────────────────
// Forwards sync_podio, app_type, year to Python if provided.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await params
    const { searchParams }  = new URL(request.url)
    const body              = await request.json()

    // Build query string — forward all relevant sync params
    const qs = new URLSearchParams()
    const syncPodio = searchParams.get("sync_podio")
    const appType   = searchParams.get("app_type")
    const year      = searchParams.get("year")
    if (syncPodio) qs.set("sync_podio", syncPodio)
    if (appType)   qs.set("app_type",   appType)
    if (year)      qs.set("year",       year)

    const qsStr = qs.toString()
    const url   = `${API_BASE_URL}/attachments/${attachmentId}${qsStr ? `?${qsStr}` : ""}`
    console.log("[attachments proxy] PATCH →", url)

    const response = await fetch(url, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })

    const contentType = response.headers.get("content-type") ?? ""
    const isJson      = contentType.includes("application/json")
    const respBody    = isJson
      ? await response.json().catch(() => ({}))
      : await response.text()

    if (!response.ok) {
      console.error("[attachments proxy] PATCH failed:", response.status, respBody)
      return NextResponse.json(
        { error: "Failed to update attachment", details: respBody },
        { status: response.status },
      )
    }

    return NextResponse.json(isJson ? respBody : { success: true })
  } catch (error) {
    console.error("[attachments proxy] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update attachment" }, { status: 500 })
  }
}

// ─── DELETE — remove attachment ───────────────────────────────────────────────
// Backend handles both Cloudinary deletion and optional Podio deletion.
// The frontend no longer needs to call Cloudinary directly.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await params
    const { searchParams }  = new URL(request.url)

    // Build query string — forward all relevant sync params
    const qs = new URLSearchParams()
    const syncPodio = searchParams.get("sync_podio")
    const appType   = searchParams.get("app_type")
    const year      = searchParams.get("year")
    if (syncPodio) qs.set("sync_podio", syncPodio)
    if (appType)   qs.set("app_type",   appType)
    if (year)      qs.set("year",       year)

    const qsStr = qs.toString()
    const url   = `${API_BASE_URL}/attachments/${attachmentId}${qsStr ? `?${qsStr}` : ""}`
    console.log("[attachments proxy] DELETE →", url)

    const response = await fetch(url, { method: "DELETE" })

    const contentType = response.headers.get("content-type") ?? ""
    const isJson      = contentType.includes("application/json")
    const respBody    = isJson
      ? await response.json().catch(() => ({ success: true }))
      : { success: true }

    if (!response.ok) {
      console.error("[attachments proxy] DELETE failed:", response.status, respBody)
      return NextResponse.json(
        { error: "Failed to delete attachment", details: respBody },
        { status: response.status },
      )
    }

    return NextResponse.json(respBody)
  } catch (error) {
    console.error("[attachments proxy] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 })
  }
}