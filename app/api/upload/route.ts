import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

async function generateSHA1(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest("SHA-1", dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload API route called")

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const jobId = formData.get("jobId") as string | null
    const jobType = formData.get("jobType") as string | null
    const description = formData.get("description") as string | null
    const tag = (formData.get("tag") as string) || "general"

    console.log("[v0] Received upload request:", {
      fileName: file?.name,
      fileSize: file?.size,
      jobId,
      jobType,
      description,
      tag,
    })

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    if (!jobType) {
      return NextResponse.json({ error: "Job type is required" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const folder = `Jobs/${jobType}/${jobId}`
    const publicId = file.name.split(".")[0]
    const tags = `${tag},${jobId}`
    const timestamp = Math.round(Date.now() / 1000)

    const paramsToSign = `folder=${folder}&public_id=${publicId}&tags=${tags}&timestamp=${timestamp}${API_SECRET}`
    const signature = await generateSHA1(paramsToSign)

    const cloudinaryForm = new FormData()
    cloudinaryForm.append("file", new Blob([buffer]), file.name)
    cloudinaryForm.append("api_key", API_KEY)
    cloudinaryForm.append("timestamp", timestamp.toString())
    cloudinaryForm.append("signature", signature)
    cloudinaryForm.append("folder", folder)
    cloudinaryForm.append("public_id", publicId)
    cloudinaryForm.append("tags", tags)

    console.log("[v0] Uploading to Cloudinary with folder:", folder)

    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: "POST",
      body: cloudinaryForm,
    })

    const contentType = cloudinaryResponse.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      const textResponse = await cloudinaryResponse.text()
      console.error("[v0] Cloudinary returned non-JSON response:", textResponse)
      return NextResponse.json(
        {
          error: "Failed to upload file to Cloudinary",
          details: textResponse,
        },
        { status: 500 },
      )
    }

    const cloudinaryData = await cloudinaryResponse.json()

    if (!cloudinaryResponse.ok) {
      console.error("[v0] Cloudinary upload failed:", cloudinaryData)
      return NextResponse.json(
        {
          error: "Failed to upload file to Cloudinary",
          details: cloudinaryData?.error?.message || "Unknown Cloudinary error",
        },
        { status: 500 },
      )
    }

    console.log("[v0] File uploaded successfully to Cloudinary:", cloudinaryData.secure_url)

    try {
      const attachmentData = {
        Document_name: cloudinaryData.original_filename || file.name,
        Attachment_descr: description || "",
        Link: cloudinaryData.secure_url,
        Document_type: cloudinaryData.format?.toUpperCase() || "UNKNOWN",
        ID_Jobs: jobId,
      }

      console.log("[v0] Creating attachment record:", attachmentData)

      const attachmentResponse = await fetch(`${PYTHON_API_URL}/attachments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attachmentData),
      })

      if (!attachmentResponse.ok) {
        const attachmentError = await attachmentResponse.text()
        console.error("[v0] Failed to create attachment record:", attachmentError)
        // Don't fail the entire upload if attachment creation fails
      } else {
        const attachmentResult = await attachmentResponse.json()
        console.log("[v0] Attachment record created:", attachmentResult)
      }
    } catch (attachmentError) {
      console.error("[v0] Error creating attachment record:", attachmentError)
      // Don't fail the entire upload if attachment creation fails
    }

    return NextResponse.json({
      success: true,
      data: cloudinaryData,
    })
  } catch (error) {
    console.error("[v0] Error uploading to Cloudinary:", error)
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
