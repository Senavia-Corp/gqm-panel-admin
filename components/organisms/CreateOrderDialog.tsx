"use client"

import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EstimateItem, Subcontractor } from "@/lib/types"
import { toast } from "sonner"
import { Briefcase, Building2, CheckSquare, Loader2, PackagePlus, Search, XCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: EstimateItem[]
  subcontractors: Subcontractor[]
  defaultSyncPodio: boolean
  onCreateOrder: (orderName: string, subcontractorId: string, selectedItems: string[], syncPodio: boolean) => Promise<void>
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  items,
  subcontractors,
  onCreateOrder,
  defaultSyncPodio,
}: CreateOrderDialogProps) {
  const [orderName, setOrderName] = useState("")
  const [selectedSubcontractor, setSelectedSubcontractor] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [itemsQuery, setItemsQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [syncPodioLocal, setSyncPodioLocal] = useState(defaultSyncPodio)

  useEffect(() => {
    if (open) setSyncPodioLocal(defaultSyncPodio)
  }, [open, defaultSyncPodio])

  const availableItems = useMemo(() => items.filter((i) => !i.ID_Order), [items])

  const filteredAvailableItems = useMemo(() => {
    const q = itemsQuery.trim().toLowerCase()
    if (!q) return availableItems
    return availableItems.filter((i) => {
      return (
        i.Title.toLowerCase().includes(q) ||
        i.Cost_Code.toLowerCase().includes(q) ||
        (i.Parent_Group ?? "").toLowerCase().includes(q)
      )
    })
  }, [availableItems, itemsQuery])

  const totals = useMemo(() => {
    const selected = items.filter((i) => selectedItems.includes(i.ID_EstimateItem))
    return selected.reduce(
      (acc, item) => ({
        builderCost: acc.builderCost + item.Builder_Cost,
        clientPrice: acc.clientPrice + item.Client_Price,
        profit: acc.profit + item.Profit,
      }),
      { builderCost: 0, clientPrice: 0, profit: 0 },
    )
  }, [items, selectedItems])

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const selectAllVisible = () => {
    const ids = filteredAvailableItems.map((i) => i.ID_EstimateItem)
    setSelectedItems((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const clearSelection = () => setSelectedItems([])

  const resetForm = () => {
    setOrderName("")
    setSelectedSubcontractor("")
    setSelectedItems([])
    setItemsQuery("")
  }

  const handleSubmit = async () => {
    if (!orderName.trim()) return toast.error("Please enter an order name")
    if (!selectedSubcontractor) return toast.error("Please select a subcontractor")
    if (selectedItems.length === 0) return toast.error("Please select at least one item")

    setIsSubmitting(true)
    try {
      await onCreateOrder(orderName.trim(), selectedSubcontractor, selectedItems, syncPodioLocal)
      resetForm()
      onOpenChange(false)
    } catch {
      toast.error("Failed to create order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedSubcLabel = useMemo(() => {
    const sub = subcontractors.find((s) => s.ID_Subcontractor === selectedSubcontractor)
    if (!sub) return null
    return `${sub.Name}${sub.Organization ? ` • ${sub.Organization}` : ""}`
  }, [selectedSubcontractor, subcontractors])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return
        onOpenChange(next)
        if (!next) resetForm()
      }}
    >
      <DialogContent
        className="
          w-[96vw] max-w-[1200px] sm:w-[96vw] sm:max-w-[1200px]
          h-[85vh]
          overflow-hidden
          p-0
          flex flex-col
        "
      >
        {/* HEADER (no scroll) */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Create New Order</DialogTitle>
          <p className="text-sm text-muted-foreground">Pick a subcontractor, choose estimate items, and create an order.</p>
        </DialogHeader>

        {/* BODY (no scroll; the list will scroll) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 h-full">
            {/* Left panel */}
            <div className="lg:col-span-2 px-6 py-5 space-y-5 overflow-y-auto min-h-0">
              <div className="space-y-2">
                <Label htmlFor="orderName" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Order Name
                </Label>
                <Input
                  id="orderName"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder="e.g., Interior Finishing Package"
                  className="h-11"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcontractor" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Assign to Subcontractor
                </Label>

                <Select value={selectedSubcontractor} onValueChange={setSelectedSubcontractor} disabled={isSubmitting}>
                  <SelectTrigger id="subcontractor" className="h-11">
                    <SelectValue placeholder="Select a subcontractor" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {subcontractors.map((sub) => (
                      <SelectItem key={sub.ID_Subcontractor} value={sub.ID_Subcontractor}>
                        <div className="flex flex-col">
                          <span className="font-medium">{sub.Name}</span>
                          {sub.Organization ? <span className="text-xs text-muted-foreground">{sub.Organization}</span> : null}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedSubcLabel ? (
                  <div className="text-xs text-muted-foreground">
                    Selected: <span className="text-foreground">{selectedSubcLabel}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Sync with Podio</p>
                  <p className="text-xs text-muted-foreground">{syncPodioLocal ? "Enabled (will require year)" : "Disabled"}</p>
                </div>
                <Switch checked={syncPodioLocal} onCheckedChange={setSyncPodioLocal} />
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Order Summary</h3>
                  <span className="text-xs text-muted-foreground">{selectedItems.length} selected</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-background p-3 border">
                    <p className="text-muted-foreground text-xs">Builder Cost</p>
                    <p className="text-lg font-bold">${totals.builderCost.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-background p-3 border">
                    <p className="text-muted-foreground text-xs">Profit</p>
                    <p className="text-lg font-bold text-green-600">+${totals.profit.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-background p-3 border">
                    <p className="text-muted-foreground text-xs">Client Price</p>
                    <p className="text-lg font-bold">${totals.clientPrice.toFixed(2)}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">Tip: you can select all visible items using the button on the right panel.</p>
              </div>
            </div>

            {/* Right panel */}
            <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l bg-background px-6 py-5 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between gap-3 shrink-0">
                <div className="space-y-1">
                  <Label>Select Items</Label>
                  <p className="text-xs text-muted-foreground">
                    Only items not assigned to any order are shown ({availableItems.length} available).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllVisible}
                    disabled={isSubmitting || filteredAvailableItems.length === 0}
                    className="gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Select visible
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    disabled={isSubmitting || selectedItems.length === 0}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={itemsQuery}
                  onChange={(e) => setItemsQuery(e.target.value)}
                  placeholder="Search by title, cost code, or group..."
                  className="pl-10 h-11"
                  disabled={isSubmitting}
                />
              </div>

              {/* ✅ THE ONLY SCROLL AREA */}
              <div className="flex-1 min-h-0 overflow-y-auto border rounded-xl">
                {filteredAvailableItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-10">No items found.</div>
                ) : (
                  <div className="divide-y">
                    {filteredAvailableItems.map((item) => {
                      const checked = selectedItems.includes(item.ID_EstimateItem)
                      return (
                        <div key={item.ID_EstimateItem} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
                          <Checkbox
                            id={item.ID_EstimateItem}
                            checked={checked}
                            onCheckedChange={() => toggleItem(item.ID_EstimateItem)}
                            disabled={isSubmitting}
                          />
                          <div className="flex-1 min-w-0">
                            <label htmlFor={item.ID_EstimateItem} className="block font-medium cursor-pointer truncate">
                              {item.Title}
                            </label>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-mono">{item.Cost_Code}</span>
                              {item.Parent_Group ? <span>{item.Parent_Group}</span> : null}
                              <span>Builder: ${item.Builder_Cost.toFixed(2)}</span>
                              <span>Client: ${item.Client_Price.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="text-right text-xs text-muted-foreground">
                            <div className="font-medium text-foreground">${item.Builder_Cost.toFixed(0)}</div>
                            <div>builder</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER (always visible) */}
        <div className="px-6 py-4 border-t bg-background flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gqm-green hover:bg-gqm-green/90 gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            {isSubmitting ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}