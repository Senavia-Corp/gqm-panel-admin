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
import { useTranslations } from "@/components/providers/LocaleProvider"

interface DeleteTechnicianDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  technicianName: string
  onConfirm: () => void
}

export function DeleteTechnicianDialog({ open, onOpenChange, technicianName, onConfirm }: DeleteTechnicianDialogProps) {
  const t = useTranslations("subcontractors")
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTechTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("deleteTechConfirmDesc", {
              name: technicianName,
              nameTag: (chunks) => <strong>{chunks}</strong>,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
