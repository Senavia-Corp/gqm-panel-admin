"use client"

import { useMemo, useState } from "react"
import { DocumentUpload } from "@/components/organisms/DocumentUpload"
import { AttachmentCard } from "@/components/molecules/AttachmentCard"
import {
  FileStack, Images, FileVideo, FileText, Files,
  FolderOpen, Users, HardHat, ChevronRight, ArrowLeft,
} from "lucide-react"
import type { Attachment } from "@/lib/types"
import { usePermissions } from "@/hooks/usePermissions"

type Props = {
  job: any
  onRefresh: () => Promise<void> | void
}

type FolderKey = "members" | "technicians"

const FILE_FILTERS = [
  { id: "all",       label: "All Files",  icon: Files     },
  { id: "images",    label: "Images",     icon: Images    },
  { id: "videos",    label: "Videos",     icon: FileVideo },
  { id: "documents", label: "Documents",  icon: FileText  },
] as const

const IMAGE_FMTS    = ["png", "jpg", "jpeg", "gif", "webp", "svg"]
const VIDEO_FMTS    = ["mp4", "mov", "avi", "mkv", "webm"]
const DOCUMENT_FMTS = ["pdf", "doc", "docx", "xls", "xlsx", "txt"]

function resolveJobYear(job: any): number | undefined {
  const id = String(job?.ID_Jobs ?? job?.id ?? "").trim()
  const m  = id.match(/\d/)
  return m ? 2020 + parseInt(m[0], 10) : undefined
}

// Files with no access_level fall into the Members folder by default
function belongsToFolder(attachment: Attachment, folder: FolderKey): boolean {
  const level = attachment.access_level
  if (folder === "members")     return level === "members" || !level
  if (folder === "technicians") return level === "technicians"
  return false
}

// ── Folder card shown on the root view ───────────────────────────────────────
function FolderCard({
  folder,
  count,
  onClick,
}: {
  folder: FolderKey
  count: number
  onClick: () => void
}) {
  const isMembers = folder === "members"
  const Icon      = isMembers ? Users : HardHat
  const label     = isMembers ? "Members" : "Technicians"
  const colors    = isMembers
    ? { ring: "ring-emerald-200", bg: "bg-emerald-50", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" }
    : { ring: "ring-sky-200",     bg: "bg-sky-50",     icon: "text-sky-600",     badge: "bg-sky-100 text-sky-700" }

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ring-0 hover:ring-2 ${colors.ring}`}
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${colors.bg}`}>
        <Icon className={`h-7 w-7 ${colors.icon}`} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-base font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {count === 0 ? "No files" : `${count} file${count !== 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors.badge}`}>
          {count}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function JobDocumentsTab({ job, onRefresh }: Props) {
  const [activeFolder, setActiveFolder] = useState<FolderKey | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const { hasPermission } = usePermissions()

  // ── Per-folder permission helpers ─────────────────────────────────────────
  const canReadFolder = (folder: FolderKey) =>
    hasPermission("attachment:read") || hasPermission(`attachment:read_${folder}`)

  const canUploadFolder = (folder: FolderKey) =>
    hasPermission("attachment:create") || hasPermission(`attachment:create_${folder}`)

  const canEditFolder = (folder: FolderKey) =>
    hasPermission("attachment:update") || hasPermission(`attachment:update_${folder}`)

  const canDeleteFolder = (folder: FolderKey) =>
    hasPermission("attachment:delete") || hasPermission(`attachment:delete_${folder}`)

  const jobId:  string           = job?.ID_Jobs ?? job?.id ?? ""
  const jobType: string          = job?.Job_type ?? job?.job_type ?? job?.jobType ?? ""
  const jobYear: number | undefined = useMemo(() => resolveJobYear(job), [job])

  const allAttachments: Attachment[] = useMemo(
    () => (Array.isArray(job?.attachments) ? job.attachments : []),
    [job?.attachments],
  )

  // Per-folder file sets
  const membersFiles      = useMemo(() => allAttachments.filter((a) => belongsToFolder(a, "members")),      [allAttachments])
  const techniciansFiles  = useMemo(() => allAttachments.filter((a) => belongsToFolder(a, "technicians")),  [allAttachments])

  // Files shown inside the active folder, further filtered by file type
  const folderFiles = useMemo(() => {
    if (!activeFolder) return []
    return activeFolder === "members" ? membersFiles : techniciansFiles
  }, [activeFolder, membersFiles, techniciansFiles])

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case "images":    return folderFiles.filter((a) => IMAGE_FMTS.includes((a.Document_type ?? "").toLowerCase()))
      case "videos":    return folderFiles.filter((a) => VIDEO_FMTS.includes((a.Document_type ?? "").toLowerCase()))
      case "documents": return folderFiles.filter((a) => DOCUMENT_FMTS.includes((a.Document_type ?? "").toLowerCase()))
      default:          return folderFiles
    }
  }, [folderFiles, activeFilter])

  const counts = useMemo(() => ({
    all:       folderFiles.length,
    images:    folderFiles.filter((a) => IMAGE_FMTS.includes((a.Document_type ?? "").toLowerCase())).length,
    videos:    folderFiles.filter((a) => VIDEO_FMTS.includes((a.Document_type ?? "").toLowerCase())).length,
    documents: folderFiles.filter((a) => DOCUMENT_FMTS.includes((a.Document_type ?? "").toLowerCase())).length,
  }), [folderFiles])

  const handleOpenFolder = (folder: FolderKey) => {
    setActiveFolder(folder)
    setActiveFilter("all")
  }

  const handleBack = () => {
    setActiveFolder(null)
    setActiveFilter("all")
  }

  // ── Root view: folder list ────────────────────────────────────────────────
  if (!activeFolder) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <FolderOpen className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Documents</h3>
            <p className="text-xs text-slate-500">
              {allAttachments.length === 0
                ? "No files uploaded yet"
                : `${allAttachments.length} file${allAttachments.length !== 1 ? "s" : ""} across all folders`}
            </p>
          </div>
        </div>

        {/* Folder cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {canReadFolder("members") && (
            <FolderCard folder="members"     count={membersFiles.length}     onClick={() => handleOpenFolder("members")} />
          )}
          {canReadFolder("technicians") && (
            <FolderCard folder="technicians" count={techniciansFiles.length} onClick={() => handleOpenFolder("technicians")} />
          )}
        </div>
      </div>
    )
  }

  // ── Folder view: upload + gallery ─────────────────────────────────────────
  const folderLabel  = activeFolder === "members" ? "Members" : "Technicians"
  const FolderIcon   = activeFolder === "members" ? Users : HardHat
  const folderColors = activeFolder === "members"
    ? { bg: "bg-emerald-50", icon: "text-emerald-600" }
    : { bg: "bg-sky-50",     icon: "text-sky-600" }

  return (
    <div className="space-y-6">

      {/* ── Folder header with back button ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          title="Back to folders"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${folderColors.bg}`}>
          <FolderIcon className={`h-4 w-4 ${folderColors.icon}`} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{folderLabel}</h3>
          <p className="text-xs text-slate-500">
            {folderFiles.length === 0
              ? "No files in this folder"
              : `${folderFiles.length} file${folderFiles.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* ── Upload zone ──────────────────────────────────────────────────────── */}
      {activeFolder && canUploadFolder(activeFolder) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <FileStack className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Upload to {folderLabel}</h3>
              <p className="text-xs text-slate-500">Supports images, videos, PDFs and office files</p>
            </div>
          </div>
          <DocumentUpload
            jobId={jobId}
            jobType={jobType}
            jobYear={jobYear}
            accessLevel={activeFolder}
            onUploadComplete={onRefresh}
          />
        </section>
      )}

      {/* ── Gallery ──────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
              <Images className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{folderLabel} Gallery</h3>
              <p className="text-xs text-slate-500">
                {folderFiles.length === 0 ? "No files uploaded yet" : `${folderFiles.length} file${folderFiles.length !== 1 ? "s" : ""} total`}
              </p>
            </div>
          </div>

          {/* File-type filter tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
            {FILE_FILTERS.map(({ id, label, icon: Icon }) => {
              const count  = counts[id as keyof typeof counts]
              const active = activeFilter === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
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
              {folderFiles.length === 0 ? "No files in this folder yet" : `No ${activeFilter} found`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {folderFiles.length === 0 ? "Upload a file using the zone above" : "Try a different filter"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((attachment) => (
              <AttachmentCard
                key={attachment.ID_Attachment}
                attachment={attachment}
                onDelete={onRefresh}
                onUpdate={onRefresh}
                jobYear={jobYear}
                appType={jobType}
                canEdit={activeFolder ? canEditFolder(activeFolder) : true}
                canDelete={activeFolder ? canDeleteFolder(activeFolder) : true}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
