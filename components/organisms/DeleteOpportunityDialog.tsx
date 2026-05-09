"use client"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Megaphone } from "lucide-react"
import { useState } from "react"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  projectName: string
  onConfirm: () => Promise<void>
}

export function DeleteOpportunityDialog({ open, onOpenChange, opportunityId, projectName, onConfirm }: Props) {
  const t = useTranslations("opportunities")
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
              <Megaphone className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              {t("del_title")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-500 text-sm">
            {t("del_confirm", { name: projectName || opportunityId })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            disabled={loading}
            className="rounded-xl border-slate-200 text-slate-600"
          >
            {t("del_cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => { e.preventDefault(); handleConfirm() }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("del_delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
