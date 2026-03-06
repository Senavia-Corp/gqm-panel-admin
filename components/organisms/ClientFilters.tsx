"use client"

import { useState } from "react"
import { Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ClientFiltersProps {
  onAddNew: () => void
  onSearch: (value: string) => void
  onFilterStatus: (status: string) => void
  onFilterRisk: (risk: string) => void
  onFilterService: (service: string) => void
  onResetFilters: () => void
}

export function ClientFilters({
  onAddNew,
  onSearch,
  onFilterStatus,
  onFilterRisk,
  onFilterService,
  onResetFilters,
}: ClientFiltersProps) {
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    onSearch(value)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    onFilterStatus(value)
  }

  const handleRiskChange = (value: string) => {
    setRiskFilter(value)
    onFilterRisk(value)
  }

  const handleServiceChange = (value: string) => {
    setServiceFilter(value)
    onFilterService(value)
  }

  const handleResetFilters = () => {
    setSearchValue("")
    setStatusFilter("all")
    setRiskFilter("all")
    setServiceFilter("all")
    onResetFilters()
    setIsFilterOpen(false)
  }

  const hasActiveFilters = statusFilter !== "all" || riskFilter !== "all" || serviceFilter !== "all"

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">All Clients</h2>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">10</span>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Filter className="h-5 w-5" />
                {hasActiveFilters && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gqm-green" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Filters</h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsFilterOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Client Status</label>
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Risk Value</label>
                    <Select value={riskFilter} onValueChange={handleRiskChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All risk levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Risk Levels</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Service Interested In</label>
                    <Select value={serviceFilter} onValueChange={handleServiceChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        <SelectItem value="Rehabs">Rehabs</SelectItem>
                        <SelectItem value="Work Orders">Work Orders</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" className="w-full bg-transparent" onClick={handleResetFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={onAddNew} className="bg-gqm-green hover:bg-gqm-green/90">
          + Add New Client
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search clients..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
}
