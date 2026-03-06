"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DocumentUpload } from "@/components/organisms/DocumentUpload"
import { AttachmentCard } from "@/components/molecules/AttachmentCard"

type Props = {
  job: any
  onRefresh: () => void
}

export function JobDocumentsTab({ job, onRefresh }: Props) {
  const [documentFilter, setDocumentFilter] = useState<string>("all")

  const documentFilters = [
    { id: "all", label: "All Files" },
    { id: "images", label: "Images" },
    { id: "videos", label: "Videos" },
    { id: "documents", label: "Documents" },
  ]

  const filteredAttachments = useMemo(() => {
    if (!job?.attachments) return []

    const imageFormats = ["png", "jpg", "jpeg", "gif", "webp", "svg"]
    const videoFormats = ["mp4", "mov", "avi", "mkv", "webm"]
    const documentFormats = ["pdf", "doc", "docx", "xls", "xlsx", "txt"]

    switch (documentFilter) {
      case "images":
        return job.attachments.filter((att: any) => imageFormats.includes(att.Document_type.toLowerCase()))
      case "videos":
        return job.attachments.filter((att: any) => videoFormats.includes(att.Document_type.toLowerCase()))
      case "documents":
        return job.attachments.filter((att: any) => documentFormats.includes(att.Document_type.toLowerCase()))
      default:
        return job.attachments
    }
  }, [job?.attachments, documentFilter])

  return (
    <>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Job Documents</h2>
        <DocumentUpload jobId={job.id} jobType={job.jobType} onUploadComplete={onRefresh} />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Job Gallery</h2>

        <div className="mb-6 inline-flex gap-2 rounded-lg border bg-white p-1">
          {documentFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={documentFilter === filter.id ? "default" : "ghost"}
              className={
                documentFilter === filter.id
                  ? "bg-gqm-yellow text-black hover:bg-gqm-yellow/90"
                  : "hover:bg-gray-100"
              }
              onClick={() => setDocumentFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {!job.attachments || filteredAttachments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {!job.attachments ? "No documents uploaded yet" : `No ${documentFilter} found`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {filteredAttachments.map((attachment: any) => (
              <AttachmentCard
                key={attachment.ID_Attachment}
                attachment={attachment}
                onDelete={onRefresh}
                onUpdate={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
