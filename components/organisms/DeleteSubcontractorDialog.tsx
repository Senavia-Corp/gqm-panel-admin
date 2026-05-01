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
import { useTranslations } from "@/components/providers/LocaleProvider"
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
  const t = useTranslations("subcontractors")
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [syncWithPodio, setSyncWithPodio] = useState(defaultSyncWithPodio)

  useEffect(() => {
    if (!open) return
    // cada vez que abras el modal, resetea el toggle al default
    setSyncWithPodio(defaultSyncWithPodio)
  }, [open, defaultSyncWithPodio])

  const handleConfirm = async () => {
    if (confirmText.toLowerCase() !== t("confirmWord").toLowerCase()) return

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
            {t("deleteTitle")}
          </DialogTitle>
          <DialogDescription>
            {t.rich("deleteDesc", {
              name: subcontractorName,
              id: subcontractorId,
              span: (chunks) => <span className="font-semibold">{chunks}</span>
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">⚠️ {t("deleteWarning")}</p>
            <p className="mt-2 text-sm text-red-700">
              {t("deleteWarningDesc")}
            </p>
          </div>

          {/* Toggle Podio */}
          <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
            <div className="flex items-start gap-2">
              <LinkIcon className="mt-0.5 h-4 w-4 text-gray-600" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{t("syncDeletePodio")}</div>
                <div className="text-xs text-gray-500">
                  {t("syncDeletePodioDesc")}
                </div>
              </div>
            </div>
            <Switch checked={syncWithPodio} onCheckedChange={setSyncWithPodio} disabled={isDeleting} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              {t.rich("confirmDeleteType", {
                text: t("confirmWord"),
                span: (chunks) => <span className="font-mono font-semibold">{chunks}</span>
              })}
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("confirmDeletePlaceholder", { text: t("confirmWord") })}
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmText.toLowerCase() !== t("confirmWord").toLowerCase() || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? t("deleting") : t("deleteTitle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}