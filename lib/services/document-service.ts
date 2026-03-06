import type { Document } from "@/lib/types"

export async function uploadDocument(file: File, jobId: string, tag = "general"): Promise<Document> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("jobId", jobId)
  formData.append("tag", tag)

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || "Failed to upload document")
  }

  const { data } = await response.json()

  // Transform Cloudinary response to Document type
  return {
    id: data.asset_id,
    publicId: data.public_id,
    fileName: data.original_filename,
    fileSize: data.bytes,
    uploadDate: new Date(data.created_at).toLocaleDateString(),
    tag: data.tags?.[0] || "general",
    url: data.url,
    secureUrl: data.secure_url,
    resourceType: data.resource_type,
    format: data.format,
    thumbnailUrl: data.resource_type === "image" ? data.secure_url : undefined,
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
