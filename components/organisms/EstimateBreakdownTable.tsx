"use client"

import React, { useState, useEffect } from "react"
import type { EstimateItem } from "@/lib/types"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { CreateEstimateItemDialog } from "@/components/organisms/CreateEstimateItemDialog"
import {
  FileUp, Plus, Save, X, Trash2, Eye, Search,
  ChevronDown, ChevronRight, FilePlus2, AlertTriangle,
  DollarSign, TrendingUp, BarChart3, Package, RefreshCcw,
} from "lucide-react"

interface EstimateBreakdownTableProps {
  items: EstimateItem[]
  onViewDetails: (item: EstimateItem) => void
  onCreateOrder: () => void
  onItemsImported: (items: EstimateItem[]) => void
  jobId: string
  hasSavedEstimates: boolean
  onSaveEstimates: () => Promise<void>
  onDeleteAllEstimates: () => Promise<void>
  onCancelImport: () => void
  onDeleteItem?: (item: EstimateItem) => Promise<void>
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: "blue" | "emerald" | "amber"
}) {
  const map = {
    blue:    "border-blue-100 bg-blue-50",
    emerald: "border-emerald-100 bg-emerald-50",
    amber:   "border-amber-100 bg-amber-50",
  }
  const txt = {
    blue:    "text-blue-600",
    emerald: "text-emerald-600",
    amber:   "text-amber-600",
  }
  return (
    <div className={`rounded-xl border p-4 ${map[color]}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${txt[color]}`}>{label}</p>
      <p className={`mt-1 text-2xl font-black ${txt[color].replace("600","800")}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-[11px] ${txt[color]}`}>{sub}</p>}
    </div>
  )
}

function ConfirmDialog({ open, onClose, title, description, onConfirm, loading, confirmLabel = "Delete" }: {
  open: boolean; onClose: () => void; title: string; description: string
  onConfirm: () => void; loading: boolean; confirmLabel?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">{description}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
            {loading ? <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Deleting…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EstimateBreakdownTable({
  items, onViewDetails, onCreateOrder, onItemsImported, jobId,
  hasSavedEstimates, onSaveEstimates, onDeleteAllEstimates, onCancelImport, onDeleteItem,
}: EstimateBreakdownTableProps) {
  const [search, setSearch]             = useState("")
  const [expandedGroups, setExpanded]   = useState<Set<string>>(new Set())
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EstimateItem | null>(null)
  const [isSaving, setIsSaving]         = useState(false)
  const [isDeleting, setIsDeleting]     = useState(false)
  const [isDeletingOne, setDeletingOne] = useState(false)
  const [hasUnsaved, setHasUnsaved]     = useState(false)
  const [createOpen, setCreateOpen]     = useState(false)
  const safeItems = items ?? []

  useEffect(() => {
    const groups = [...new Set(safeItems.map((i) => i.Parent_Group || "Ungrouped"))]
    setExpanded(new Set(groups))
  }, [safeItems])

  const toggleGroup = (g: string) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(g) ? s.delete(g) : s.add(g); return s })

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error("Please upload an Excel file (.xls or .xlsx)")
      e.target.value = ""; return
    }
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: "array" })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      if (!ws) { toast.error("Excel file has no sheets"); e.target.value = ""; return }
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: true })
      if (!rows.length) { toast.error("Excel file is empty"); e.target.value = ""; return }

      const num = (v: any, fb = 0) => {
        if (typeof v === "number") return isFinite(v) ? v : fb
        const n = parseFloat(String(v ?? "").replace(/[%$,]/g, ""))
        return isFinite(n) ? n : fb
      }
      const str = (v: any) => String(v ?? "").trim()

      const parsed: EstimateItem[] = rows
        .filter((r) => str(r["Title"]) || str(r["Cost Code"]))
        .map((r, i) => {
          const bc = num(r["Builder Cost"])
          const cp = num(r["Client Price"])
          return {
            ID_EstimateItem: `TEMP${Date.now()}_${i}`,
            ID_Jobs: jobId,
            Category: str(r["Category"]),
            Cost_Code: str(r["Cost Code"]),
            Title: str(r["Title"]),
            Parent_Group: str(r["Parent Group"]),
            Parent_Group_Description: str(r["Parent Group Description"]),
            Subgroup: str(r["Subgroup"]),
            Subgroup_Description: str(r["Subgroup Description"]),
            Option_Type: str(r["Option Type"]),
            Line_Item_Type: str(r["Line Item Type"]),
            Description: str(r["Description"]),
            Quantity: num(r["Quantity"], 1),
            Unit: str(r["Unit"]),
            Unit_Cost: num(r["Unit Cost"]),
            Cost_Type: (str(r["Cost Type"]) as any) || "Subcontractor",
            Marked_As: str(r["Marked As"]),
            Builder_Cost: bc,
            Markup: num(r["Markup"]),
            Markup_Type: (str(r["Markup Type"]) as any) || "",
            Unit_Price: num(r["Unit Price"]),
            Client_Price: cp,
            Margin: num(r["Margin"]),
            Profit: r["Profit"] !== "" ? num(r["Profit"], cp - bc) : cp - bc,
            Percent_Invoiced: num(r["% Invoiced"]),
            Internal_Notes: str(r["Internal Notes"]),
            ID_Order: null,
          }
        })

      onItemsImported(parsed)
      setHasUnsaved(true)
      toast.success(`Imported ${parsed.length} items from Excel`)
    } catch (err) {
      toast.error("Error parsing Excel file")
    } finally { e.target.value = "" }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try { await onSaveEstimates(); setHasUnsaved(false) }
    catch { toast.error("Failed to save estimates") }
    finally { setIsSaving(false) }
  }

  const handleCancel = () => { onCancelImport(); setHasUnsaved(false) }

  const handleDeleteAll = async () => {
    setIsDeleting(true)
    try { await onDeleteAllEstimates(); setShowDeleteAll(false) }
    catch { toast.error("Failed to delete estimates") }
    finally { setIsDeleting(false) }
  }

  const handleDeleteOne = async () => {
    if (!deleteTarget || !onDeleteItem) return
    setDeletingOne(true)
    try {
      await onDeleteItem(deleteTarget)
      toast.success("Estimate cost deleted")
      setDeleteTarget(null)
    } catch { toast.error("Failed to delete estimate cost") }
    finally { setDeletingOne(false) }
  }

  // ── Manual create ────────────────────────────────────────────────────────
  const handleManualCreated = (item: EstimateItem) => {
    onItemsImported([...safeItems, item])
    // Don't set hasUnsaved — the item is already persisted
  }

  // ── Filtering & grouping ─────────────────────────────────────────────────
  const filtered = safeItems.filter((i) =>
    i.Title.toLowerCase().includes(search.toLowerCase()) ||
    i.Cost_Code.toLowerCase().includes(search.toLowerCase()) ||
    (i.Parent_Group ?? "").toLowerCase().includes(search.toLowerCase())
  )
  const grouped = filtered.reduce((acc, item) => {
    const g = item.Parent_Group || "Ungrouped"
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {} as Record<string, EstimateItem[]>)

  const totals = safeItems.reduce(
    (acc, i) => ({ bc: acc.bc + i.Builder_Cost, cp: acc.cp + i.Client_Price, profit: acc.profit + i.Profit }),
    { bc: 0, cp: 0, profit: 0 }
  )

  // Create Order is disabled while there are unsaved imported items
  const canCreateOrder = !hasUnsaved

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Estimate Breakdown</h2>
              <p className="text-[11px] text-slate-400">{safeItems.length} cost items</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unsaved import actions */}
            {hasUnsaved && (
              <div className="flex items-center gap-2">
                <p className="hidden text-[11px] text-amber-600 sm:block">Unsaved — save before creating orders</p>
                <button onClick={handleCancel}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  <X className="h-3.5 w-3.5" /> Discard
                </button>
                <button onClick={handleSave} disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                  {isSaving ? <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
                </button>
              </div>
            )}

            {/* Delete all */}
            {hasSavedEstimates && !hasUnsaved && (
              <button onClick={() => setShowDeleteAll(true)}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Delete All
              </button>
            )}

            {/* Upload Excel */}
            {!hasSavedEstimates && !hasUnsaved && (
              <>
                <input type="file" accept=".xls,.xlsx" id="estimate-upload" onChange={handleFileUpload} className="hidden" />
                <label htmlFor="estimate-upload"
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                  <FileUp className="h-3.5 w-3.5" /> Import Excel
                </label>
              </>
            )}

            {/* Create manually */}
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
              <FilePlus2 className="h-3.5 w-3.5" /> New Cost
            </button>

            {/* Create Order — disabled while unsaved */}
            <button
              onClick={canCreateOrder ? onCreateOrder : undefined}
              disabled={!canCreateOrder}
              title={!canCreateOrder ? "Save estimate costs before creating an order" : undefined}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors shadow-sm ${
                canCreateOrder
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Order
              {!canCreateOrder && <span className="ml-1 text-[10px] opacity-70">(save first)</span>}
            </button>
          </div>
        </div>

        {/* Saving progress hint */}
        {isSaving && (
          <div className="border-t border-amber-100 bg-amber-50 px-5 py-2">
            <p className="text-[11px] font-medium text-amber-700">
              Saving estimate costs — this may take a moment. Please don't close this page.
            </p>
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Builder Cost" value={`$${totals.bc.toFixed(2)}`} color="blue" sub={`${safeItems.length} items`} />
        <StatCard
          label="Profit"
          value={`${totals.profit >= 0 ? "+" : ""}$${totals.profit.toFixed(2)}`}
          color="emerald"
          sub={totals.bc > 0 ? `${((totals.profit / totals.bc) * 100).toFixed(1)}% margin` : undefined}
        />
        <StatCard label="Client Price" value={`$${totals.cp.toFixed(2)}`} color="amber" />
      </div>

      {/* ── Table card ───────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, cost code, or group…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto" style={{ maxHeight: "520px", overflowY: "auto" }}>
          <table className="w-full min-w-[1100px]">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Title</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Cost Code</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Qty</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Unit Cost</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Type</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Builder Cost</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Client Price</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.keys(grouped).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">No estimate costs yet</p>
                      <p className="text-[11px] text-slate-400">Import an Excel file or create costs manually</p>
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(grouped).map(([group, groupItems]) => {
                  const expanded = expandedGroups.has(group)
                  const gbc = groupItems.reduce((s, i) => s + i.Builder_Cost, 0)
                  const gcp = groupItems.reduce((s, i) => s + i.Client_Price, 0)
                  return (
                    <React.Fragment key={group}>
                      {/* Group row */}
                      <tr
                        className="cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                        onClick={() => toggleGroup(group)}
                      >
                        <td className="px-4 py-2.5">
                          {expanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                        </td>
                        <td colSpan={5} className="px-4 py-2.5 text-xs font-bold text-slate-700">
                          {group}
                          <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">
                            {groupItems.length}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-700">${gbc.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-700">${gcp.toFixed(2)}</td>
                        <td />
                      </tr>
                      {/* Item rows */}
                      {expanded && groupItems.map((item) => (
                        <tr key={item.ID_EstimateItem} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{item.Title}</span>
                              {item.ID_Order && (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  In Order
                                </span>
                              )}
                              {String(item.ID_EstimateItem).startsWith("TEMP") && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                                  Unsaved
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.Cost_Code}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{item.Quantity.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">${item.Unit_Cost.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {item.Cost_Type || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">${item.Builder_Cost.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">${item.Client_Price.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => onViewDetails(item)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-colors"
                                title="View details">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {onDeleteItem && (
                                <button onClick={() => setDeleteTarget(item)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500 transition-colors"
                                  title="Delete cost">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteAll}
        onClose={() => !isDeleting && setShowDeleteAll(false)}
        title="Delete All Estimate Costs?"
        description={`This will permanently delete all ${safeItems.length} estimate costs. This action cannot be undone.`}
        onConfirm={handleDeleteAll}
        loading={isDeleting}
        confirmLabel="Delete All"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !isDeletingOne && setDeleteTarget(null)}
        title="Delete this estimate cost?"
        description={`"${deleteTarget?.Title ?? ""}" will be permanently removed. This action cannot be undone.`}
        onConfirm={handleDeleteOne}
        loading={isDeletingOne}
        confirmLabel="Delete"
      />

      <CreateEstimateItemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        jobId={jobId}
        onCreated={handleManualCreated}
      />
    </div>
  )
}