"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Trash2, AlertTriangle } from "lucide-react"

interface DeleteJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (opts: { syncPodio: boolean; year?: number }) => Promise<void> | void
  jobId: string

  // ✅ nuevos
  defaultSyncPodio?: boolean
  suggestedYear?: number | null
}

export function DeleteJobDialog({
  open,
  onOpenChange,
  onConfirm,
  jobId,
  defaultSyncPodio = false,
  suggestedYear = null,
}: DeleteJobDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const [syncPodio, setSyncPodio] = useState<boolean>(defaultSyncPodio)
  const [year, setYear] = useState<string>(suggestedYear ? String(suggestedYear) : "")

  useEffect(() => {
    if (!open) return
    setConfirmText("")
    setIsDeleting(false)
    setSyncPodio(defaultSyncPodio)
    setYear(suggestedYear ? String(suggestedYear) : "")
  }, [open, defaultSyncPodio, suggestedYear])

  const yearNum = useMemo(() => {
    const n = Number(year)
    return Number.isFinite(n) ? n : NaN
  }, [year])

  const yearIsValid = !syncPodio || (Number.isFinite(yearNum) && yearNum >= 2000 && yearNum <= 2100)

  const canDelete = confirmText.toLowerCase() === "delete" && !isDeleting && yearIsValid

  const handleConfirm = async () => {
    if (!canDelete) return

    setIsDeleting(true)
    try {
      await onConfirm({ syncPodio, year: syncPodio ? yearNum : undefined })
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setConfirmText("")
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Permanently Delete Job
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Job <span className="font-semibold">{jobId}</span> will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">⚠️ Warning: This is a permanent action</p>
            <p className="mt-2 text-sm text-red-700">
              All data associated with this job will be permanently removed and cannot be recovered.
            </p>
          </div>

          {/* ✅ Podio sync */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold">Sync deletion with Podio</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  If enabled, we will also delete/update the corresponding Podio item.
                </p>
              </div>
              <Switch checked={syncPodio} onCheckedChange={setSyncPodio} />
            </div>

            {syncPodio && (
              <div className="space-y-2">
                <Label htmlFor="podio-year">Podio App Year</Label>
                <Input
                  id="podio-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2026"
                  inputMode="numeric"
                />
                {!yearIsValid && (
                  <p className="text-xs text-red-600">Year is required (2000–2100) when Podio sync is enabled.</p>
                )}
                {suggestedYear && (
                  <p className="text-xs text-muted-foreground">
                    Suggested year was detected from the job date: <span className="font-medium">{suggestedYear}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ✅ confirm word */}
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
          <Button onClick={handleConfirm} disabled={!canDelete} className="bg-red-600 hover:bg-red-700">
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}