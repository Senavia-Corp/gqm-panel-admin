"use client"

import { EstimateBreakdownTable } from "@/components/organisms/EstimateBreakdownTable"
import { EstimateItemDetails } from "@/components/organisms/EstimateItemDetails"
import type { EstimateItem } from "@/lib/types"

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
  jobYear?: number
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
  jobYear,
}: Props) {
  return (
    <div className="space-y-4">
      {selectedItem ? (
        <EstimateItemDetails item={selectedItem} onBack={() => onSelectItem(null)} />
      ) : (
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
          jobYear={jobYear}
        />
      )}
    </div>
  )
}
