"use client"

import { useMemo, useState } from "react"
import { DocumentUpload } from "@/components/organisms/DocumentUpload"
import { AttachmentCard } from "@/components/molecules/AttachmentCard"
import { FileStack, Images, FileVideo, FileText, Files } from "lucide-react"

type Props = {
  job: any
  onRefresh: () => Promise<void> | void
}

const FILTERS = [
  { id: "all", label: "All Files", icon: Files },
  { id: "images", label: "Images", icon: Images },
  { id: "videos", label: "Videos", icon: FileVideo },
  { id: "documents", label: "Documents", icon: FileText },
] as const

const IMAGE_FMTS = ["png", "jpg", "jpeg", "gif", "webp", "svg"]
const VIDEO_FMTS = ["mp4", "mov", "avi", "mkv", "webm"]
const DOCUMENT_FMTS = ["pdf", "doc", "docx", "xls", "xlsx", "txt"]

// Resolve year from Job ID first numeric digit: QID5xxx→2025, PTL6xxx→2026
function resolveJobYear(job: any): number | undefined {
  const id = String(job?.ID_Jobs ?? job?.id ?? "").trim()
  const m = id.match(/\d/)
  return m ? 2020 + parseInt(m[0], 10) : undefined
}

export function JobDocumentsTab({ job, onRefresh }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("all")

  const jobId: string = job?.ID_Jobs ?? job?.id ?? ""
  const jobType: string = job?.Job_type ?? job?.job_type ?? job?.jobType ?? ""
  const jobYear: number | undefined = useMemo(() => resolveJobYear(job), [job])

  const allAttachments: any[] = Array.isArray(job?.attachments) ? job.attachments : []

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case "images": return allAttachments.filter((a) => IMAGE_FMTS.includes((a.Document_type ?? "").toLowerCase()))
      case "videos": return allAttachments.filter((a) => VIDEO_FMTS.includes((a.Document_type ?? "").toLowerCase()))
      case "documents": return allAttachments.filter((a) => DOCUMENT_FMTS.includes((a.Document_type ?? "").toLowerCase()))
      default: return allAttachments
    }
  }, [allAttachments, activeFilter])

  const counts = useMemo(() => ({
    all: allAttachments.length,
    images: allAttachments.filter((a) => IMAGE_FMTS.includes((a.Document_type ?? "").toLowerCase())).length,
    videos: allAttachments.filter((a) => VIDEO_FMTS.includes((a.Document_type ?? "").toLowerCase())).length,
    documents: allAttachments.filter((a) => DOCUMENT_FMTS.includes((a.Document_type ?? "").toLowerCase())).length,
  }), [allAttachments])

  return (
    <div className="space-y-6">

      {/* ── Upload zone ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <FileStack className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Upload Documents</h3>
            <p className="text-xs text-slate-500">Supports images, videos, PDFs and office files</p>
          </div>
        </div>
        <DocumentUpload
          jobId={jobId}
          jobType={jobType}
          jobYear={jobYear}
          onUploadComplete={onRefresh}
        />
      </section>

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
              <Images className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Job Gallery</h3>
              <p className="text-xs text-slate-500">
                {allAttachments.length === 0
                  ? "No files uploaded yet"
                  : `${allAttachments.length} file${allAttachments.length !== 1 ? "s" : ""} total`}
              </p>
            </div>
          </div>

          {/* Filter pill tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
            {FILTERS.map(({ id, label, icon: Icon }) => {
              const count = counts[id as keyof typeof counts]
              const active = activeFilter === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${active
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FileStack className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {allAttachments.length === 0 ? "No documents uploaded yet" : `No ${activeFilter} found`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {allAttachments.length === 0 ? "Upload a file using the zone above" : "Try a different filter"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((attachment: any) => (
              <AttachmentCard
                key={attachment.ID_Attachment}
                attachment={attachment}
                onDelete={onRefresh}
                onUpdate={onRefresh}
                jobYear={jobYear}
                appType={jobType}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}