"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { EstimateItem } from "@/lib/types"
import { Search, Eye, Plus, FileUp, ChevronDown, ChevronRight, Trash2, Save, X } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as XLSX from "xlsx"

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

export function EstimateBreakdownTable({
  items,
  onViewDetails,
  onCreateOrder,
  onItemsImported,
  jobId,
  hasSavedEstimates,
  onSaveEstimates,
  onDeleteAllEstimates,
  onCancelImport,
  onDeleteItem
}: EstimateBreakdownTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [hasUnsavedImport, setHasUnsavedImport] = useState(false)
  const safeItems = items ?? []

  const [deleteTarget, setDeleteTarget] = useState<EstimateItem | null>(null)
  const [isDeletingOne, setIsDeletingOne] = useState(false)

  useEffect(() => {
    const groupNames = [...new Set(safeItems.map((item) => item.Parent_Group || "Ungrouped"))]
    setExpandedGroups(new Set(groupNames))
  }, [safeItems])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const name = file.name.toLowerCase()
    const isExcel = name.endsWith(".xls") || name.endsWith(".xlsx")

    if (!isExcel) {
      toast.error("Please upload an Excel file (.xls or .xlsx)")
      event.target.value = ""
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })

      const firstSheetName = wb.SheetNames?.[0]
      if (!firstSheetName) {
        toast.error("Excel file has no sheets")
        event.target.value = ""
        return
      }

      const ws = wb.Sheets[firstSheetName]

      // sheet_to_json con headers desde la primera fila
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
        defval: "", // evita undefined
        raw: true,  // respeta números como números
      })

      if (!rows.length) {
        toast.error("Excel file is empty")
        event.target.value = ""
        return
      }

      const num = (v: any, fallback = 0) => {
        if (typeof v === "number") return Number.isFinite(v) ? v : fallback
        const s = String(v ?? "").replace(/[%$,]/g, "").trim()
        const n = Number.parseFloat(s)
        return Number.isFinite(n) ? n : fallback
      }

      const str = (v: any) => String(v ?? "").trim()

      // Headers típicos Buildertrend (según tu XLS):
      // "Cost Code", "Parent Group", "Parent Group Description", "% Invoiced", etc.
      const parsedItems: EstimateItem[] = rows
        .filter((r) => {
          // filtra posibles filas basura
          const title = str(r["Title"])
          const costCode = str(r["Cost Code"])
          return title || costCode
        })
        .map((r, i) => {
          const builderCost = num(r["Builder Cost"], 0)
          const clientPrice = num(r["Client Price"], 0)
          const profit = r["Profit"] !== "" ? num(r["Profit"], clientPrice - builderCost) : clientPrice - builderCost

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
            Unit_Cost: num(r["Unit Cost"], 0),

            Cost_Type: (str(r["Cost Type"]) as any) || "Subcontractor",
            Marked_As: str(r["Marked As"]),

            Builder_Cost: builderCost,
            Markup: num(r["Markup"], 0),
            Markup_Type: (str(r["Markup Type"]) as any) || "",
            Unit_Price: num(r["Unit Price"], 0),
            Client_Price: clientPrice,
            Margin: num(r["Margin"], 0),
            Profit: profit,
            Percent_Invoiced: num(r["% Invoiced"], 0),
            Internal_Notes: str(r["Internal Notes"]),

            ID_Order: null,
          }
        })

      onItemsImported(parsedItems)
      setHasUnsavedImport(true)
      toast.success(`Successfully imported ${parsedItems.length} items from Excel`)

      event.target.value = ""
    } catch (error) {
      console.error("[estimate] Error parsing Excel:", error)
      toast.error("Error parsing Excel file. Please check the format.")
      event.target.value = ""
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveEstimates()
      setHasUnsavedImport(false)
      toast.success("Estimates saved successfully")
    } catch (error) {
      toast.error("Failed to save estimates")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    onCancelImport()
    setHasUnsavedImport(false)
    toast.info("Import cancelled")
  }

  const handleDeleteAll = async () => {
    setIsDeleting(true)
    try {
      await onDeleteAllEstimates()
      setShowDeleteConfirm(false)
      toast.success("All estimates deleted successfully")
    } catch (error) {
      toast.error("Failed to delete estimates")
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredItems = safeItems.filter(
    (item) =>
      item.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Cost_Code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Parent_Group.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const group = item.Parent_Group || "Ungrouped"
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(item)
      return acc
    },
    {} as Record<string, EstimateItem[]>,
  )

  const totals = safeItems.reduce(
    (acc, item) => ({
      builderCost: acc.builderCost + item.Builder_Cost,
      clientPrice: acc.clientPrice + item.Client_Price,
      profit: acc.profit + item.Profit,
    }),
    { builderCost: 0, clientPrice: 0, profit: 0 },
  )

  console.log("Aqui los items del estimado", items);


  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Estimate Breakdown</h2>
          <Badge className="bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80">{safeItems.length} Items</Badge>
        </div>
        <div className="flex items-center gap-2">
          {!hasSavedEstimates && !hasUnsavedImport && (
            <>
              <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} className="hidden" id="estimate-upload" />
              <label htmlFor="estimate-upload">
                <Button asChild variant="outline" className="flex items-center gap-2 bg-transparent cursor-pointer">
                  <span>
                    <FileUp className="h-4 w-4" />
                    Upload Excel
                  </span>
                </Button>
              </label>
            </>
          )}

          {hasUnsavedImport && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2 bg-transparent">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gqm-green hover:bg-gqm-green/90 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>

              {/* ✅ TEXTO BAJO SAVE */}
              {isSaving && (
                <p className="text-xs text-muted-foreground">
                  This may take a few minutes, please do not cancel the process.
                </p>
              )}
            </div>
          )}

          {hasSavedEstimates && !hasUnsavedImport && (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Costs"}
            </Button>
          )}

          <Button onClick={onCreateOrder} className="bg-gqm-green hover:bg-gqm-green/90 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Builder Cost</p>
          <p className="text-2xl font-bold">${totals.builderCost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Profit</p>
          <p className="text-2xl font-bold text-green-600">+${totals.profit.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Client Price</p>
          <p className="text-2xl font-bold">${totals.clientPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title, cost code, or parent group..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="border-b bg-background sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium w-[40px]"></th>
                <th className="px-6 py-4 text-left text-sm font-medium">Title</th>
                <th className="px-6 py-4 text-left text-sm font-medium">Cost Code</th>
                <th className="px-6 py-4 text-right text-sm font-medium">Quantity</th>
                <th className="px-6 py-4 text-right text-sm font-medium">Unit Cost</th>
                <th className="px-6 py-4 text-left text-sm font-medium">Cost Type</th>
                <th className="px-6 py-4 text-right text-sm font-medium">Builder Cost</th>
                <th className="px-6 py-4 text-right text-sm font-medium">Client Price</th>
                <th className="px-6 py-4 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.keys(groupedItems).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    No estimate items found. Upload a CSV file to get started.
                  </td>
                </tr>
              ) : (
                Object.entries(groupedItems).map(([groupName, groupItems]) => {
                  const isExpanded = expandedGroups.has(groupName)
                  const groupBuilderTotal = groupItems.reduce((sum, item) => sum + item.Builder_Cost, 0)
                  const groupClientTotal = groupItems.reduce((sum, item) => sum + item.Client_Price, 0)

                  return (
                    <React.Fragment key={`group-${groupName}`}>
                      {/* Parent Group Header Row */}
                      <tr
                        key={`group-${groupName}`}
                        className="bg-muted/30 hover:bg-muted/50 cursor-pointer font-semibold"
                        onClick={() => toggleGroup(groupName)}
                      >
                        <td className="px-6 py-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                        <td colSpan={5} className="px-6 py-3">
                          {groupName}
                        </td>
                        <td className="px-6 py-3 text-right font-bold">${groupBuilderTotal.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right font-bold">${groupClientTotal.toFixed(2)}</td>
                        <td></td>
                      </tr>

                      {/* Group Items */}
                      {isExpanded &&
                        groupItems.map((item) => (
                          <tr key={item.ID_EstimateItem} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4"></td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.Title}</span>
                                {item.ID_Order && (
                                  <Badge variant="secondary" className="text-xs">
                                    In Order
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm">{item.Cost_Code}</td>
                            <td className="px-6 py-4 text-right text-sm">{item.Quantity.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-medium">${item.Unit_Cost.toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="text-xs">
                                {item.Cost_Type || "N/A"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-semibold">${item.Builder_Cost.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-semibold">${item.Client_Price.toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewDetails(item)}
                                  className="h-8 w-8 p-0"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(item)}
                                  className="h-8 w-8 p-0"
                                  title="Delete cost"
                                  disabled={!onDeleteItem} // si no se pasa prop, no permite borrar
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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

      {/* Delete all confirmation dialog */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (isDeleting) return
          setShowDeleteConfirm(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Estimate Costs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {safeItems.length} estimate costs for this job. This action cannot be undone.
              You will need to re-import a xls file to add new estimates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete one confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this estimate cost?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingOne}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingOne}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget || !onDeleteItem) return
                setIsDeletingOne(true)
                try {
                  await onDeleteItem(deleteTarget)
                  toast.success("Estimate cost deleted successfully")
                  setDeleteTarget(null)
                } catch (e) {
                  console.error("[estimate] delete item error:", e)
                  toast.error("Failed to delete estimate cost")
                } finally {
                  setIsDeletingOne(false)
                }
              }}
            >
              {isDeletingOne ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
