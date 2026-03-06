"use client"

import { useState } from "react"
import { Download, Trash2, Edit, FileText, ImageIcon, Video } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Attachment } from "@/lib/types"

interface AttachmentCardProps {
  attachment: Attachment
  onDelete?: () => void
  onUpdate?: () => void
}

const getFileIcon = (format: string) => {
  const imageFormats = ["png", "jpg", "jpeg", "gif", "webp", "svg"]
  const videoFormats = ["mp4", "mov", "avi", "mkv", "webm"]
  const lowerFormat = format.toLowerCase()

  if (imageFormats.includes(lowerFormat)) {
    return <ImageIcon className="h-8 w-8" />
  }
  if (videoFormats.includes(lowerFormat)) {
    return <Video className="h-8 w-8" />
  }
  return <FileText className="h-8 w-8" />
}

const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const match = url.match(/\/v\d+\/(.+)\.[^.]+$/)
    if (match) {
      return match[1]
    }
    return null
  } catch {
    return null
  }
}

export function AttachmentCard({ attachment, onDelete, onUpdate }: AttachmentCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editedDescription, setEditedDescription] = useState(attachment.Attachment_descr || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDownload = () => {
    window.open(attachment.Link, "_blank")
  }

  const handleEdit = () => {
    setEditedDescription(attachment.Attachment_descr || "")
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/attachments/${attachment.ID_Attachment}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Attachment_descr: editedDescription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update attachment")
      }

      toast({
        title: "Success",
        description: "Description updated successfully",
      })

      setShowEditDialog(false)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("[v0] Error updating attachment:", error)
      toast({
        title: "Error",
        description: "Failed to update description",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const publicId = getPublicIdFromUrl(attachment.Link)
      const url = publicId
        ? `/api/attachments/${attachment.ID_Attachment}?publicId=${encodeURIComponent(publicId)}`
        : `/api/attachments/${attachment.ID_Attachment}`

      const response = await fetch(url, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete attachment")
      }

      toast({
        title: "Success",
        description: "File deleted successfully",
      })

      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error("[v0] Error deleting attachment:", error)
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(attachment.Document_type.toLowerCase())

  return (
    <>
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-gray-100">
          {isImage ? (
            <img
              src={attachment.Link || "/placeholder.svg"}
              alt={attachment.Document_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {getFileIcon(attachment.Document_type)}
            </div>
          )}
          <Badge className="absolute right-2 top-2 bg-white text-black hover:bg-white">
            {attachment.Document_type}
          </Badge>
        </div>
        <div className="p-4">
          <h3 className="truncate font-medium">{attachment.Document_name}</h3>
          {attachment.Attachment_descr && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{attachment.Attachment_descr}</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1 bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="icon" onClick={handleEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <span className="h-4 w-4 animate-spin">⏳</span> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Description</DialogTitle>
            <DialogDescription>Update the description for {attachment.Document_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                placeholder="Enter file description..."
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating} className="bg-gqm-green hover:bg-gqm-green/90">
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
