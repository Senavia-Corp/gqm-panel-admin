"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { EstimateItem } from "@/lib/types"
import { ArrowLeft } from "lucide-react"

interface EstimateItemDetailsProps {
  item: EstimateItem
  onBack: () => void
  onEdit?: () => void
}

export function EstimateItemDetails({ item, onBack, onEdit }: EstimateItemDetailsProps) {
  const parseValue = (value: string | number): number => {
    if (typeof value === "number") return value
    const parsed = Number.parseFloat(String(value).replace(/[%$,]/g, ""))
    return Number.isNaN(parsed) ? 0 : parsed
  }

  const markup = parseValue(item.Markup)
  const margin = parseValue(item.Margin)
  const percentInvoiced = parseValue(item.Percent_Invoiced)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Estimate Breakdown
        </Button>
        {onEdit && (
          <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Edit Cost
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{item.Title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{item.ID_EstimateItem}</p>
              </div>
              <div className="flex gap-2">
                {item.ID_Order && (
                  <Badge className="bg-gqm-green text-white hover:bg-gqm-green/90 text-base px-3 py-1">
                    Assigned to Order
                  </Badge>
                )}
                <Badge variant="outline" className="text-base px-3 py-1">
                  {item.Cost_Type || "N/A"}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Category & Classification */}
        <Card>
          <CardHeader>
            <CardTitle>Category & Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-medium">Category</Label>
                <p className="text-base">{item.Category}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Cost Code</Label>
                <p className="text-base font-mono">{item.Cost_Code}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Parent Group</Label>
                <p className="text-base">{item.Parent_Group || "N/A"}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Line Item Type</Label>
                <p className="text-base">{item.Line_Item_Type}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base whitespace-pre-wrap">{item.Description}</p>
          </CardContent>
        </Card>

        {/* Quantity & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="mb-2 block text-sm font-medium">Quantity</Label>
                <p className="text-base font-semibold">{item.Quantity.toFixed(2)}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Unit</Label>
                <p className="text-base">{item.Unit || "N/A"}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Unit Cost</Label>
                <p className="text-base font-semibold">${item.Unit_Cost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-medium">Builder Cost</Label>
                <p className="text-2xl font-bold">${item.Builder_Cost.toFixed(2)}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Client Price</Label>
                <p className="text-2xl font-bold">${item.Client_Price.toFixed(2)}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Markup</Label>
                <p className="text-base font-semibold">
                  {item.Markup_Type === "%" ? `${markup}%` : `$${markup.toFixed(2)}`}
                </p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Profit</Label>
                <p className={`text-base font-semibold ${item.Profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${item.Profit.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Margin</Label>
                <p className={`text-base font-semibold ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {margin.toFixed(2)}%
                </p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">% Invoiced</Label>
                <p className="text-base font-semibold">{percentInvoiced.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Internal Notes */}
        {item.Internal_Notes && (
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base">{item.Internal_Notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
