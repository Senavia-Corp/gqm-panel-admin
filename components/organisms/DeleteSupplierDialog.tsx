"use client"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Store } from "lucide-react"
import { useState } from "react"
import { useTranslations } from "@/components/providers/LocaleProvider"

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
  const t = useTranslations("suppliers")

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
              {t("del_title")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-500 text-sm">
            {t("del_description", { name: companyName || supplierId })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Podio toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">{t("del_syncPodio")}</p>
            <p className="text-[11px] text-slate-400">{t("del_syncPodioDesc")}</p>
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
            {syncPodio ? t("del_on") : t("del_off")}
          </button>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading} className="rounded-xl border-slate-200 text-slate-600">
            {t("del_btnCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => { e.preventDefault(); handleConfirm() }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("del_btnDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
