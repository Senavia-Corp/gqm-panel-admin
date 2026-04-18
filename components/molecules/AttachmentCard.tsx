"use client"

import { useState } from "react"
import {
  Download, Trash2, Edit, FileText, ImageIcon, Video,
  File, ExternalLink, CheckCircle2, AlertTriangle,
  Zap, ZapOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { Attachment } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"

interface AttachmentCardProps {
  attachment: Attachment
  /** Called after a successful delete or update so the parent can reload */
  onDelete?: () => void
  onUpdate?: () => void
  /** Year resolved from job ID — used by Podio sync */
  jobYear?:  number
  /** App type (QID / PTL / PAR) — required by Python when sync_podio=true */
  appType?:  string
  /** Permission gates — hide edit/delete buttons when false */
  canEdit?:   boolean
  canDelete?: boolean
}

// ─── File type helpers ────────────────────────────────────────────────────────

const IMAGE_FMTS    = ["png", "jpg", "jpeg", "gif", "webp", "svg"]
const VIDEO_FMTS    = ["mp4", "mov", "avi", "mkv", "webm"]
const DOCUMENT_FMTS = ["pdf", "doc", "docx", "xls", "xlsx", "txt"]

function classifyFormat(fmt: string): "image" | "video" | "document" | "other" {
  const f = fmt.toLowerCase()
  if (IMAGE_FMTS.includes(f))    return "image"
  if (VIDEO_FMTS.includes(f))    return "video"
  if (DOCUMENT_FMTS.includes(f)) return "document"
  return "other"
}

const TYPE_META = {
  image:    { icon: ImageIcon, accent: "bg-sky-500",    badge: "bg-sky-50 text-sky-700 border-sky-200" },
  video:    { icon: Video,     accent: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  document: { icon: FileText,  accent: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  other:    { icon: File,      accent: "bg-slate-400",  badge: "bg-slate-50 text-slate-600 border-slate-200" },
}

// ─── Small reusable Podio toggle ──────────────────────────────────────────────

function PodioToggle({
  value,
  onChange,
  jobYear,
  disabled,
}: {
  value: boolean
  onChange: (v: boolean) => void
  jobYear?: number
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all",
        value
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {value
        ? <Zap    className="h-4 w-4 fill-emerald-400 text-emerald-500 flex-shrink-0" />
        : <ZapOff className="h-4 w-4 flex-shrink-0" />
      }
      <div className="flex-1 text-left">
        <span className="text-xs font-semibold">
          Sync to Podio {value ? "ON" : "OFF"}
        </span>
        {value && jobYear && (
          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            {jobYear}
          </span>
        )}
        {value && !jobYear && (
          <span className="ml-2 text-[10px] text-red-500">Year not resolved — sync may fail</span>
        )}
      </div>
    </button>
  )
}

// ─── Helper — build query string for sync params ──────────────────────────────

function buildSyncQs(syncPodio: boolean, appType?: string, jobYear?: number): string {
  const qs = new URLSearchParams()
  qs.set("sync_podio", syncPodio ? "true" : "false")
  if (syncPodio && appType)  qs.set("app_type", appType)
  if (syncPodio && jobYear)  qs.set("year",     String(jobYear))
  return qs.toString()
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AttachmentCard({
  attachment,
  onDelete,
  onUpdate,
  jobYear,
  appType,
  canEdit   = true,
  canDelete = true,
}: AttachmentCardProps) {
  const [showEditDialog,   setShowEditDialog]   = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Per-dialog independent Podio sync toggles (default OFF)
  const [editSyncPodio,   setEditSyncPodio]   = useState(false)
  const [deleteSyncPodio, setDeleteSyncPodio] = useState(false)

  const [editedDescription, setEditedDescription] = useState(attachment.Attachment_descr || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const fmt  = (attachment.Document_type ?? "").toLowerCase()
  const kind = classifyFormat(fmt)
  const meta = TYPE_META[kind]
  const Icon = meta.icon
  const isImage = kind === "image"

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleDownload = () => window.open(attachment.Link, "_blank")

  const handleOpenEdit = () => {
    setEditedDescription(attachment.Attachment_descr || "")
    setEditSyncPodio(false)
    setShowEditDialog(true)
  }

  const handleOpenDelete = () => {
    setDeleteSyncPodio(false)
    setShowDeleteDialog(true)
  }

  const handleSaveEdit = async () => {
    setIsUpdating(true)
    try {
      const qs  = buildSyncQs(editSyncPodio, appType, jobYear)
      const res = await apiFetch(`/api/attachments/${attachment.ID_Attachment}?${qs}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ Attachment_descr: editedDescription }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.error ?? (err as any)?.detail ?? "Failed to update")
      }
      toast({ title: "Description updated", description: "Changes saved successfully." })
      setShowEditDialog(false)
      onUpdate?.()
    } catch (err) {
      toast({
        title:       "Error",
        description: err instanceof Error ? err.message : "Failed to update description",
        variant:     "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true)
    try {
      // Backend now handles Cloudinary deletion internally — no publicId needed.
      const qs  = buildSyncQs(deleteSyncPodio, appType, jobYear)
      const res = await apiFetch(`/api/attachments/${attachment.ID_Attachment}?${qs}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.error ?? (err as any)?.detail ?? "Failed to delete")
      }
      toast({
        title:       "File deleted",
        description: `${attachment.Document_name} removed successfully.`,
      })
      setShowDeleteDialog(false)
      onDelete?.()
    } catch (err) {
      toast({
        title:       "Error",
        description: err instanceof Error ? err.message : "Failed to delete file",
        variant:     "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* ── Card ────────────────────────────────────────────────────────── */}
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">

        {/* Color accent bar */}
        <div className={`h-1 w-full ${meta.accent}`} />

        {/* Preview area */}
        <div className="relative aspect-video bg-slate-50">
          {isImage ? (
            <img
              src={attachment.Link}
              alt={attachment.Document_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${meta.accent}`}>
                <Icon className="h-7 w-7" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {fmt || "file"}
              </span>
            </div>
          )}

          {/* Format badge */}
          <span className={`absolute right-2 top-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.badge}`}>
            {fmt || "—"}
          </span>

          {/* Image hover overlay */}
          {isImage && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleDownload}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 transition hover:bg-white"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <p className="truncate text-sm font-semibold text-slate-800" title={attachment.Document_name}>
            {attachment.Document_name}
          </p>
          {attachment.Attachment_descr
            ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{attachment.Attachment_descr}</p>
            : <p className="mt-1 text-xs italic text-slate-300">No description</p>
          }

          {/* Actions */}
          <div className="mt-4 flex items-center gap-1.5">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            {canEdit && (
              <button
                onClick={handleOpenEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                title="Edit description"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleOpenDelete}
                disabled={isDeleting}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                title="Delete file"
              >
                {isDeleting
                  ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-red-400" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(v) => !isDeleting && setShowDeleteDialog(v)}
      >
        <DialogContent className="!max-w-[420px] gap-0 overflow-hidden p-0">
          {/* Red header */}
          <div className="border-b border-red-100 bg-red-50 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">Delete File</DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-slate-500">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6">
            {/* File preview chip */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${meta.accent}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{attachment.Document_name}</p>
                <p className="text-xs text-slate-400 uppercase">{fmt || "file"}</p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700">
                The file will be permanently removed from the database and from Cloudinary storage.
              </p>
            </div>

            {/* Podio sync toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Podio Sync</Label>
              <PodioToggle
                value={deleteSyncPodio}
                onChange={setDeleteSyncPodio}
                jobYear={jobYear}
                disabled={isDeleting}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete File
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit description dialog ──────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={(v) => !isUpdating && setShowEditDialog(v)}>
        <DialogContent className="!max-w-[460px] gap-0 overflow-hidden p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-base font-semibold">Edit Description</DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-slate-500">
              {attachment.Document_name}
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-4 p-6">
            {/* Description input */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-sm font-medium text-slate-700">
                Description
              </Label>
              <Input
                id="edit-desc"
                placeholder="Enter a description…"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isUpdating && handleSaveEdit()}
              />
            </div>

            {/* Podio sync toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Podio Sync</Label>
              <PodioToggle
                value={editSyncPodio}
                onChange={setEditSyncPodio}
                jobYear={jobYear}
                disabled={isUpdating}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isUpdating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}