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

interface DeleteTechnicianDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  technicianName: string
  onConfirm: () => void
}

export function DeleteTechnicianDialog({ open, onOpenChange, technicianName, onConfirm }: DeleteTechnicianDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Technician</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{technicianName}</strong>? This action cannot be undone and will
            remove the technician from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
