"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import type { Subcontractor, Technician, ChangeOrder, Client, TimelineEvent } from "@/lib/types"
import {
  ArrowLeft,
  Plus,
  Building2,
  Globe,
  MapPin,
  Mail,
  Phone,
  User as UserIcon,
  CheckCircle,
  FileText,
} from "lucide-react"
import { TechniciansTable } from "./TechniciansTable"
import { TechnicianDetails } from "./TechnicianDetails"
import { mockChangeOrders } from "@/lib/mock-data/change-orders"
import { OrderDetailsDialog } from "./OrderDetailsDialog"
import { CreateChangeOrderDialog } from "@/components/organisms/CreateChangeOrderDialog"
import { Pencil, Trash2 } from "lucide-react"
import { DeleteChangeOrderDialog } from "@/components/organisms/DeleteChangeOrderDialog"
import { DeleteOrderDialog } from "./DeleteJobOrderDialog"

interface SubcontractorDetailsProps {
  subcontractor: Subcontractor
  onBack: () => void
  jobId: string
  jobPodioId?: string
  client: Client
  timelineEvents: TimelineEvent[]
  estimateCosts?: any[]

  defaultSyncPodio: boolean
  jobYearForPodioSync?: number
}

/**
 * Normalize organization strings coming from backend like:
 * {"JJE Services LLC"}  ->  JJE Services LLC
 */
function normalizeOrg(raw: any): string {
  if (raw === null || raw === undefined) return ""
  if (Array.isArray(raw)) {
    return raw.map((r) => String(r).trim()).filter(Boolean).join(", ")
  }
  if (typeof raw === "object") {
    try {
      const vals = Object.values(raw)
      if (vals.length > 0) return String(vals[0]).trim()
    } catch {
      return String(raw)
    }
  }

  let s = String(raw).trim()
  s = s.replace(/\\"/g, '"').replace(/\\'/g, "'")
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
    s = s.slice(1, -1).trim()
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1)
  }
  s = s.replace(/^[\{\[\]"'\s]+|[\}\]\s"']+$/g, "").trim()
  return s
}

function normalizeEmails(raw: any): string[] {
  if (raw === null || raw === undefined) return []
  let s = Array.isArray(raw) ? raw.join(",") : String(raw)
  s = s.trim()
  if (!s) return []

  s = s.replace(/\\"/g, '"').replace(/\\'/g, "'")

  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
    s = s.slice(1, -1).trim()
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1)
  }

  const parts = s.replace(/;/g, ",").split(",").map((p) => p.trim())

  const cleaned = parts
    .map((p) => p.replace(/^[\{\[\]"']+|[\}\]\s"']+$/g, "").trim())
    .filter(Boolean)

  return Array.from(new Set(cleaned))
}

export function SubcontractorDetails({
  subcontractor,
  onBack,
  jobId,
  jobPodioId,
  client,
  timelineEvents,
  estimateCosts = [],
  defaultSyncPodio,
  jobYearForPodioSync,
}: SubcontractorDetailsProps) {
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [activeSubTab, setActiveSubTab] = useState("orders")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false)

  // change order state
  const [createChOpen, setCreateChOpen] = useState(false)
  const [targetOrderForCh, setTargetOrderForCh] = useState<any | null>(null)

  const [editChOpen, setEditChOpen] = useState(false)
  const [deleteChOpen, setDeleteChOpen] = useState(false)
  const [targetChangeOrder, setTargetChangeOrder] = useState<any | null>(null)

  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false)
  const [targetOrderForDelete, setTargetOrderForDelete] = useState<any | null>(null)

  // ── Memoized fetch ──────────────────────────────────────────────────────
  const fetchOrdersForJobAndSub = useCallback(async () => {
    try {
      setLoadingOrders(true)

      const subId = String(subcontractor?.ID_Subcontractor ?? "")
      const jId   = String(jobId ?? "")

      if (!subId || !jId) {
        setOrders([])
        return
      }

      const qs = new URLSearchParams()
      qs.set("ID_Jobs", jId)
      qs.set("ID_Subcontractor", subId)

      const url = `/api/order?${qs.toString()}`
      const res = await fetch(url, { cache: "no-store" })

      if (!res.ok) {
        console.error("Failed to fetch orders for job+subcontractor:", res.status)
        setOrders([])
        return
      }

      const data = await res.json()

      let ordersData: any[] = []
      if (Array.isArray(data))               ordersData = data
      else if (Array.isArray(data.results))  ordersData = data.results
      else if (Array.isArray(data.items))    ordersData = data.items
      else if (Array.isArray(data.data))     ordersData = data.data
      else                                   ordersData = []

      const mapped = ordersData.map((o) => ({
        ...o,
        Items:        o.estimate_costs ?? o.Items ?? o.items ?? [],
        Formula:      o.Formula      ?? o.formula      ?? 0,
        Adj_formula:  o.Adj_formula  ?? o.adj_formula  ?? 0,
        change_orders: o.change_orders ?? o.changeOrders ?? [],
      }))

      setOrders(mapped)
    } catch (error) {
      console.error("Error fetching orders for subcontractor detail:", error)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }, [subcontractor?.ID_Subcontractor, jobId])

  useEffect(() => {
    fetchOrdersForJobAndSub()
  }, [fetchOrdersForJobAndSub])

  useEffect(() => {
    const subChangeOrders = mockChangeOrders.filter(
      (co) => co.ID_Subcontractor === subcontractor.ID_Subcontractor && co.ID_Jobs === jobId,
    )
    setChangeOrders(subChangeOrders)
  }, [subcontractor, jobId])

  // ─────────────────────────────────────────────────────────────────────────
  // Order.Adj_formula is now recalculated automatically by the backend
  // whenever a change order is created, updated, or deleted.
  // The frontend only needs to reload the orders after each mutation.
  // ─────────────────────────────────────────────────────────────────────────

  const formula    = orders.reduce((sum, order) => sum + (order.Formula     || 0), 0)
  const adjFormula = orders.reduce((sum, order) => sum + (order.Adj_formula || 0), 0)

  if (selectedTechnician) {
    return (
      <TechnicianDetails
        technician={selectedTechnician}
        subcontractor={subcontractor}
        onBack={() => setSelectedTechnician(null)}
        client={client}
        timelineEvents={timelineEvents}
      />
    )
  }

  const subTabs = [{ id: "orders", label: "Orders" }]

  const orgText = normalizeOrg(subcontractor.Organization)
  const emails  = normalizeEmails(subcontractor.Email_Address ?? "")

  const handleOpenCreateChangeOrder = (order: any) => {
    setTargetOrderForCh(order)
    setCreateChOpen(true)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6 lg:col-span-2">
        {/* Header Card */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 px-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gqm-yellow/10 text-gqm-yellow-600 ring-1 ring-gqm-yellow/20">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{subcontractor.Name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{subcontractor.ID_Subcontractor}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80 text-base px-3 py-1">
                Score: {subcontractor.Score ?? "—"}
              </Badge>

              <Badge
                variant={subcontractor.Status === "Active" ? "default" : "secondary"}
                className={`${subcontractor.Status === "Active" ? "bg-green-500 hover:bg-green-600" : ""} text-base px-3 py-1`}
              >
                {subcontractor.Status ?? "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Organization Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Organization Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Organization Name
                </Label>
                <p className="text-base">{orgText || "—"}</p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-bold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" /> Website
                </Label>
                {subcontractor.Organization_Website ? (
                  <a
                    href={`https://${subcontractor.Organization_Website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:underline"
                  >
                    {subcontractor.Organization_Website}
                  </a>
                ) : (
                  <p className="text-base text-muted-foreground">—</p>
                )}
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-sm font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Address
              </Label>
              <p className="text-base">{subcontractor.Address || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Contact Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-bold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> Email
                </Label>
                {emails.length === 0 ? (
                  <p className="text-base text-muted-foreground">—</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {emails.map((e, i) => (
                      <a
                        key={i}
                        href={`mailto:${e}`}
                        className="text-base text-blue-600 hover:underline break-words max-w-full"
                        title={e}
                      >
                        {e}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-2 block text-sm font-bold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" /> Phone Number
                </Label>
                <p className="text-base">{subcontractor.Phone_Number || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GQM Certifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <CardTitle>GQM Certifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-bold">GQM Compliance</Label>
                <Badge
                  variant={String(subcontractor.Gqm_compliance) === "Active" ? "default" : "secondary"}
                  className={`${String(subcontractor.Gqm_compliance) === "Active" ? "bg-green-500 hover:bg-green-600" : ""} text-base px-3 py-1`}
                >
                  {subcontractor.Gqm_compliance || "—"}
                </Badge>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-bold">GQM Best Service Training</Label>
                <Badge
                  variant={String(subcontractor.Gqm_best_service_training) === "Active" ? "default" : "secondary"}
                  className={`${String(subcontractor.Gqm_best_service_training) === "Active" ? "bg-green-500 hover:bg-green-600" : ""} text-base px-3 py-1`}
                >
                  {subcontractor.Gqm_best_service_training || "—"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card>
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
                <p className="text-xs text-blue-700 mt-1">Formula + approved change orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
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
              <>
                <div className="space-y-4">
                  {loadingOrders ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="rounded-lg border p-4 space-y-4 animate-pulse">
                          <div className="flex items-center justify-between">
                            <div className="h-6 bg-gray-200 rounded w-48" />
                            <div className="h-8 w-24 bg-gray-200 rounded" />
                          </div>
                          <div className="grid gap-4 md:grid-cols-3 p-4 bg-gray-50 rounded-lg">
                            <div className="h-6 bg-gray-200 rounded w-full" />
                            <div className="h-6 bg-gray-200 rounded w-full" />
                            <div className="h-6 bg-gray-200 rounded w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No orders assigned to this subcontractor yet</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div key={order.ID_Order} className="rounded-lg border p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-lg">{order.Title || "Order"}</h4>
                            <p className="text-sm text-muted-foreground">{order.ID_Order}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCreateChangeOrder(order)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Change Order
                            </Button>

                            <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                              View Details
                            </Button>

                            <Button
                              variant="destructive"
                              size="icon"
                              title="Delete order"
                              onClick={() => {
                                setTargetOrderForDelete(order)
                                setDeleteOrderOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Formula</p>
                            <p className="text-lg font-semibold">${(order.Formula || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Adj. Formula</p>
                            <p className="text-lg font-semibold">${(order.Adj_formula || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Items</p>
                            <p className="text-lg font-semibold">{order.Items?.length || 0}</p>
                          </div>
                        </div>

                        {(order.change_orders ?? order.changeOrders ?? []).map((co: any) => (
                          <div
                            key={co.ID_ChangeOrder || `${co.ID_Order}-${co.podio_field || Math.random()}`}
                            className="flex items-start justify-between gap-4 rounded-md border p-3 bg-white"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div className="font-semibold truncate">
                                  {co.ID_ChangeOrder || "—"} {co.Name ? `— ${co.Name}` : ""}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1 break-words">
                                {co.Description || "No description"}
                              </div>
                            </div>

                            <div className="flex items-start gap-3 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-lg font-semibold">
                                  ${Number(co.ChangeOrderFormula || 0).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{co.State || ""}</div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit"
                                  onClick={() => {
                                    setTargetOrderForCh(order)
                                    setTargetChangeOrder(co)
                                    setEditChOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Delete"
                                  onClick={() => {
                                    setTargetOrderForCh(order)
                                    setTargetChangeOrder(co)
                                    setDeleteChOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                <OrderDetailsDialog
                  order={selectedOrder}
                  open={!!selectedOrder}
                  onOpenChange={(open) => !open && setSelectedOrder(null)}
                />

                <DeleteOrderDialog
                  open={deleteOrderOpen}
                  onOpenChange={(open) => {
                    setDeleteOrderOpen(open)
                    if (!open) setTargetOrderForDelete(null)
                  }}
                  order={targetOrderForDelete}
                  defaultSyncPodio={defaultSyncPodio}
                  jobYearForPodioSync={jobYearForPodioSync}
                  onDeleted={fetchOrdersForJobAndSub}
                  jobPodioId={jobPodioId}
                  subcontractorId={subcontractor?.ID_Subcontractor ?? ""}
                />

                {/* ── Create Change Order ──────────────────────────────────── */}
                {targetOrderForCh?.ID_Order && (
                  <CreateChangeOrderDialog
                    open={createChOpen}
                    onOpenChange={(v) => {
                      setCreateChOpen(v)
                      if (!v) setTargetOrderForCh(null)
                    }}
                    jobId={String(jobId)}
                    jobPodioId={jobPodioId}
                    orderId={String(targetOrderForCh.ID_Order)}
                    defaultSyncPodio={defaultSyncPodio}
                    jobYearForPodioSync={jobYearForPodioSync}
                    onCreated={async () => {
                      // Adj_formula is now updated automatically by the backend.
                      // Just reload the orders to reflect the new values.
                      await fetchOrdersForJobAndSub()
                    }}
                  />
                )}

                {/* ── Edit Change Order ────────────────────────────────────── */}
                {targetOrderForCh?.ID_Order && targetChangeOrder?.ID_ChangeOrder && (
                  <CreateChangeOrderDialog
                    open={editChOpen}
                    onOpenChange={(v) => {
                      setEditChOpen(v)
                      if (!v) setTargetChangeOrder(null)
                    }}
                    mode="edit"
                    changeOrderId={String(targetChangeOrder.ID_ChangeOrder)}
                    jobId={String(jobId)}
                    jobPodioId={jobPodioId}
                    orderId={String(targetOrderForCh.ID_Order)}
                    defaultSyncPodio={defaultSyncPodio}
                    jobYearForPodioSync={jobYearForPodioSync}
                    initialData={{
                      Name:               targetChangeOrder.Name,
                      Description:        targetChangeOrder.Description,
                      ChangeOrderFormula: targetChangeOrder.ChangeOrderFormula,
                      State:              targetChangeOrder.State,
                    }}
                    onUpdated={async () => {
                      // Adj_formula is now updated automatically by the backend.
                      await fetchOrdersForJobAndSub()
                    }}
                  />
                )}

                {/* ── Delete Change Order ──────────────────────────────────── */}
                {targetChangeOrder?.ID_ChangeOrder && (
                  <DeleteChangeOrderDialog
                    open={deleteChOpen}
                    onOpenChange={(v) => {
                      setDeleteChOpen(v)
                      if (!v) setTargetChangeOrder(null)
                    }}
                    changeOrderId={String(targetChangeOrder.ID_ChangeOrder)}
                    changeOrderName={targetChangeOrder.Name || undefined}
                    defaultSyncPodio={defaultSyncPodio}
                    jobYearForPodioSync={jobYearForPodioSync}
                    onDeleted={async () => {
                      // Adj_formula is now updated automatically by the backend.
                      await fetchOrdersForJobAndSub()
                    }}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}