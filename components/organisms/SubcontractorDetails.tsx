"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Package,
  Calendar,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  Calculator,
  Tag,
  Eye,
} from "lucide-react"
import { TechniciansTable } from "./TechniciansTable"
import { TechnicianDetails } from "./TechnicianDetails"
import { mockChangeOrders } from "@/lib/mock-data/change-orders"
import { OrderDetailsDialog } from "./OrderDetailsDialog"
import { CreateChangeOrderDialog } from "@/components/organisms/CreateChangeOrderDialog"
import { Pencil, Trash2 } from "lucide-react"
import { DeleteChangeOrderDialog } from "@/components/organisms/DeleteChangeOrderDialog"
import { DeleteOrderDialog } from "./DeleteJobOrderDialog"
import { EditOrderDialog } from "./EditOrderDialog"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "sonner"

// ── Components ───────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-500",
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconBg?: string
  iconColor?: string
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/30">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function FieldLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </label>
  )
}

function ReadonlyField({ value, placeholder = "—" }: { value: any; placeholder?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 min-h-[40px] flex items-center">
      {value || <span className="text-slate-300 italic font-normal">{placeholder}</span>}
    </div>
  )
}

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

function normalizeOrg(raw: any): string {
  if (raw === null || raw === undefined) return ""
  if (Array.isArray(raw)) return raw.map((r) => String(r).trim()).filter(Boolean).join(", ")
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
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) s = s.slice(1, -1).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1)
  s = s.replace(/^[\{\[\]"'\s]+|[\}\]\s"']+$/g, "").trim()
  return s
}

function normalizeEmails(raw: any): string[] {
  if (raw === null || raw === undefined) return []
  let s = Array.isArray(raw) ? raw.join(",") : String(raw)
  s = s.trim()
  if (!s) return []
  s = s.replace(/\\"/g, '"').replace(/\\'/g, "'")
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) s = s.slice(1, -1).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1)
  const parts = s.replace(/;/g, ",").split(",").map((p) => p.trim())
  const cleaned = parts.map((p) => p.replace(/^[\{\[\]"']+|[\}\]\s"']+$/g, "").trim()).filter(Boolean)
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
  const [activeSubTab, setActiveSubTab] = useState("orders")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false)

  // Dialog states
  const [createChOpen, setCreateChOpen] = useState(false)
  const [targetOrderForCh, setTargetOrderForCh] = useState<any | null>(null)
  const [editChOpen, setEditChOpen] = useState(false)
  const [deleteChOpen, setDeleteChOpen] = useState(false)
  const [targetChangeOrder, setTargetChangeOrder] = useState<any | null>(null)
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false)
  const [targetOrderForDelete, setTargetOrderForDelete] = useState<any | null>(null)
  const [editOrderOpen, setEditOrderOpen] = useState(false)
  const [targetOrderForEdit, setTargetOrderForEdit] = useState<any | null>(null)

  const fetchOrdersForJobAndSub = useCallback(async () => {
    try {
      setLoadingOrders(true)
      const subId = String(subcontractor?.ID_Subcontractor ?? "")
      const jId = String(jobId ?? "")
      if (!subId || !jId) {
        setOrders([])
        return
      }
      const res = await apiFetch(`/api/order?ID_Jobs=${jId}&ID_Subcontractor=${subId}`, { cache: "no-store" })
      if (!res.ok) {
        setOrders([])
        return
      }
      const data = await res.json()
      let ordersData: any[] = Array.isArray(data) ? data : data.results || data.items || data.data || []
      const mapped = ordersData.map((o) => ({
        ...o,
        Items: o.estimate_costs ?? o.Items ?? o.items ?? [],
        Formula: o.Formula ?? o.formula ?? 0,
        Adj_formula: o.Adj_formula ?? o.adj_formula ?? 0,
        change_orders: o.change_orders ?? o.changeOrders ?? [],
      }))
      setOrders(mapped)
    } catch (error) {
      console.error("Error fetching orders:", error)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }, [subcontractor?.ID_Subcontractor, jobId])

  useEffect(() => {
    fetchOrdersForJobAndSub()
  }, [fetchOrdersForJobAndSub])

  const handleEditOrderSubmit = async (orderId: string, orderName: string, selectedItemIds: string[], syncPodioOverride: boolean) => {
    try {
      const currentItems = targetOrderForEdit?.Items || []
      const currentItemIds = currentItems.map((i: any) => String(i.ID_EstimateItem || i.ID_EstimateCost || i.id || i.ID)).filter(Boolean)
      const itemsToAdd = selectedItemIds.filter(id => !currentItemIds.includes(id))
      const itemsToRemove = currentItemIds.filter((id: string) => !selectedItemIds.includes(id))

      await Promise.all(itemsToRemove.map((id: string) => 
        apiFetch(`/api/estimate/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ID_Order: null })
        })
      ))
      await Promise.all(itemsToAdd.map((id: string) => 
        apiFetch(`/api/estimate/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ID_Order: orderId })
        })
      ))

      const qs = new URLSearchParams()
      qs.set("sync_podio", syncPodioOverride ? "true" : "false")
      if (syncPodioOverride && jobYearForPodioSync) qs.set("year", String(jobYearForPodioSync))

      const orderRes = await apiFetch(`/api/order/${orderId}?${qs.toString()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Title: orderName })
      })

      if (!orderRes.ok) throw new Error("Failed to update order")
      toast.success("Order updated successfully")
      await fetchOrdersForJobAndSub()
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
      throw error
    }
  }

  const formula = orders.reduce((sum, order) => sum + (order.Formula || 0), 0)
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

  const orgText = normalizeOrg(subcontractor.Organization)
  const emails = normalizeEmails(subcontractor.Email_Address ?? "")

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="h-10 w-10 p-0 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gqm-yellow/10 text-gqm-yellow-600 ring-2 ring-gqm-yellow/20">
              <UserIcon className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-800 leading-tight">{subcontractor.Name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider">{subcontractor.ID_Subcontractor}</span>
                <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 rounded-full border-slate-200 text-slate-400 uppercase">Linked</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
            <Badge
              className={`${subcontractor.Status === "Active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"} h-7 rounded-lg border px-3 text-xs font-bold uppercase shadow-none`}
            >
              {subcontractor.Status ?? "—"}
            </Badge>
          </div>
          <div className="h-10 w-px bg-slate-200 mx-2 hidden sm:block" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Experience Score</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-lg">
              <CheckCircle className="h-4 w-4 text-gqm-yellow-600" />
              {subcontractor.Score ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Information Section */}
        <div className="space-y-6">
          <SectionCard icon={Building2} iconBg="bg-blue-100" iconColor="text-blue-600" title="Organization Details">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel icon={Building2}>Organization Name</FieldLabel>
                <ReadonlyField value={orgText} />
              </div>
              <div>
                <FieldLabel icon={Globe}>Website</FieldLabel>
                {subcontractor.Organization_Website ? (
                  <a href={`https://${subcontractor.Organization_Website}`} target="_blank" className="block rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2.5 text-sm font-semibold text-blue-600 hover:underline truncate transition-colors">
                    {subcontractor.Organization_Website}
                  </a>
                ) : <ReadonlyField value={null} />}
              </div>
            </div>
            <div>
              <FieldLabel icon={MapPin}>Address</FieldLabel>
              <ReadonlyField value={subcontractor.Address} />
            </div>
          </SectionCard>

          <SectionCard icon={Mail} iconBg="bg-indigo-100" iconColor="text-indigo-600" title="Contact Information">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel icon={Mail}>Email Addresses</FieldLabel>
                {emails.length > 0 ? (
                  <div className="space-y-1.5">
                    {emails.map((e, i) => (
                      <a key={i} href={`mailto:${e}`} className="block rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 truncate transition-colors">
                        {e}
                      </a>
                    ))}
                  </div>
                ) : <ReadonlyField value={null} />}
              </div>
              <div>
                <FieldLabel icon={Phone}>Phone Number</FieldLabel>
                <ReadonlyField value={subcontractor.Phone_Number} />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={CheckCircle} iconBg="bg-emerald-100" iconColor="text-emerald-600" title="Certifications & Compliance">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>GQM Compliance</FieldLabel>
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${subcontractor.Gqm_compliance === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
                  <CheckCircle className={`h-4 w-4 ${subcontractor.Gqm_compliance === "Active" ? "text-emerald-500" : "text-slate-300"}`} />
                  {subcontractor.Gqm_compliance || "—"}
                </div>
              </div>
              <div>
                <FieldLabel>GQM Best Service Training</FieldLabel>
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${subcontractor.Gqm_best_service_training === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
                  <Layers className={`h-4 w-4 ${subcontractor.Gqm_best_service_training === "Active" ? "text-emerald-500" : "text-slate-300"}`} />
                  {subcontractor.Gqm_best_service_training || "—"}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Pricing & Orders Section */}
        <div className="space-y-6">
          <SectionCard icon={Calculator} iconBg="bg-violet-100" iconColor="text-violet-600" title="Financial Summary">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100 relative overflow-hidden group">
                <Calculator className="absolute -right-4 -top-4 h-16 w-16 text-violet-100 group-hover:text-violet-200 transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Formula</span>
                <div className="text-2xl font-black text-violet-700 tabular-nums my-1">${formula.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <p className="text-[10px] text-violet-400 font-medium">Base costs sum</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden group">
                <Tag className="absolute -right-4 -top-4 h-16 w-16 text-emerald-100 group-hover:text-emerald-200 transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Adj. Formula</span>
                <div className="text-2xl font-black text-emerald-700 tabular-nums my-1">${adjFormula.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <p className="text-[10px] text-emerald-400 font-medium whitespace-nowrap">Costs + approved COs</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Package} iconBg="bg-slate-100" iconColor="text-slate-600" title="Purchase Orders">
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-50 animate-pulse border border-slate-100" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
                  <Package className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-semibold uppercase tracking-widest opacity-50">No orders assigned</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.ID_Order} className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-gqm-green/30 hover:shadow-md transition-all">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 group-hover:bg-white transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500 font-bold text-xs ring-1 ring-slate-300">
                          {order.ID_Order.slice(-3).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-700 leading-none">{order.Title || "Standard Order"}</h4>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">{order.ID_Order}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 transition-opacity">
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          onClick={() => { setTargetOrderForEdit(order); setEditOrderOpen(true); }}
                        ><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          onClick={() => setSelectedOrder(order)}
                        ><Eye className="h-3.5 w-3.5" /></Button>
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                          onClick={() => { setTargetOrderForDelete(order); setDeleteOrderOpen(true); }}
                        ><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-2 py-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Formula</span>
                          <span className="font-bold text-slate-600 tabular-nums text-base">${(order.Formula || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Adj. Formula</span>
                          <span className="font-black text-slate-800 tabular-nums text-base">${(order.Adj_formula || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Items</span>
                          <Badge variant="secondary" className="h-5 px-2 text-[11px] font-bold rounded-lg border-none bg-slate-100 text-slate-600">{order.Items?.length || 0}</Badge>
                        </div>
                      </div>

                      {/* Change Orders Mini List */}
                      {order.change_orders?.length > 0 && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="p-1 rounded bg-amber-50 text-amber-600">
                              <Layers className="h-2.5 w-2.5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Change Orders</span>
                          </div>
                          <div className="space-y-2">
                            {order.change_orders.map((co: any) => (
                              <div key={co.ID_ChangeOrder} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-amber-200 hover:shadow-sm transition-all group/co">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)] flex-shrink-0" />
                                  <span className="text-xs font-bold text-slate-600 truncate">{co.Name || co.ID_ChangeOrder}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <span className="text-xs font-black text-slate-700 tabular-nums">${Number(co.ChangeOrderFormula || 0).toFixed(2)}</span>
                                  <div className="flex gap-1 transition-opacity">
                                    <button onClick={() => { setTargetOrderForCh(order); setTargetChangeOrder(co); setEditChOpen(true); }} className="text-slate-300 hover:text-amber-600 p-0.5"><Pencil className="h-3 w-3" /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { setTargetOrderForCh(order); setCreateChOpen(true); }}
                        className="w-full h-9 border border-dashed border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 rounded-xl"
                      >
                        <Plus className="h-3.5 w-3.5 mr-2" /> Add Change Order
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <OrderDetailsDialog order={selectedOrder} open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)} />
      <DeleteOrderDialog open={deleteOrderOpen} onOpenChange={(v) => { setDeleteOrderOpen(v); if (!v) setTargetOrderForDelete(null); }} order={targetOrderForDelete} defaultSyncPodio={defaultSyncPodio} jobYearForPodioSync={jobYearForPodioSync} onDeleted={fetchOrdersForJobAndSub} jobPodioId={jobPodioId} subcontractorId={subcontractor?.ID_Subcontractor ?? ""} />
      <EditOrderDialog open={editOrderOpen} onOpenChange={(v) => { setEditOrderOpen(v); if (!v) setTargetOrderForEdit(null); }} order={targetOrderForEdit} items={estimateCosts} subcontractors={[subcontractor]} defaultSyncPodio={defaultSyncPodio} jobYearForPodioSync={jobYearForPodioSync} onEditOrder={handleEditOrderSubmit} />
      
      {/* Change Order Dialogs */}
      {targetOrderForCh?.ID_Order && (
        <CreateChangeOrderDialog
          open={createChOpen}
          onOpenChange={(v) => { setCreateChOpen(v); if (!v) setTargetOrderForCh(null); }}
          jobId={String(jobId)} jobPodioId={jobPodioId} orderId={String(targetOrderForCh.ID_Order)} defaultSyncPodio={defaultSyncPodio} jobYearForPodioSync={jobYearForPodioSync}
          onCreated={fetchOrdersForJobAndSub}
        />
      )}
      {targetOrderForCh?.ID_Order && targetChangeOrder?.ID_ChangeOrder && (
        <CreateChangeOrderDialog
          open={editChOpen}
          onOpenChange={(v) => { setEditChOpen(v); if (!v) setTargetChangeOrder(null); }}
          mode="edit" changeOrderId={String(targetChangeOrder.ID_ChangeOrder)} jobId={String(jobId)} jobPodioId={jobPodioId} orderId={String(targetOrderForCh.ID_Order)} defaultSyncPodio={defaultSyncPodio} jobYearForPodioSync={jobYearForPodioSync}
          initialData={{ Name: targetChangeOrder.Name, Description: targetChangeOrder.Description, ChangeOrderFormula: targetChangeOrder.ChangeOrderFormula, State: targetChangeOrder.State }}
          onUpdated={fetchOrdersForJobAndSub}
        />
      )}
      {targetChangeOrder?.ID_ChangeOrder && (
        <DeleteChangeOrderDialog
          open={deleteChOpen}
          onOpenChange={(v) => { setDeleteChOpen(v); if (!v) setTargetChangeOrder(null); }}
          changeOrderId={String(targetChangeOrder.ID_ChangeOrder)} changeOrderName={targetChangeOrder.Name || undefined} defaultSyncPodio={defaultSyncPodio} jobYearForPodioSync={jobYearForPodioSync}
          onDeleted={fetchOrdersForJobAndSub}
        />
      )}
    </div>
  )
}