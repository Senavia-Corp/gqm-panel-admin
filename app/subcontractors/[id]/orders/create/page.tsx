"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus } from "lucide-react"
import { mockEstimateItems, mockOrders } from "@/lib/mock-data/estimates"
import { mockJobs } from "@/lib/mock-data/jobs"
import type { EstimateItem } from "@/lib/types"

export default function CreateOrderPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [orderName, setOrderName] = useState("")
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [availableItems, setAvailableItems] = useState<EstimateItem[]>([])

  useEffect(() => {
    if (selectedJobId) {
      // Get items from selected job that aren't in other orders
      const jobItems = mockEstimateItems.filter((item) => item.ID_Jobs === selectedJobId)
      const itemsInOrders = mockOrders
        .filter((o) => o.ID_Jobs === selectedJobId)
        .flatMap((o) => o.Items.map((i) => i.ID_EstimateItem))

      const available = jobItems.filter((item) => !itemsInOrders.includes(item.ID_EstimateItem))
      setAvailableItems(available)
      setSelectedItems(new Set())
    }
  }, [selectedJobId])

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const selectedItemDetails = availableItems.filter((item) => selectedItems.has(item.ID_EstimateItem))
  const totalBuilderCost = selectedItemDetails.reduce((sum, item) => sum + item.Builder_Cost, 0)

  const handleCreate = () => {
    console.log("[v0] Creating order:", {
      orderName,
      subcontractorId: params.id,
      jobId: selectedJobId,
      items: Array.from(selectedItems),
    })
    router.push(`/subcontractors/${params.id}?tab=orders`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/subcontractors/${params.id}?tab=orders`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Create New Order</h1>
        <p className="text-muted-foreground mt-1">Create a new order by selecting a job and items from its estimate</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block font-bold">Order Name</Label>
            <Input
              placeholder="e.g., Kitchen Renovation Package"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block font-bold">Select Job</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a job..." />
              </SelectTrigger>
              <SelectContent>
                {mockJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.id} - {job.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedJobId && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Label className="mb-2 block text-sm font-medium text-blue-900">Total Builder Cost (Formula)</Label>
              <div className="text-2xl font-bold text-blue-900">${totalBuilderCost.toFixed(2)}</div>
              <p className="text-xs text-blue-700 mt-1">{selectedItems.size} items selected</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedJobId && (
        <Card>
          <CardHeader>
            <CardTitle>Select Items from Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            {availableItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No available items in this job's estimate, or all items are already assigned to orders
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableItems.map((item) => (
                  <div
                    key={item.ID_EstimateItem}
                    className="flex items-start gap-3 p-3 rounded-md border hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedItems.has(item.ID_EstimateItem)}
                      onCheckedChange={() => handleToggleItem(item.ID_EstimateItem)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.Title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.Description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Code: {item.Cost_Code}</span>
                        <span>Qty: {item.Quantity}</span>
                        <span className="font-semibold">Builder Cost: ${item.Builder_Cost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(`/subcontractors/${params.id}?tab=orders`)}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!orderName || !selectedJobId || selectedItems.size === 0}
          className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
        >
          <Plus className="h-4 w-4" />
          Create Order
        </Button>
      </div>
    </div>
  )
}
