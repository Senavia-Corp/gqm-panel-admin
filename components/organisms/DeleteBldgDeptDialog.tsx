"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Landmark, Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bldgDeptId: string
  cityName: string
  onConfirm: (syncPodio: boolean) => Promise<void>
  defaultSyncWithPodio?: boolean
}

export function DeleteBldgDeptDialog({
  open,
  onOpenChange,
  bldgDeptId,
  cityName,
  onConfirm,
  defaultSyncWithPodio = true,
}: Props) {
  const t = useTranslations("buildingDepartments")
  const [syncPodio, setSyncPodio] = useState(defaultSyncWithPodio)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(syncPodio)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-slate-900">
            {t("bd_deleteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500">
            {t("bd_deleteConfirm", { name: cityName || bldgDeptId })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Podio sync toggle */}
        <div className="my-1 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {t("bd_deleteSyncPodio")}
              </span>
            </div>
            <div
              className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors ${
                syncPodio ? "bg-red-500" : "bg-slate-200"
              }`}
              onClick={() => setSyncPodio((v) => !v)}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  syncPodio ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className="text-sm border-slate-200"
          >
            {t("bd_cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => { e.preventDefault(); handleConfirm() }}
            className="gap-2 bg-red-600 text-white hover:bg-red-700 text-sm"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("bd_deleting")}</>
            ) : (
              <><Trash2 className="h-4 w-4" /> {t("bd_delete")}</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
