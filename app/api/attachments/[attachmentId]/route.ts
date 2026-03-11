import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const CLOUD_NAME   = process.env.CLOUDINARY_CLOUD_NAME
const API_KEY      = process.env.CLOUDINARY_API_KEY
const API_SECRET   = process.env.CLOUDINARY_API_SECRET

async function generateSHA1(data: string): Promise<string> {
  const encoder    = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest("SHA-1", dataBuffer)
  const hashArray  = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function inferResourceType(publicId: string): "image" | "video" | "raw" {
  const ext = publicId.split(".").pop()?.toLowerCase() ?? ""
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "video"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image"
  return "raw"
}

// PATCH — update attachment description
export async function PATCH(
  request: NextRequest,
  // FIX: params is a Promise in Next.js 15 — must be awaited
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await params   // ← await
    const body = await request.json()

    console.log("[attachments] PATCH", attachmentId, body)

    const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[attachments] PATCH failed:", error)
      return NextResponse.json(
        { error: "Failed to update attachment", details: error },
        { status: response.status },
      )
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error("[attachments] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update attachment" }, { status: 500 })
  }
}

// DELETE — remove from DB then from Cloudinary
export async function DELETE(
  request: NextRequest,
  // FIX: params is a Promise in Next.js 15 — must be awaited
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await params   // ← await
    const { searchParams } = new URL(request.url)
    const publicId = searchParams.get("publicId")

    console.log("[attachments] DELETE", attachmentId, "publicId:", publicId)

    // 1️⃣ Delete from DB
    const dbResponse = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
      method: "DELETE",
    })

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text()
      console.error("[attachments] DB delete failed:", errorText)
      return NextResponse.json(
        { error: "Failed to delete attachment from database", details: errorText },
        { status: dbResponse.status },
      )
    }

    // Consume body once before moving on
    const dbResult = await dbResponse.json().catch(() => ({ success: true }))

    // 2️⃣ Delete from Cloudinary (best-effort)
    if (publicId && CLOUD_NAME && API_KEY && API_SECRET) {
      try {
        const resourceType = inferResourceType(publicId)
        const timestamp    = Math.round(Date.now() / 1000)
        const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`
        const signature    = await generateSHA1(paramsToSign)

        const cloudinaryForm = new FormData()
        cloudinaryForm.append("public_id",  publicId)
        cloudinaryForm.append("api_key",    API_KEY)
        cloudinaryForm.append("timestamp",  timestamp.toString())
        cloudinaryForm.append("signature",  signature)

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`,
          { method: "POST", body: cloudinaryForm },
        )

        const cloudJson = await cloudRes.json().catch(() => ({}))
        console.log("[attachments] Cloudinary delete result:", cloudJson.result)
      } catch (cloudinaryError) {
        console.error("[attachments] Cloudinary delete error (DB already deleted):", cloudinaryError)
      }
    }

    return NextResponse.json(dbResult)
  } catch (error) {
    console.error("[attachments] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 })
  }
}