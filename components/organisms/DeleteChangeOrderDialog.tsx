"use client"

import { useMemo, useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface DeleteChangeOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  changeOrderId: string
  changeOrderName?: string

  defaultSyncPodio: boolean
  jobYearForPodioSync?: number

  onDeleted?: () => void
}

export function DeleteChangeOrderDialog({
  open,
  onOpenChange,
  changeOrderId,
  changeOrderName,
  defaultSyncPodio,
  jobYearForPodioSync,
  onDeleted,
}: DeleteChangeOrderDialogProps) {
  const [loading, setLoading] = useState(false)
  const [syncPodio, setSyncPodio] = useState(defaultSyncPodio)

  const yearForPodio = useMemo(() => jobYearForPodioSync, [jobYearForPodioSync])

  const handleDelete = async () => {
    if (syncPodio && !yearForPodio) {
      toast.error("Year is required when Sync Podio is enabled")
      return
    }

    const qs = new URLSearchParams()
    qs.set("sync_podio", String(!!syncPodio))
    if (syncPodio && yearForPodio) qs.set("year", String(yearForPodio))

    try {
      setLoading(true)

      const url = `/api/change-order/${encodeURIComponent(changeOrderId)}?${qs.toString()}`
      const res = await fetch(url, { method: "DELETE" })

      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        throw new Error(msg || `Delete failed (${res.status})`)
      }

      toast.success("Change order deleted")
      onOpenChange(false)
      onDeleted?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Change Order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium">{changeOrderName || changeOrderId}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-3 rounded-md border p-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-medium">Sync Podio</div>
            <div className="text-sm text-muted-foreground">
              {syncPodio ? `Enabled${yearForPodio ? ` (year: ${yearForPodio})` : ""}` : "Disabled"}
            </div>
          </div>
          <Switch checked={syncPodio} onCheckedChange={(v) => setSyncPodio(!!v)} />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}