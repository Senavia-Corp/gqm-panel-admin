"use client"

import { Filter, X, Plus } from "lucide-react"
import { SearchBar } from "@/components/molecules/SearchBar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SubcontractorStatus, ComplianceStatus } from "@/lib/types"

interface SubcontractorFiltersProps {
  totalCount: number
  onAddNew?: () => void
  onSearch?: (value: string) => void
  onFilterStatus?: (status: SubcontractorStatus | "all") => void
  onFilterCompliance?: (compliance: ComplianceStatus | "all") => void
  onFilterTraining?: (training: ComplianceStatus | "all") => void
  onFilterScore?: (range: string) => void
  onResetFilters?: () => void
}

export function SubcontractorFilters({
  totalCount,
  onAddNew,
  onSearch,
  onFilterStatus,
  onFilterCompliance,
  onFilterTraining,
  onFilterScore,
  onResetFilters,
}: SubcontractorFiltersProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">All Subcontractors</h2>
          <span className="rounded-full bg-gqm-yellow px-3 py-1 text-sm font-bold text-gqm-green-dark">
            {totalCount}
          </span>
          <Button variant="ghost" size="icon">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
        <Button onClick={onAddNew} className="bg-gqm-green-dark hover:bg-gqm-green">
          <Plus className="mr-2 h-4 w-4" />
          Add New Subcontractor
        </Button>
      </div>

      <div className="flex gap-4">
        <SearchBar placeholder="Search subcontractors..." onChange={onSearch} className="flex-1" />

        <Select onValueChange={onFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onFilterCompliance}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="GQM Compliance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Compliance</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onFilterTraining}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Best Service Training" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Training</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onFilterScore}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Score Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="1-50">1-50</SelectItem>
            <SelectItem value="51-100">51-100</SelectItem>
            <SelectItem value="101-150">101-150</SelectItem>
            <SelectItem value="151-200">151-200</SelectItem>
            <SelectItem value="201-250">201-250</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onResetFilters}>
          <X className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      </div>
    </div>
  )
}
