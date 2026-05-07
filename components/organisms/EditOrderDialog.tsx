"use client"

import { useMemo, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X, Briefcase, Building2, CheckSquare, Loader2, PackageOpen, Search, XCircle, Zap, ZapOff, DollarSign, Tag, Check, FileText
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EstimateItem, Subcontractor, FinancialDocument } from "@/lib/types"
import { toast } from "sonner"
import { useTranslations } from "@/components/providers/LocaleProvider"

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

function PodioToggle({ value, onChange, jobYear, disabled, textPrefix, yearNotAvailableLabel }: {
  value: boolean; onChange: (v: boolean) => void
  jobYear?: number; disabled?: boolean; textPrefix?: string; yearNotAvailableLabel?: string
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
          <span className="ml-2 text-[10px] text-red-500">{yearNotAvailableLabel ?? "Year not available"}</span>
        )}
      </div>
    </button>
  )
}

interface EditOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any
  items: EstimateItem[]
  subcontractors: Subcontractor[]
  bills?: FinancialDocument[]
  defaultSyncPodio: boolean
  jobYearForPodioSync?: number
  onEditOrder: (orderId: string, orderName: string, selectedItems: string[], syncPodio: boolean, subcontractorId: string, billId?: string) => Promise<void>
}

export function EditOrderDialog({
  open,
  onOpenChange,
  order,
  items,
  subcontractors,
  bills = [],
  defaultSyncPodio,
  jobYearForPodioSync,
  onEditOrder,
}: EditOrderDialogProps) {
  const t = useTranslations("jobs")
  const [orderName, setOrderName] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState("")
  const [selectedBillId, setSelectedBillId] = useState("")
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
      setSelectedItems(orderItemIds.filter((id: string) => id && !id.startsWith("0.")))
      setSelectedSubcontractorId(order.ID_Subcontractor || order.subcontractor?.ID_Subcontractor || "")
      const currentBill = order.financial_docs?.[0]?.ID_FinancialDoc ?? ""
      setSelectedBillId(currentBill || "none")
      setItemsQuery("")
      setErrors({})
    }
  }, [open, order, defaultSyncPodio])

  // Available are only those that don't belong to ANOTHER order
  const availableItems = useMemo(() => {
    return items.filter((i) => !i.ID_Order || i.ID_Order === order?.ID_Order)
  }, [items, order?.ID_Order])

  // Bills: unlinked or already linked to this order
  const availableBills = useMemo(() => {
    return bills.filter(b =>
      b.Type_of_document?.toLowerCase() === "bill" &&
      (!b.ID_Order || b.ID_Order === order?.ID_Order)
    )
  }, [bills, order?.ID_Order])

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
      toast.error(t("orderSelectItemError"))
      return
    }

    setIsSubmitting(true)
    try {
      await onEditOrder(
        order.ID_Order,
        orderName.trim(),
        selectedItems,
        syncPodioLocal,
        selectedSubcontractorId || order.ID_Subcontractor,
        selectedBillId && selectedBillId !== "none" ? selectedBillId : undefined,
      )
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <div className="flex items-center justify-between border-b border-slate-100 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <PackageOpen className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("orderEditTitle")}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{t("orderEditIdPrefix")} <span className="font-mono">{order.ID_Order}</span></p>
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
          <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-4 sm:gap-6 overflow-y-auto shrink-0 max-h-[42%] lg:max-h-none lg:shrink">
            <FG>
              <FL required>{t("orderNameLabel")}</FL>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={orderName}
                  onChange={(e) => {
                    setOrderName(e.target.value)
                    setErrors({})
                  }}
                  placeholder={t("orderNamePlaceholder")}
                  className={`${FIELD_BASE} pl-9 ${errors.orderName ? FIELD_ERR : ""}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.orderName && <p className="text-[11px] text-red-500">{t("orderNameRequired")}</p>}
            </FG>

            <FG>
              <FL>{t("orderAssignedSubLabel")}</FL>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                <Select
                  value={selectedSubcontractorId}
                  onValueChange={setSelectedSubcontractorId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={`${FIELD_BASE} pl-9 h-auto`}>
                    <SelectValue placeholder="Select subcontractor" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] z-[10000]">
                    {subcontractors.map((sub) => {
                      let org = sub.Organization || ""
                      if (org && org.startsWith("{") && org.endsWith("}")) {
                        org = org.replace(/^\{"|"\}/g, "").replace(/^\{|\}$/g, "").replace(/\\"/g, '"')
                      }
                      return (
                        <SelectItem key={sub.ID_Subcontractor} value={sub.ID_Subcontractor}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-slate-800">{sub.Name || "Unknown"}</span>
                            {org ? <span className="text-[10px] text-slate-500">{org}</span> : null}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </FG>

            <FG>
              <FL>{t("orderLinkedBillLabel")}</FL>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                <Select value={selectedBillId} onValueChange={setSelectedBillId} disabled={isSubmitting}>
                  <SelectTrigger className={`${FIELD_BASE} pl-9 h-auto`}>
                    <SelectValue placeholder={t("orderSelectBill")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] z-[10000]">
                    <SelectItem value="none">{t("orderNoBillLinked")}</SelectItem>
                    {availableBills.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-400">
                        {t("orderNoBillsFound")}
                      </div>
                    ) : (
                      availableBills.map((bill) => (
                        <SelectItem key={bill.ID_FinancialDoc} value={bill.ID_FinancialDoc}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-slate-800">
                              {bill.Job_Ref_QBO ? `${bill.Job_Ref_QBO} - ` : ""}
                              ${bill.Total_Amount?.toFixed(2) || "0.00"}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {bill.Vendor_Customer || "Unknown Vendor"}{bill.Due_Date ? ` • Due: ${bill.Due_Date}` : ""}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{t("orderBillsFilterHint")}</p>
            </FG>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex flex-col">
                  {t("orderCostSummaryTitle")}
                  <span className="text-[10px] font-normal normal-case text-slate-400 mt-0.5">{t("orderCostSummaryHint")}</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{t("orderFormulaCurrent")}</span>
                  <span className="text-sm font-semibold text-slate-400">${formulaData.currentFormula.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-800">{t("orderNewFormula")}</span>
                    <span className="text-sm font-black text-amber-700">${formulaData.newFormula.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-amber-600/70">{t("orderNewFormulaHint")}</span>
                </div>

                <div className="h-px bg-slate-200 my-1" />

                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{t("orderAdjFormulaCurrent")}</span>
                  <span className="text-sm font-semibold text-slate-400">${formulaData.currentAdjFormula.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-1 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800">{t("orderNewAdjFormula")}</span>
                    <span className="text-sm font-black text-emerald-700">${formulaData.newAdjFormula.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600/70">{t("orderNewAdjFormulaHint")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-auto pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("orderPodioIntegration")}</p>
              <PodioToggle
                value={syncPodioLocal}
                onChange={setSyncPodioLocal}
                jobYear={jobYearForPodioSync}
                disabled={isSubmitting}
                textPrefix={t("orderSyncChangesToPodio")}
                yearNotAvailableLabel={t("orderPodioYearUnavailable")}
              />
            </div>
          </div>

          {/* Right panel (Items Selection) */}
          <div className="flex-1 min-h-0 flex flex-col bg-slate-50/30 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{t("orderAssignCosts")}</h3>
                <p className="text-xs text-slate-500">{selectedItems.length} {t("orderSelectedOf")} {availableItems.length} {t("orderSelectedLabel")}</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={itemsQuery}
                    onChange={(e) => setItemsQuery(e.target.value)}
                    placeholder={t("orderSearchCostCode")}
                    className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  disabled={isSubmitting || filteredAvailableItems.length === 0}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  title={t("orderSelectVisible")}
                >
                  <CheckSquare className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isSubmitting || selectedItems.length === 0}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  title={t("orderClearSelection")}
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-h-full">
              {filteredAvailableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                  <PackageOpen className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">{t("orderNoEstimateCosts")}</p>
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
                              {t("orderClientPrefix")} ${(clientPrice).toFixed(2)}
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
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0">
          <button 
            type="button" 
            onClick={() => !isSubmitting && onOpenChange(false)} 
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {t("orderCancelBtn")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("orderSaving")}</>
              : <><Check className="h-4 w-4" /> {t("orderSaveChanges")}</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
