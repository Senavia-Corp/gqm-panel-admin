"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Technician, TechnicianType } from "@/lib/types"
import { Search } from "lucide-react"

interface TechniciansTableProps {
  technicians: Technician[]
  onViewDetails: (technician: Technician) => void
}

export function TechniciansTable({ technicians, onViewDetails }: TechniciansTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<TechnicianType | "all">("all")

  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch =
      tech.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tech.Email_Address || tech.Email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.ID_Technician.toLowerCase().includes(searchTerm.toLowerCase())

    const techType = tech.Type_of_technician || tech.Type
    const matchesType = typeFilter === "all" || techType === typeFilter

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Technicians</h3>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search technicians..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TechnicianType | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Leader">Leader</SelectItem>
            <SelectItem value="Worker">Worker</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">ID</TableHead>
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4">Type</TableHead>
              <TableHead className="px-4">Email</TableHead>
              <TableHead className="px-4">Phone Number</TableHead>
              <TableHead className="px-4">Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTechnicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No technicians found for this subcontractor</p>
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
                      {technician.Type_of_technician || technician.Type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4">{technician.Email_Address || technician.Email}</TableCell>
                  <TableCell className="px-4 py-4">{technician.Phone_Number || technician.Phone_number}</TableCell>
                  <TableCell className="px-4 py-4">{technician.Location}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
