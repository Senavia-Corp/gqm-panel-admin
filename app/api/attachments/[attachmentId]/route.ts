import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dixmmsqsi"
const API_KEY = process.env.CLOUDINARY_API_KEY || "751465265649124"
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "gx3uO8Z0gGKlhVwzBx0YlpGRcQ4"

async function generateSHA1(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest("SHA-1", dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}

// PATCH: Update attachment description
export async function PATCH(request: NextRequest, { params }: { params: { attachmentId: string } }) {
  try {
    const { attachmentId } = params
    const body = await request.json()

    console.log("[v0] Updating attachment:", attachmentId, body)

    const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] Failed to update attachment:", error)
      return NextResponse.json({ error: "Failed to update attachment" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error updating attachment:", error)
    return NextResponse.json({ error: "Failed to update attachment" }, { status: 500 })
  }
}

// DELETE: Delete attachment and Cloudinary file
export async function DELETE(request: NextRequest, { params }: { params: { attachmentId: string } }) {
  try {
    const { attachmentId } = params
    const { searchParams } = new URL(request.url)
    const publicId = searchParams.get("publicId")

    console.log("[v0] Deleting attachment:", attachmentId, "publicId:", publicId)

    // Delete from database first
    const dbResponse = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
      method: "DELETE",
    })

    if (!dbResponse.ok) {
      const error = await dbResponse.text()
      console.error("[v0] Failed to delete attachment from database:", error)
      return NextResponse.json({ error: "Failed to delete attachment from database" }, { status: dbResponse.status })
    }

    // Delete from Cloudinary if publicId provided
    if (publicId) {
      try {
        const timestamp = Math.round(Date.now() / 1000)
        const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`
        const signature = await generateSHA1(paramsToSign)

        const cloudinaryForm = new FormData()
        cloudinaryForm.append("public_id", publicId)
        cloudinaryForm.append("api_key", API_KEY)
        cloudinaryForm.append("timestamp", timestamp.toString())
        cloudinaryForm.append("signature", signature)

        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
          method: "POST",
          body: cloudinaryForm,
        })

        if (!cloudinaryResponse.ok) {
          console.error("[v0] Failed to delete from Cloudinary, but database deletion succeeded")
        } else {
          console.log("[v0] File deleted from Cloudinary")
        }
      } catch (cloudinaryError) {
        console.error("[v0] Error deleting from Cloudinary:", cloudinaryError)
        // Don't fail if Cloudinary deletion fails, database deletion succeeded
      }
    }

    const data = await dbResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error deleting attachment:", error)
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 })
  }
}
