"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'

export interface Cost {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  type: "Labor" | "Materials" | "Permits" | "Equipment" | "Other"
}

interface CostBreakdownTableProps {
  costs: Cost[]
  onEdit: (cost: Cost) => void
  onDelete: (id: string) => void
  onAddNew: () => void
}

export function CostBreakdownTable({ costs, onEdit, onDelete, onAddNew }: CostBreakdownTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [minValue, setMinValue] = useState("")
  const [maxValue, setMaxValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Apply filters
  const filteredCosts = costs.filter((cost) => {
    const matchesSearch = cost.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || cost.type === typeFilter
    const matchesMinValue = !minValue || cost.total >= Number(minValue)
    const matchesMaxValue = !maxValue || cost.total <= Number(maxValue)
    return matchesSearch && matchesType && matchesMinValue && matchesMaxValue
  })

  // Pagination
  const totalPages = Math.ceil(filteredCosts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCosts = filteredCosts.slice(startIndex, startIndex + itemsPerPage)

  const resetFilters = () => {
    setSearchTerm("")
    setTypeFilter("all")
    setMinValue("")
    setMaxValue("")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search costs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Cost Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Labor">Labor</SelectItem>
            <SelectItem value="Materials">Materials</SelectItem>
            <SelectItem value="Permits">Permits</SelectItem>
            <SelectItem value="Equipment">Equipment</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min $"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            className="w-24"
          />
          <span className="text-gray-500">-</span>
          <Input
            type="number"
            placeholder="Max $"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            className="w-24"
          />
        </div>

        <Button variant="outline" onClick={resetFilters}>
          Reset
        </Button>

        <Button onClick={onAddNew} className="bg-gqm-green hover:bg-gqm-green/90">
          Add New Cost
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Item</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Quantity</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Total</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Type</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedCosts.map((cost) => (
              <tr key={cost.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{cost.name}</td>
                <td className="px-4 py-4 text-sm">{cost.quantity}</td>
                <td className="px-4 py-4 text-sm">${cost.unitPrice.toLocaleString()}</td>
                <td className="px-4 py-4 text-sm font-semibold">${cost.total.toLocaleString()}</td>
                <td className="px-4 py-4 text-sm">
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                    {cost.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(cost)}
                      className="h-9 w-9 rounded-md bg-gqm-yellow hover:bg-gqm-yellow/90"
                      title="Edit cost"
                    >
                      <Pencil className="h-4 w-4 text-black" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(cost.id)}
                      className="h-9 w-9 rounded-md bg-red-600 text-white hover:bg-red-700"
                      title="Delete cost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCosts.length)} of{" "}
            {filteredCosts.length} costs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
