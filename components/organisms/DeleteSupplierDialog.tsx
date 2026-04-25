"use client"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Store } from "lucide-react"
import { useState } from "react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
  companyName: string
  syncPodio: boolean
  onSyncPodioChange: (v: boolean) => void
  onConfirm: () => Promise<void>
}

export function DeleteSupplierDialog({
  open, onOpenChange, supplierId, companyName, syncPodio, onSyncPodioChange, onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <Store className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Delete Supplier
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-500 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">
              {companyName || supplierId}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Podio toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">Sync with Podio</p>
            <p className="text-[11px] text-slate-400">Also delete from Podio if enabled</p>
          </div>
          <button
            type="button"
            onClick={() => onSyncPodioChange(!syncPodio)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              syncPodio
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${syncPodio ? "bg-blue-500" : "bg-slate-400"}`} />
            {syncPodio ? "ON" : "OFF"}
          </button>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading} className="rounded-xl border-slate-200 text-slate-600">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => { e.preventDefault(); handleConfirm() }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
