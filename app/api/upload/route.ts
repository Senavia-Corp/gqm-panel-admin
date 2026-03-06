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
    console.log("[upload] API route called")

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const jobId = formData.get("jobId") as string | null
    const jobType = formData.get("jobType") as string | null
    const description = formData.get("description") as string | null
    const tag = (formData.get("tag") as string) || "general"

    console.log("[upload] Received request:", {
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

    // ✅ FIX: validate jobId is a real non-empty value
    if (!jobId || jobId === "undefined" || jobId === "null") {
      console.error("[upload] Invalid jobId received:", jobId)
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // ✅ FIX: jobType is used only for the Cloudinary folder path — fall back gracefully
    const resolvedJobType = (!jobType || jobType === "undefined" || jobType === "null")
      ? "UNKNOWN"
      : jobType.toUpperCase()

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const folder = `Jobs/${resolvedJobType}/${jobId}`
    const publicId = file.name.split(".")[0]
    const tags = `${tag},${jobId}`
    const timestamp = Math.round(Date.now() / 1000)

    const paramsToSign = `folder=${folder}&public_id=${publicId}&tags=${tags}&timestamp=${timestamp}${API_SECRET}`
    const signature = await generateSHA1(paramsToSign)

    const cloudinaryForm = new FormData()
    cloudinaryForm.append("file", new Blob([buffer]), file.name)
    cloudinaryForm.append("api_key", API_KEY!)
    cloudinaryForm.append("timestamp", timestamp.toString())
    cloudinaryForm.append("signature", signature)
    cloudinaryForm.append("folder", folder)
    cloudinaryForm.append("public_id", publicId)
    cloudinaryForm.append("tags", tags)

    console.log("[upload] Uploading to Cloudinary, folder:", folder)

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      { method: "POST", body: cloudinaryForm },
    )

    const contentType = cloudinaryResponse.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      const textResponse = await cloudinaryResponse.text()
      console.error("[upload] Cloudinary returned non-JSON:", textResponse)
      return NextResponse.json(
        { error: "Failed to upload file to Cloudinary", details: textResponse },
        { status: 500 },
      )
    }

    const cloudinaryData = await cloudinaryResponse.json()

    if (!cloudinaryResponse.ok) {
      console.error("[upload] Cloudinary upload failed:", cloudinaryData)
      return NextResponse.json(
        {
          error: "Failed to upload file to Cloudinary",
          details: cloudinaryData?.error?.message || "Unknown Cloudinary error",
        },
        { status: 500 },
      )
    }

    console.log("[upload] Cloudinary upload OK:", cloudinaryData.secure_url)

    // ── Create attachment record in DB ──────────────────────────────────────
    try {
      // ✅ FIX: Document_type stored lowercase to match frontend filter comparisons
      //         (AttachmentCard and JobDocumentsTab both do .toLowerCase() checks)
      const rawFormat: string = cloudinaryData.format ?? file.name.split(".").pop() ?? "unknown"

      const attachmentData = {
        Document_name: cloudinaryData.original_filename || file.name,
        Attachment_descr: description || "",
        Link: cloudinaryData.secure_url,
        Document_type: rawFormat.toLowerCase(),   // ✅ lowercase
        ID_Jobs: jobId,
      }

      console.log("[upload] Creating attachment record:", attachmentData)

      const attachmentResponse = await fetch(`${PYTHON_API_URL}/attachments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attachmentData),
      })

      if (!attachmentResponse.ok) {
        const attachmentError = await attachmentResponse.text()
        console.error("[upload] Failed to create attachment record:", attachmentError)
        // ✅ Surface the DB error to the client so it's visible in logs/toast
        return NextResponse.json(
          {
            error: "File uploaded to Cloudinary but failed to save attachment record",
            details: attachmentError,
            cloudinary_url: cloudinaryData.secure_url,
          },
          { status: 500 },
        )
      }

      const attachmentResult = await attachmentResponse.json()
      console.log("[upload] Attachment record created:", attachmentResult)

      return NextResponse.json({
        success: true,
        data: cloudinaryData,
        attachment: attachmentResult,
      })
    } catch (attachmentError) {
      console.error("[upload] Unexpected error creating attachment record:", attachmentError)
      return NextResponse.json(
        {
          error: "File uploaded to Cloudinary but failed to save attachment record",
          details: attachmentError instanceof Error ? attachmentError.message : "Unknown error",
          cloudinary_url: cloudinaryData.secure_url,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[upload] Unhandled error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}