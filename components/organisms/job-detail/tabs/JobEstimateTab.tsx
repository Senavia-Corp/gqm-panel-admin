"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Building2, Home } from "lucide-react"
import { useTranslations } from "@/components/providers/LocaleProvider"
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
  isFetching?: boolean
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
  isFetching,
}: Props) {
  const t = useTranslations("jobEstimate.general")
  const [activeTab, setActiveTab] = useState<EstimateTab>("general")

  const bdfCount  = items.filter((i) => i.Cost_Type === "BDF").length
  const rentCount = items.filter((i) => i.Cost_Type === "Rent").length

  // H4 · Sólo QID tiene destino en Podio para los BD fees y los alquileres.
  // Metidos en un PTL o un PAR entraban en el precio de la app y no salían a
  // Podio: el precio se desviaba en silencio (medido: PTL +400, PAR +900). La
  // API ya los rechaza con 422; esto cierra la puerta antes de que el usuario
  // llegue a un error. Mismo patrón que `EstimateBreakdownTable`.
  const esQID = String(jobType ?? "").toUpperCase().startsWith("QID")
  const pestanasVisibles = useMemo<EstimateTab[]>(
    () => (esQID ? ["general", "bdf", "rent"] : ["general"]),
    [esQID],
  )

  // Si el tipo de job cambia y la pestaña activa deja de existir, se vuelve a
  // «general». Sin esto, el contenido se seguiría pintando sin su pestaña.
  useEffect(() => {
    if (!pestanasVisibles.includes(activeTab)) setActiveTab("general")
  }, [pestanasVisibles, activeTab])

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
            {t("tabGeneral")}
          </button>
          {pestanasVisibles.includes("bdf") && (
          <button
            onClick={() => setActiveTab("bdf")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === "bdf"
                ? "border-orange-500 text-orange-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            {t("tabBdf")}
            {bdfCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === "bdf" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
              }`}>
                {bdfCount}
              </span>
            )}
          </button>
          )}
          {pestanasVisibles.includes("rent") && (
          <button
            onClick={() => setActiveTab("rent")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === "rent"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            {t("tabRent")}
            {rentCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === "rent" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
              }`}>
                {rentCount}
              </span>
            )}
          </button>
          )}
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
          isFetching={isFetching}
        />
      ) : activeTab === "bdf" && esQID ? (
        <BDFManager
          jobId={jobId}
          jobYear={jobYear}
          items={items}
          onItemsChanged={onItemsChanged ?? onItemsImported}
          onViewDetails={onSelectItem}
        />
      ) : activeTab === "rent" && esQID ? (
        /* Ojo: antes esto era el `else` del ternario, así que ocultar la
           pestaña NO habría bastado — el RentManager se habría seguido
           pintando sin pestaña visible. Ahora es un caso explícito. */
        <RentManager
          jobId={jobId}
          jobYear={jobYear}
          items={items}
          onItemsChanged={onItemsChanged ?? onItemsImported}
          onViewDetails={onSelectItem}
        />
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
          onEditItem={onEditItem}
          jobYear={jobYear}
          jobType={jobType}
          isFetching={isFetching}
        />
      )}
    </div>
  )
}
