"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Technician, TechnicianType } from "@/lib/types"
import { Search } from "lucide-react"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface TechniciansTableProps {
  technicians: Technician[]
  onViewDetails: (technician: Technician) => void
  onLinkClick?: () => void
  onUnlinkClick?: (technicianId: string) => void
}

export function TechniciansTable({ technicians, onViewDetails, onLinkClick, onUnlinkClick }: TechniciansTableProps) {
  const t = useTranslations("subcontractors")
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<TechnicianType | "all">("all")

  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch =
      (tech.Name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tech.Email_Address || tech.Email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.ID_Technician.toLowerCase().includes(searchTerm.toLowerCase())

    const techType = tech.Type_of_technician || tech.Type
    const matchesType = typeFilter === "all" || techType === typeFilter

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{t("tabTechnicians")}</h3>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="flex items-center gap-2 h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm px-3 sm:px-4 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <span className="hidden sm:inline">Link Technician</span>
            <span className="sm:hidden ml-1.5">Link Tech</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchTechs")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TechnicianType | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            <SelectItem value="Leader">{t("leader")}</SelectItem>
            <SelectItem value="Worker">{t("worker")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">{t("id")}</TableHead>
              <TableHead className="px-4">{t("name")}</TableHead>
              <TableHead className="px-4">{t("type")}</TableHead>
              <TableHead className="px-4">{t("email")}</TableHead>
              <TableHead className="px-4">{t("phoneNumber")}</TableHead>
              <TableHead className="px-4">{t("location")}</TableHead>
              {onUnlinkClick && <TableHead className="px-4 w-16"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTechnicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">{t("noTechsFound")}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTechnicians.map((technician) => (
                <TableRow
                  key={technician.ID_Technician}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewDetails(technician)}
                >
                  <TableCell className="px-6 py-4 font-mono text-sm">{technician.ID_Technician}</TableCell>
                  <TableCell className="px-4 py-4 font-medium">{technician.Name}</TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge
                      className={
                        (technician.Type_of_technician || technician.Type) === "Leader"
                          ? "bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80"
                          : "bg-blue-500 hover:bg-blue-600"
                      }
                    >
                      {t((technician.Type_of_technician || technician.Type || "worker").toLowerCase())}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4">{technician.Email_Address || technician.Email}</TableCell>
                  <TableCell className="px-4 py-4">{technician.Phone_Number || technician.Phone_number}</TableCell>
                  <TableCell className="px-4 py-4">{technician.Location}</TableCell>
                  {onUnlinkClick && (
                    <TableCell className="px-4 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnlinkClick(technician.ID_Technician)
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Unlink
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
