"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import type { Subcontractor, Technician } from "@/lib/types"
import { User, Home, MapPin, Phone, Mail, Globe, Building2, Briefcase, CheckCircle2 } from "lucide-react"
import { TechniciansTable } from "./TechniciansTable"
import { TechnicianDetails } from "./TechnicianDetails"
import { OrderDetailsDialog } from "./OrderDetailsDialog"

interface LeadTechnicianSubcontractorViewProps {
  jobId: string
}

export function LeadTechnicianSubcontractorView({ jobId }: LeadTechnicianSubcontractorViewProps) {
  const [jobData, setJobData] = useState<any>(null)
  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null)
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [activeSubTab, setActiveSubTab] = useState("orders")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (userData) {
      const user = JSON.parse(userData)

      const loadJobData = async () => {
        try {
          const { fetchJobById } = await import("@/lib/services/jobs-service")
          const job = await fetchJobById(jobId)

          if (job) {
            setJobData(job)

            // Find the subcontractor associated with the logged-in technician
            // For now, we'll use the first subcontractor if available
            const techSubcontractor = job.subcontractors?.[0]
            if (techSubcontractor) {
              setSubcontractor(techSubcontractor)
              setOrders(techSubcontractor.orders || [])
            }
          }
        } catch (error) {
          console.error("[v0] Error loading job data:", error)
        }
      }
      loadJobData()
    }
  }, [jobId])

  if (!jobData || !subcontractor) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-gray-500">Loading job details...</div>
      </div>
    )
  }

  const formula = orders.reduce((sum, order) => sum + (order.Formula || 0), 0)
  const adjFormula = orders.reduce((sum, order) => sum + (order.Adj_formula || 0), 0)

  if (selectedTechnician) {
    return (
      <TechnicianDetails
        technician={selectedTechnician}
        subcontractor={subcontractor}
        onBack={() => setSelectedTechnician(null)}
        client={jobData.client || { name: "Unknown Client", id: "N/A", avatar: "" }}
        timelineEvents={jobData.timeline || []}
      />
    )
  }

  const subTabs = [
    { id: "orders", label: "Orders" },
    { id: "change-orders", label: "Change Orders" },
    { id: "payments", label: "Payments" },
    { id: "documents", label: "Documents" },
  ]

  const handleViewOrderDetails = (order: any) => {
    // Enrich order with estimate costs
    const orderWithCosts = {
      ...order,
      estimate_costs: jobData.estimate_costs?.filter((cost: any) => cost.ID_Order === order.ID_Order) || [],
    }
    setSelectedOrder(orderWithCosts)
    setIsOrderDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-end">
            <Button className="bg-black hover:bg-black/90 text-white">
              <User className="mr-2 h-4 w-4" />
              Go to my profile
            </Button>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Pricing</h2>

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
                      orders.map((order) => (
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
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Technicians</h2>
            <TechniciansTable
              technicians={subcontractor.technicians || []}
              onViewDetails={(technician) => setSelectedTechnician(technician)}
            />
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-full bg-gray-100">
                  <Home className="h-6 w-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{jobData.client?.Company_Name || "Unknown Company"}</p>
                  <p className="text-sm text-muted-foreground">Parent Mgmt Company</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Project Name:</p>
                    <p className="text-sm">{jobData.Project_Name || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Job Status:</p>
                    <p className="text-sm">{jobData.Job_Status || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Service Type:</p>
                    <p className="text-sm">{jobData.Service_Type || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Project Location:</p>
                    <p className="text-sm">{jobData.Project_Location || "N/A"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subcontractor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-full bg-gray-100">
                  <User className="h-6 w-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{subcontractor.Name}</p>
                  <p className="text-sm text-muted-foreground">{subcontractor.ID_Subcontractor}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80">
                    Score: {subcontractor.Score}
                  </Badge>
                  <Badge
                    variant={subcontractor.State === "Active" ? "default" : "secondary"}
                    className={`${subcontractor.State === "Active" ? "bg-green-500 hover:bg-green-600" : ""}`}
                  >
                    {subcontractor.State}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Organization:</p>
                    <p className="text-sm">{subcontractor.Organization || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Email:</p>
                    <p className="text-sm">{subcontractor.Email_Address || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Phone:</p>
                    <p className="text-sm">{subcontractor.Phone_Number || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Address:</p>
                    <p className="text-sm">{subcontractor.Address || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Website:</p>
                    <a
                      href={`https://${subcontractor.Organization_Website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {subcontractor.Organization_Website || "N/A"}
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  )
}
