"use client"

import { Eye, Trash2, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Technician } from "@/lib/types"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface TechnicianCardProps {
  technician: Technician
  onView: (id: string) => void
  onDelete: (id: string) => void
}

export function TechnicianCard({ technician, onView, onDelete }: TechnicianCardProps) {
  const t = useTranslations("subcontractors")
  
  const isLeader = technician.Type === "Leader" || technician.Type_of_technician === "Leader"
  
  const initials = technician.Name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join("") || "T"

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm ${isLeader ? 'bg-amber-500' : 'bg-emerald-600'}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-900 leading-none">{technician.Name}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-slate-400">{technician.ID_Technician}</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${isLeader ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                {isLeader ? t("leader") : t("worker")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body / Contact Info */}
      <div className="flex flex-1 flex-col justify-center space-y-2.5 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Mail className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="truncate">{technician.Email || technician.Email_Address || <span className="italic text-slate-400">No email</span>}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Phone className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span>{technician.Phone_number || technician.Phone_Number || <span className="italic text-slate-400">No phone</span>}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="truncate">{technician.Location || <span className="italic text-slate-400">No location</span>}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
        <div className="flex w-full items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 border-slate-200 bg-white text-xs hover:bg-slate-50"
            onClick={() => onView(technician.ID_Technician)}
          >
            <Eye className="h-3.5 w-3.5" />
            {t("view")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 border-red-200 bg-red-50 text-xs text-red-600 hover:bg-red-100"
            onClick={() => onDelete(technician.ID_Technician)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("delete")}
          </Button>
        </div>
      </div>
    </div>
  )
}
