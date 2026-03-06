"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Plus, X } from "lucide-react"
import { mockOrders, mockEstimateItems } from "@/lib/mock-data/estimates"
import type { SubcontractorOrder, EstimateItem } from "@/lib/types"

export default function OrderDetailPage({
  params,
}: {
  params: { id: string; orderId: string }
}) {
  const router = useRouter()
  const [order, setOrder] = useState<SubcontractorOrder | null>(null)
  const [orderName, setOrderName] = useState("")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [availableItems, setAvailableItems] = useState<EstimateItem[]>([])
  const [showAddItems, setShowAddItems] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    const foundOrder = mockOrders.find((o) => o.ID_Order === params.orderId)
    if (foundOrder) {
      setOrder(foundOrder)
      setOrderName(foundOrder.Order_Name)
      setSelectedItems(new Set(foundOrder.Items.map((i) => i.ID_EstimateItem)))

      // Get available items: from same job, not already in other orders
      const jobItems = mockEstimateItems.filter((item) => item.ID_Jobs === foundOrder.ID_Jobs)
      const itemsInOtherOrders = mockOrders
        .filter((o) => o.ID_Order !== params.orderId && o.ID_Jobs === foundOrder.ID_Jobs)
        .flatMap((o) => o.Items.map((i) => i.ID_EstimateItem))

      const available = jobItems.filter((item) => !itemsInOtherOrders.includes(item.ID_EstimateItem))
      setAvailableItems(available)
    }
  }, [params.orderId])

  if (!order) {
    return <div>Loading...</div>
  }

  const handleFieldChange = (field: string, value: any) => {
    setEditedFields((prev) => new Set(prev).add(field))
    if (field === "Order_Name") {
      setOrderName(value)
    }
  }

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      setEditedFields((fields) => new Set(fields).add("Items"))
      return newSet
    })
  }

  const currentItems = availableItems.filter((item) => selectedItems.has(item.ID_EstimateItem))
  const formula = currentItems.reduce((sum, item) => sum + item.Builder_Cost, 0)
  const adjFormula = formula // + change orders (not implemented yet)

  const handleSave = () => {
    console.log("[v0] Saving order changes:", {
      orderId: params.orderId,
      orderName,
      selectedItems: Array.from(selectedItems),
    })
    setEditedFields(new Set())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push(`/subcontractors/${params.id}?tab=orders`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        {editedFields.size > 0 && (
          <Button onClick={handleSave} className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold">Order Details</h1>
        <p className="text-muted-foreground mt-1">Order ID: {order.ID_Order}</p>
      </div>

      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Information</CardTitle>
            <Badge
              className={
                order.Status === "Approved"
                  ? "bg-green-500 hover:bg-green-600"
                  : order.Status === "Draft"
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : ""
              }
            >
              {order.Status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2 block font-bold">Order Name</Label>
              <Input
                value={orderName}
                onChange={(e) => handleFieldChange("Order_Name", e.target.value)}
                className={editedFields.has("Order_Name") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
              />
            </div>
            <div>
              <Label className="mb-2 block font-bold">Job ID</Label>
              <Input value={order.ID_Jobs} disabled className="bg-gray-50" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Label className="mb-2 block text-sm font-medium text-blue-900">Formula</Label>
              <div className="text-2xl font-bold text-blue-900">${formula.toFixed(2)}</div>
              <p className="text-xs text-blue-700 mt-1">Sum of all item builder costs</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <Label className="mb-2 block text-sm font-medium text-green-900">Adj. Formula</Label>
              <div className="text-2xl font-bold text-green-900">${adjFormula.toFixed(2)}</div>
              <p className="text-xs text-green-700 mt-1">Formula + approved change orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Items ({currentItems.length})</CardTitle>
            <Button onClick={() => setShowAddItems(!showAddItems)} variant="outline" className="gap-2">
              {showAddItems ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAddItems ? "Cancel" : "Add/Remove Items"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddItems && (
            <div className="mb-6 p-4 rounded-lg bg-gray-50 border space-y-3">
              <h3 className="font-semibold text-sm">Select items from estimate:</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableItems.map((item) => (
                  <div
                    key={item.ID_EstimateItem}
                    className="flex items-start gap-3 p-3 rounded-md border bg-white hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedItems.has(item.ID_EstimateItem)}
                      onCheckedChange={() => handleToggleItem(item.ID_EstimateItem)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.Title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.Description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cost Code: {item.Cost_Code} • Builder Cost: ${item.Builder_Cost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-left font-medium">Cost Code</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
                    <th className="px-4 py-3 text-right font-medium">Builder Cost</th>
                    <th className="px-4 py-3 text-right font-medium">Markup</th>
                    <th className="px-4 py-3 text-right font-medium">Client Price</th>
                    <th className="px-4 py-3 text-right font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        No items selected
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr key={item.ID_EstimateItem} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.Title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.Cost_Code}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={item.Description}>
                          {item.Description}
                        </td>
                        <td className="px-4 py-3 text-right">{item.Quantity}</td>
                        <td className="px-4 py-3 text-right">${item.Unit_Cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold">${item.Builder_Cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          {item.Markup_Type === "%" ? `${item.Markup}%` : `$${item.Markup.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-right">${item.Client_Price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">${item.Profit.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {currentItems.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right">
                        Totals:
                      </td>
                      <td className="px-4 py-3 text-right">${formula.toFixed(2)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right">
                        ${currentItems.reduce((sum, item) => sum + item.Client_Price, 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        ${currentItems.reduce((sum, item) => sum + item.Profit, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
