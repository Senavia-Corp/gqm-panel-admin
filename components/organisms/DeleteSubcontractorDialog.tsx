"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Trash2, AlertTriangle, Link as LinkIcon } from "lucide-react"

interface DeleteSubcontractorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (syncWithPodio: boolean) => Promise<void> | void
  subcontractorId: string
  subcontractorName: string
  defaultSyncWithPodio?: boolean
}

export function DeleteSubcontractorDialog({
  open,
  onOpenChange,
  onConfirm,
  subcontractorId,
  subcontractorName,
  defaultSyncWithPodio = true,
}: DeleteSubcontractorDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [syncWithPodio, setSyncWithPodio] = useState(defaultSyncWithPodio)

  useEffect(() => {
    if (!open) return
    // cada vez que abras el modal, resetea el toggle al default
    setSyncWithPodio(defaultSyncWithPodio)
  }, [open, defaultSyncWithPodio])

  const handleConfirm = async () => {
    if (confirmText.toLowerCase() !== "delete") return

    try {
      setIsDeleting(true)
      await onConfirm(syncWithPodio)
      setConfirmText("")
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setConfirmText("")
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Subcontractor
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-semibold">{subcontractorName}</span> ({subcontractorId})?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">⚠️ Warning</p>
            <p className="mt-2 text-sm text-red-700">
              This action will remove the subcontractor and all associated data. This action cannot be undone.
            </p>
          </div>

          {/* Toggle Podio */}
          <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
            <div className="flex items-start gap-2">
              <LinkIcon className="mt-0.5 h-4 w-4 text-gray-600" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Sync deletion with Podio</div>
                <div className="text-xs text-gray-500">
                  If enabled, the linked Podio item (if any) will be deleted too.
                </div>
              </div>
            </div>
            <Switch checked={syncWithPodio} onCheckedChange={setSyncWithPodio} disabled={isDeleting} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-mono font-semibold">delete</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'delete' here"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmText.toLowerCase() !== "delete" || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Subcontractor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}