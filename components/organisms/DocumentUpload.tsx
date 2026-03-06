"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
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
  onUploadComplete?: () => void
}

export function DocumentUpload({ jobId, jobType, onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false)
  const { toast } = useToast()

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const uploadFile = async (file: File, fileDescription: string) => {
    setIsUploading(true)

    try {
      console.log("[v0] Uploading file to Cloudinary for job:", jobId)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("jobId", jobId)
      formData.append("jobType", jobType)
      formData.append("description", fileDescription)
      formData.append("tag", "general")

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || "Failed to upload file")
      }

      console.log("[v0] File uploaded successfully:", file.name)

      toast({
        title: "Upload successful",
        description: `${file.name} uploaded successfully`,
      })

      // Notify parent component to refresh documents
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelected = (file: File) => {
    setPendingFile(file)
    setDescription("")
    setShowDescriptionDialog(true)
  }

  const handleUploadWithDescription = () => {
    if (pendingFile) {
      setShowDescriptionDialog(false)
      uploadFile(pendingFile, description)
      setPendingFile(null)
      setDescription("")
    }
  }

  const handleCancelDescription = () => {
    setShowDescriptionDialog(false)
    setPendingFile(null)
    setDescription("")
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileSelected(files[0])
      }
    },
    [jobId],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        handleFileSelected(files[0])
      }
    },
    [jobId],
  )

  const handleClick = () => {
    if (!isUploading) {
      document.getElementById("file-input")?.click()
    }
  }

  return (
    <>
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
          id="file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.avi,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gqm-green">
          {isUploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          ) : (
            <Upload className="h-10 w-10 text-white" />
          )}
        </div>
        <p className="mt-4 text-lg font-medium">{isUploading ? "Uploading..." : "Drag and drop files here"}</p>
        <p className="text-sm text-muted-foreground">{isUploading ? "Please wait..." : "Or click to browse"}</p>
      </div>

      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Description (Optional)</DialogTitle>
            <DialogDescription>
              You can add a description for this file. This is optional and can be edited later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter file description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDescription}>
              Cancel
            </Button>
            <Button onClick={handleUploadWithDescription} className="bg-gqm-green hover:bg-gqm-green/90">
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
