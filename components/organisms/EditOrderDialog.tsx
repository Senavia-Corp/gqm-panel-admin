"use client"

import { useMemo, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X, Briefcase, Building2, CheckSquare, Loader2, PackageOpen, Search, XCircle, Zap, ZapOff, DollarSign, Tag, Check
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { EstimateItem, Subcontractor } from "@/lib/types"
import { toast } from "sonner"

// ─── Constants ────────────────────────────────────────────────────────────────
const FIELD_BASE = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
const FIELD_ERR  = "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200"

const getItemId = (i: any) => String(i?.ID_EstimateItem || i?.ID_EstimateCost || i?.ID_Estimate_Cost || i?.id || i?.ID || Math.random())

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400">*</span>}
    </label>
  )
}
function FG({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

function PodioToggle({ value, onChange, jobYear, disabled, textPrefix }: {
  value: boolean; onChange: (v: boolean) => void
  jobYear?: number; disabled?: boolean; textPrefix?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
        value
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {value
        ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500 flex-shrink-0" />
        : <ZapOff className="h-4 w-4 flex-shrink-0" />
      }
      <div className="flex-1 text-left">
        <span className="text-xs font-semibold">{textPrefix || "Sync to Podio"} {value ? "ON" : "OFF"}</span>
        {value && jobYear && (
          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            {jobYear}
          </span>
        )}
        {value && !jobYear && (
          <span className="ml-2 text-[10px] text-red-500">Year no resuelto</span>
        )}
      </div>
    </button>
  )
}

interface EditOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any // the initial order
  items: EstimateItem[]
  subcontractors: Subcontractor[]
  defaultSyncPodio: boolean
  jobYearForPodioSync?: number
  onEditOrder: (orderId: string, orderName: string, selectedItems: string[], syncPodio: boolean) => Promise<void>
}

export function EditOrderDialog({
  open,
  onOpenChange,
  order,
  items,
  subcontractors,
  defaultSyncPodio,
  jobYearForPodioSync,
  onEditOrder,
}: EditOrderDialogProps) {
  const [orderName, setOrderName] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [itemsQuery, setItemsQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [syncPodioLocal, setSyncPodioLocal] = useState(defaultSyncPodio)
  const [errors, setErrors] = useState<{ orderName?: string }>({})

  // Initialize
  useEffect(() => {
    if (open && order) {
      setOrderName(order.Title || "")
      setSyncPodioLocal(defaultSyncPodio)
      const orderItems = order.Items || []
      const orderItemIds = orderItems.map(getItemId)
      setSelectedItems(orderItemIds.filter((id: string) => id && !id.startsWith("0."))) // avoid Math.random entries
      setItemsQuery("")
      setErrors({})
    }
  }, [open, order, defaultSyncPodio])

  // Available are only those that don't belong to ANOTHER order
  const availableItems = useMemo(() => {
    return items.filter((i) => !i.ID_Order || i.ID_Order === order?.ID_Order)
  }, [items, order?.ID_Order])

  const filteredAvailableItems = useMemo(() => {
    const q = itemsQuery.trim().toLowerCase()
    if (!q) return availableItems
    return availableItems.filter((i) => {
      const anyI = i as any
      const title = i.Title || ""
      const code = i.Cost_Code || anyI.Cost_code || ""
      const group = i.Parent_Group || anyI.Parent_group || ""
      return (
        title.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        group.toLowerCase().includes(q)
      )
    })
  }, [availableItems, itemsQuery])

  const formulaData = useMemo(() => {
    const selected = availableItems.filter((i) => selectedItems.includes(getItemId(i)))
    const newFormula = selected.reduce((sum, item) => sum + (item.Builder_Cost ?? (item as any).Builder_cost ?? 0), 0)
    
    // Sum of change orders attached to this order
    const changeOrders = order?.change_orders ?? order?.changeOrders ?? []
    const sumChangeOrders = changeOrders.reduce((sum: number, co: any) => sum + Number(co.ChangeOrderFormula || 0), 0)
    
    const newAdjFormula = newFormula + sumChangeOrders

    return {
      currentFormula: order?.Formula ?? order?.formula ?? 0,
      currentAdjFormula: order?.Adj_formula ?? order?.adj_formula ?? 0,
      newFormula,
      newAdjFormula
    }
  }, [availableItems, selectedItems, order])

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const selectAllVisible = () => {
    const ids = filteredAvailableItems.map(getItemId)
    setSelectedItems((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const clearSelection = () => setSelectedItems([])

  const handleSubmit = async () => {
    if (!orderName.trim()) {
      setErrors({ orderName: "Required" })
      return
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one estimate item for the order")
      return
    }

    setIsSubmitting(true)
    try {
      await onEditOrder(order.ID_Order, orderName.trim(), selectedItems, syncPodioLocal)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedSubcLabel = useMemo(() => {
    if (!order) return "—"
    const sub = order.subcontractor || subcontractors.find((s) => s.ID_Subcontractor === order.ID_Subcontractor)
    if (!sub) return order.ID_Subcontractor || "—"
    
    const name = sub.Name || "Unknown"
    let org = sub.Organization || ""
    if (org && org.startsWith("{") && org.endsWith("}")) {
      org = org.replace(/^\{"|"\}/g, '').replace(/^\{|\}$/g, '').replace(/\\"/g, '"')
    }
    
    return `${name}${org ? ` • ${org}` : ""}`
  }, [order, subcontractors])

  if (!open || !order) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onOpenChange(false) }}
    >
      <div
        className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ height: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pt-5 pb-4 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <PackageOpen className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Order</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Order ID: <span className="font-mono">{order.ID_Order}</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body (Two Column Layout) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left panel */}
          <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-100 bg-white px-6 py-5 flex flex-col gap-6 overflow-y-auto">
            <FG>
              <FL required>Order Name</FL>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={orderName}
                  onChange={(e) => {
                    setOrderName(e.target.value)
                    setErrors({})
                  }}
                  placeholder="e.g., Interior Finishing Package"
                  className={`${FIELD_BASE} pl-9 ${errors.orderName ? FIELD_ERR : ""}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.orderName && <p className="text-[11px] text-red-500">{errors.orderName}</p>}
            </FG>

            <FG>
              <FL>Assigned Subcontractor</FL>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={selectedSubcLabel}
                  disabled
                  className={`${FIELD_BASE} pl-9 bg-slate-100 text-slate-500 cursor-not-allowed`}
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Subcontractor Cannot Be Changed During Editing.
              </p>
            </FG>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex flex-col">
                  Cost Summary
                  <span className="text-[10px] font-normal normal-case text-slate-400 mt-0.5">Preview calculations</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Formula (Current)</span>
                  <span className="text-sm font-semibold text-slate-400">${formulaData.currentFormula.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-800">New Formula</span>
                    <span className="text-sm font-black text-amber-700">${formulaData.newFormula.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-amber-600/70">Sum of selected builder costs</span>
                </div>
                
                <div className="h-px bg-slate-200 my-1" />

                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Adj. Formula (Current)</span>
                  <span className="text-sm font-semibold text-slate-400">${formulaData.currentAdjFormula.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-1 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800">New Adj. Formula</span>
                    <span className="text-sm font-black text-emerald-700">${formulaData.newAdjFormula.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600/70">New formula + change orders</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-auto pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Podio Integration</p>
              <PodioToggle 
                value={syncPodioLocal} 
                onChange={setSyncPodioLocal} 
                jobYear={jobYearForPodioSync} 
                disabled={isSubmitting} 
                textPrefix="Sync changes to Podio" 
              />
            </div>
          </div>

          {/* Right panel (Items Selection) */}
          <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Assign Estimate Costs</h3>
                <p className="text-xs text-slate-500">{selectedItems.length} of {availableItems.length} selected</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={itemsQuery}
                    onChange={(e) => setItemsQuery(e.target.value)}
                    placeholder="Search cost code..."
                    className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  disabled={isSubmitting || filteredAvailableItems.length === 0}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  title="Select Visible"
                >
                  <CheckSquare className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isSubmitting || selectedItems.length === 0}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  title="Clear Selection"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-h-full">
              {filteredAvailableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                  <PackageOpen className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">No estimate costs available</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredAvailableItems.map((item) => {
                    const itemId = getItemId(item)
                    const checked = selectedItems.includes(itemId)
                    
                    const anyItem = item as any
                    const builderCost = item.Builder_Cost ?? anyItem.Builder_cost ?? 0
                    const clientPrice = item.Client_Price ?? anyItem.Client_price ?? 0
                    const code = item.Cost_Code ?? anyItem.Cost_code ?? "—"
                    const group = item.Parent_Group ?? anyItem.Parent_group ?? ""

                    return (
                      <label
                        key={itemId}
                        className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer ${
                          checked 
                            ? "border-blue-200 bg-blue-50/50 shadow-sm" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <Checkbox
                          id={itemId}
                          checked={checked}
                          onCheckedChange={() => toggleItem(itemId)}
                          disabled={isSubmitting}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-800 truncate transition-colors">
                              {item.Title}
                            </span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-slate-700">${(builderCost).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                              {code}
                            </span>
                            {group && (
                              <span className="flex items-center gap-1">
                                <PackageOpen className="h-3 w-3" />
                                {group}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Client: ${(clientPrice).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex-shrink-0">
          <button 
            type="button" 
            onClick={() => !isSubmitting && onOpenChange(false)} 
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSubmitting 
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> 
              : <><Check className="h-4 w-4" /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
