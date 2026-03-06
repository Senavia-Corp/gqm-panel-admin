"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { OrderDetailsDialog } from "@/components/organisms/OrderDetailsDialog"

interface LeadTechnicianPricingViewProps {
  jobId: string
  job: any
}

export function LeadTechnicianPricingView({ jobId, job }: LeadTechnicianPricingViewProps) {
  const [activeSubTab, setActiveSubTab] = useState("orders")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)

  const subcontractor = job?.subcontractors?.[0]
  const orders = subcontractor?.orders || []

  const formula = orders.reduce((sum: number, order: any) => sum + (order.Formula || 0), 0)
  const adjFormula = orders.reduce((sum: number, order: any) => sum + (order.Adj_formula || 0), 0)

  const subTabs = [
    { id: "orders", label: "Orders" },
    { id: "change-orders", label: "Change Orders" },
    { id: "payments", label: "Payments" },
    { id: "documents", label: "Documents" },
  ]

  const handleViewOrderDetails = (order: any) => {
    const orderWithCosts = {
      ...order,
      estimate_costs: job?.estimate_costs?.filter((cost: any) => cost.ID_Order === order.ID_Order) || [],
    }
    setSelectedOrder(orderWithCosts)
    setIsOrderDialogOpen(true)
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pricing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Label className="mb-2 block text-sm font-medium text-blue-900">Formula</Label>
              <div className="text-2xl font-bold text-blue-900">${formula.toFixed(2)}</div>
              <p className="text-xs text-blue-700 mt-1">Sum of all order builder costs</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <Label className="mb-2 block text-sm font-medium text-green-900">Adj. Formula</Label>
              <div className="text-2xl font-bold text-green-900">${adjFormula.toFixed(2)}</div>
              <p className="text-xs text-green-700 mt-1">Formula + approved change orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="inline-flex rounded-lg border bg-gray-50 p-1">
            {subTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeSubTab === tab.id ? "default" : "ghost"}
                className={`${activeSubTab === tab.id ? "bg-gqm-green text-white hover:bg-gqm-green/90" : ""}`}
                onClick={() => setActiveSubTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeSubTab === "orders" && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No orders assigned to this subcontractor yet</p>
                </div>
              ) : (
                orders.map((order: any) => (
                  <div key={order.ID_Order} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{order.Title}</h4>
                        <p className="text-sm text-muted-foreground">{order.ID_Order}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Formula</p>
                        <p className="text-lg font-semibold">${order.Formula?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Adj. Formula</p>
                        <p className="text-lg font-semibold">${order.Adj_formula?.toFixed(2) || "0.00"}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewOrderDetails(order)}>
                      View Details
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === "change-orders" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No change orders yet</p>
            </div>
          )}

          {activeSubTab === "payments" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No payments yet</p>
            </div>
          )}

          {activeSubTab === "documents" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No documents yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          isOpen={isOrderDialogOpen}
          onClose={() => {
            setIsOrderDialogOpen(false)
            setSelectedOrder(null)
          }}
        />
      )}
    </>
  )
}
