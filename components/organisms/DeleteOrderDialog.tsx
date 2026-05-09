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
import type { SubcontractorOrder } from "@/lib/types"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface DeleteOrderDialogProps {
  order: SubcontractorOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteOrderDialog({ order, open, onOpenChange, onConfirm }: DeleteOrderDialogProps) {
  const t = useTranslations("jobs")
  if (!order) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("orderDeleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("orderDeleteDescPre")} "{order.Order_Name}" (ID: {order.ID_Order}){t("orderDeleteDescPost")} {order.Items.length} {t("orderDeleteDescEnd")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("orderDeleteCancelBtn")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
            {t("orderDeleteConfirmBtn")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
