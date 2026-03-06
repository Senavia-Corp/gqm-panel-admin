"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Archive } from "lucide-react"

interface ArchiveJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  jobId: string
}

export function ArchiveJobDialog({ open, onOpenChange, onConfirm, jobId }: ArchiveJobDialogProps) {
  const [isArchiving, setIsArchiving] = useState(false)

  const handleConfirm = async () => {
    setIsArchiving(true)
    await onConfirm()
    setIsArchiving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive Job
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to archive job <span className="font-semibold">{jobId}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            This job will not be deleted, but will be moved to archived status. You can still access and delete it later
            if needed.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isArchiving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isArchiving} className="bg-gray-800 hover:bg-gray-900">
            {isArchiving ? "Archiving..." : "Confirm Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
