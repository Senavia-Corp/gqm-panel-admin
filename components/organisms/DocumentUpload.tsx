"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Upload, Loader2, Zap, ZapOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DocumentUploadProps {
  jobId: string
  jobType: string
  jobYear?: number        // ← required by backend when sync_podio=true
  accessLevel?: "members" | "technicians"
  onUploadComplete?: () => void
}

// ─── Small reusable Podio toggle ─────────────────────────────────────────────

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
      title={value ? "Podio sync enabled — click to disable" : "Podio sync disabled — click to enable"}
    >
      {value
        ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500 flex-shrink-0" />
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

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentUpload({ jobId, jobType, jobYear, accessLevel, onUploadComplete }: DocumentUploadProps) {
  const [isDragging,             setIsDragging]             = useState(false)
  const [isUploading,            setIsUploading]            = useState(false)
  const [pendingFile,            setPendingFile]            = useState<File | null>(null)
  const [description,            setDescription]            = useState("")
  const [showDescriptionDialog,  setShowDescriptionDialog]  = useState(false)
  const [syncPodio,              setSyncPodio]              = useState(false)
  const { toast } = useToast()

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false)
  }, [])

  // ── Core upload — delegates entirely to the Python backend ─────────────────
  const uploadFile = async (file: File, fileDescription: string, withPodio: boolean) => {
    setIsUploading(true)
    try {
      // Resolve year: use prop or derive from jobId (first digit → 2020+)
      const resolvedYear = jobYear ?? (() => {
        const m = String(jobId).match(/\d/)
        return m ? 2020 + parseInt(m[0], 10) : undefined
      })()

      const formData = new FormData()
      formData.append("file",        file)
      formData.append("entity_id",   jobId)
      formData.append("description", fileDescription)
      formData.append("tag",         "general")
      if (resolvedYear)  formData.append("year",         String(resolvedYear))
      if (accessLevel)   formData.append("access_level", accessLevel)

      const qs = new URLSearchParams()
      qs.set("sync_podio", withPodio ? "true" : "false")

      const response = await apiFetch(`/api/upload?${qs.toString()}`, {
        method: "POST",
        body:   formData,
        // No Content-Type header — browser sets multipart boundary automatically
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as any)?.error ?? (err as any)?.detail ?? `Upload failed (${response.status})`)
      }

      toast({ title: "Upload successful", description: `${file.name} uploaded successfully` })
      onUploadComplete?.()
    } catch (error) {
      console.error("[DocumentUpload] error:", error)
      toast({
        title:       "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant:     "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // ── File selection — opens description + sync dialog ──────────────────────
  const handleFileSelected = (file: File) => {
    setPendingFile(file)
    setDescription("")
    setShowDescriptionDialog(true)
  }

  const handleUploadConfirmed = () => {
    if (!pendingFile) return
    const file         = pendingFile
    const desc         = description
    const withPodio    = syncPodio
    setShowDescriptionDialog(false)
    setPendingFile(null)
    setDescription("")
    uploadFile(file, desc, withPodio)
  }

  const handleCancelDialog = () => {
    setShowDescriptionDialog(false)
    setPendingFile(null)
    setDescription("")
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFileSelected(files[0])
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) handleFileSelected(files[0])
  }, [])

  const handleClick = () => {
    if (!isUploading) document.getElementById("file-input-upload")?.click()
  }

  return (
    <>
      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          isDragging ? "border-gqm-green bg-gqm-green/5" : "border-gray-300 bg-white hover:border-gqm-green/50",
          isUploading && "cursor-not-allowed opacity-50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          id="file-input-upload"
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.avi,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gqm-green">
          {isUploading
            ? <Loader2 className="h-10 w-10 animate-spin text-white" />
            : <Upload  className="h-10 w-10 text-white" />
          }
        </div>
        <p className="mt-4 text-lg font-medium">
          {isUploading ? "Uploading…" : "Drag and drop files here"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isUploading ? "Please wait…" : "Or click to browse"}
        </p>
      </div>

      {/* ── Description + Podio sync dialog ───────────────────────────────── */}
      <Dialog open={showDescriptionDialog} onOpenChange={(v) => !v && handleCancelDialog()}>
        <DialogContent className="!max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              {pendingFile?.name && (
                <span className="font-mono text-xs text-slate-500">{pendingFile.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="upload-description">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                id="upload-description"
                placeholder="Enter file description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUploadConfirmed()}
              />
            </div>

            {/* Podio sync toggle */}
            <div className="space-y-1.5">
              <Label>Podio Sync</Label>
              <PodioToggle
                value={syncPodio}
                onChange={setSyncPodio}
                jobYear={jobYear}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelDialog}>Cancel</Button>
            <Button onClick={handleUploadConfirmed} className="bg-gqm-green hover:bg-gqm-green/90">
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}