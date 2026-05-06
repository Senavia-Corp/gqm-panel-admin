"use client"

import { useState } from "react"
import { BarChart3, Building2, Home } from "lucide-react"
import { EstimateBreakdownTable } from "@/components/organisms/EstimateBreakdownTable"
import { EstimateItemDetails } from "@/components/organisms/EstimateItemDetails"
import { BDFManager } from "@/components/organisms/BDFManager"
import { RentManager } from "@/components/organisms/RentManager"
import type { EstimateItem } from "@/lib/types"

type EstimateTab = "general" | "bdf" | "rent"

type Props = {
  jobId: string
  items: EstimateItem[]
  selectedItem: EstimateItem | null
  onSelectItem: (item: EstimateItem | null) => void

  hasSavedEstimates: boolean
  onItemsImported: (items: EstimateItem[]) => void
  onCreateOrder: () => void
  onSaveEstimates: () => Promise<void>
  onDeleteAllEstimates: () => Promise<void>
  onCancelImport: () => void
  onDeleteItem: (item: EstimateItem) => Promise<void>
  onEditItem: (item: EstimateItem) => void
  onItemsChanged?: (items: EstimateItem[]) => void
  jobYear?: number
  jobType?: string
}

export function JobEstimateTab({
  jobId,
  items,
  selectedItem,
  onSelectItem,
  hasSavedEstimates,
  onItemsImported,
  onCreateOrder,
  onSaveEstimates,
  onDeleteAllEstimates,
  onCancelImport,
  onDeleteItem,
  onEditItem,
  onItemsChanged,
  jobYear,
  jobType,
}: Props) {
  const [activeTab, setActiveTab] = useState<EstimateTab>("general")

  const bdfCount  = items.filter((i) => i.Cost_Type === "BDF").length
  const rentCount = items.filter((i) => i.Cost_Type === "Rent").length

  return (
    <div className="space-y-4">
      {/* ── Sub-tab bar ────────────────────────────────────────────────── */}
      {!selectedItem && (
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === "general"
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            General
          </button>
          <button
            onClick={() => setActiveTab("bdf")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === "bdf"
                ? "border-orange-500 text-orange-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            BDF Manager
            {bdfCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === "bdf" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
              }`}>
                {bdfCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("rent")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === "rent"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            Rent Manager
            {rentCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === "rent" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
              }`}>
                {rentCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Tab content ────────────────────────────────────────────────── */}
      {selectedItem ? (
        <EstimateItemDetails
          item={selectedItem}
          onBack={() => onSelectItem(null)}
          onEdit={() => onEditItem(selectedItem)}
        />
      ) : activeTab === "general" ? (
        <EstimateBreakdownTable
          items={items}
          onViewDetails={onSelectItem}
          onCreateOrder={onCreateOrder}
          onItemsImported={onItemsImported}
          jobId={jobId}
          hasSavedEstimates={hasSavedEstimates}
          onSaveEstimates={onSaveEstimates}
          onDeleteAllEstimates={onDeleteAllEstimates}
          onCancelImport={onCancelImport}
          onDeleteItem={onDeleteItem}
          onEditItem={onEditItem}
          jobYear={jobYear}
          jobType={jobType}
        />
      ) : activeTab === "bdf" ? (
        <BDFManager
          jobId={jobId}
          jobYear={jobYear}
          items={items}
          onItemsChanged={onItemsChanged ?? onItemsImported}
          onViewDetails={onSelectItem}
        />
      ) : (
        <RentManager
          jobId={jobId}
          jobYear={jobYear}
          items={items}
          onItemsChanged={onItemsChanged ?? onItemsImported}
          onViewDetails={onSelectItem}
        />
      )}
    </div>
  )
}
