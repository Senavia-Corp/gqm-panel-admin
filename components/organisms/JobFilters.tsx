"use client"

import { Filter, X, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { JobType, JobStatus } from "@/lib/types"

type YearOption = { label: string; value: string }

interface JobFiltersProps {
  title?: string
  count?: number

  year?: string
  yearOptions?: YearOption[]
  onYearChange?: (year: string) => void

  onAddNew?: () => void

  // Search — fully controlled by parent
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: () => void
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void

  onFilterClient?: (clientId: string) => void
  onFilterType?: (type: JobType | "all") => void
  onFilterStatus?: (status: JobStatus | "all") => void
  onFilterDate?: (date: string) => void
  onResetFilters?: () => void
}

const JOB_STATUSES: Array<{ label: string; value: JobStatus | "all" }> = [
  { label: "All Statuses",                   value: "all" },
  { label: "Assigned/P.Quote",               value: "Assigned/P. Quote" },
  { label: "Waiting for Approval",           value: "Waiting for Approval" },
  { label: "Schedule/Work in Progress",      value: "Scheduled / Work in Progress" },
  { label: "Cancelled",                      value: "Cancelled" },
  { label: "Completed P. INV/POs",           value: "Completed P. INV / POs" },
  { label: "Invoiced",                       value: "Invoiced" },
  { label: "HOLD",                           value: "HOLD" },
  { label: "PAID",                           value: "PAID" },
  { label: "Warranty",                       value: "Warranty" },
  { label: "Received-Stand By",             value: "Received-Stand By" },
  { label: "Assigned-In progress",           value: "Assigned-In progress" },
  { label: "Completed PVI",                  value: "Completed PVI" },
  { label: "Paid",                           value: "Paid" },
  { label: "In Progress",                    value: "In Progress" },
  { label: "Completed PVI / POs",            value: "Completed PVI / POs" },
  { label: "Archived",                       value: "Archived" },
]

export function JobFilters({
  title = "All Jobs",
  count = 0,

  year = "ALL",
  yearOptions = [{ value: "ALL", label: "All years" }],
  onYearChange,

  onAddNew,

  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  onSearchKeyDown,

  onFilterType,
  onFilterStatus,
  onResetFilters,
}: JobFiltersProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      {/* ── Title row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{title}</h2>

          {!!onYearChange && (
            <Select value={year} onValueChange={onYearChange}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <span className="rounded-full bg-gqm-yellow px-3 py-1 text-sm font-bold text-gqm-green-dark">
            {count}
          </span>

          <Button variant="ghost" size="icon">
            <Filter className="h-5 w-5" />
          </Button>
        </div>

        {onAddNew && (
          <Button onClick={onAddNew} className="bg-gqm-green-dark hover:bg-gqm-green">
            <Plus className="mr-2 h-4 w-4" />
            Add New Job
          </Button>
        )}
      </div>

      {/* ── Filter row ── */}
      <div className="flex gap-4">
        {/* Search input + button — inline, no <form> wrapper */}
        <div className="relative flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"          /* NOT type="search" — avoids browser native submit */
              placeholder="Search by name or ID…"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="pl-10"
            />
          </div>
          <Button
            onClick={onSearchSubmit}
            className="bg-gqm-green-dark hover:bg-gqm-green shrink-0"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>

        <Select onValueChange={(v) => onFilterStatus?.(v as JobStatus | "all")}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
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