"use client"

import { Eye, Trash2, Mail, Phone, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Technician } from "@/lib/types"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface TechnicianCardProps {
  technician: Technician
  onView: (id: string) => void
  onDelete: (id: string) => void
}

export function TechnicianCard({ technician, onView, onDelete }: TechnicianCardProps) {
  const t = useTranslations("subcontractors")
  return (
    <Card className="group relative overflow-hidden p-6 transition-shadow hover:shadow-lg">
      <div className="flex flex-col items-center space-y-4">
        {/* Profile Photo */}
        <Avatar className="h-24 w-24">
          <AvatarImage src={technician.Avatar || "/placeholder.svg"} alt={technician.Name} />
          <AvatarFallback className="bg-gqm-yellow text-gqm-green-dark text-xl font-semibold">
            {technician.Name.split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        {/* Name and ID */}
        <div className="text-center">
          <h3 className="font-semibold text-lg">{technician.Name}</h3>
          <p className="text-sm text-muted-foreground">{technician.ID_Technician}</p>
        </div>

        {/* Type Badge */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            technician.Type === "Leader" ? "bg-yellow-500 text-white" : "bg-blue-500 text-white"
          }`}
        >
          {t((technician.Type || "worker").toLowerCase())}
        </span>

        {/* Contact Information */}
        <div className="w-full space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{technician.Email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{technician.Phone_number}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{technician.Location}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent"
            onClick={() => onView(technician.ID_Technician)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {t("view")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-red-50 hover:text-red-600 bg-transparent"
            onClick={() => onDelete(technician.ID_Technician)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("delete")}
          </Button>
        </div>
      </div>
    </Card>
  )
}
