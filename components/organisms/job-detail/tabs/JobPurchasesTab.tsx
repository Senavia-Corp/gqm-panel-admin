"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingCart, Plus, Trash2, ExternalLink, RefreshCcw, Loader2,
  AlertCircle, Search, X, Package,
  Tag, ClipboardList, CheckCircle2, Clock, XCircle,
  ChevronDown, Eye,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type PurchaseRow = {
  ID_Purchase: string
  Selling_rep?: string | null
  Description?: string | null
  PickUp_person?: string | null
  Delivery_location?: string | null
  Status?: string | null
  Return_request?: string | null
  Return_status?: string | null
  Total_spending?: number | null
  ID_Jobs?: string | null
  ID_Member?: string | null
  order_count?: number
  item_count?: number
}

type FullItem = {
  ID_PurchaseOrderItem?: string | null
  Name?: string | null
  Quote_shop?: string | null
  Quote_link?: string | null
  Quote_value?: number | null
  Quote_notes?: string | null
  Purchase_shop?: string | null
  Purchase_link?: string | null
  Purchase_value?: number | null
  Purchase_notes?: string | null
}

type FullOrder = {
  ID_PurchaseOrder?: string | null
  Order_title?: string | null
  porder_items?: FullItem[] | null
}

type FullPurchase = {
  purchase_orders?: FullOrder[] | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const money = (v: number | null | undefined) =>
  v != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)
    : "—"

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "In Progress": { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200", icon: <Clock className="h-3 w-3" /> },
  "Completed":   { label: "Completed",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  "Pending":     { label: "Pending",     color: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
  "Cancelled":   { label: "Cancelled",   color: "bg-red-50 text-red-600 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  "In Review":   { label: "In Review",   color: "bg-violet-50 text-violet-700 border-violet-200", icon: <Eye className="h-3 w-3" /> },
  "Approved":    { label: "Approved",    color: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="h-3 w-3" /> },
}

const SECTIONS = [
  {
    key: "pending",
    label: "Pending",
    description: "Quoted — not yet reviewed",
    statuses: ["Pending"],
    headerColor: "bg-amber-50 border-amber-200 hover:bg-amber-100/60",
    badgeColor: "bg-amber-100 text-amber-700",
    emptyColor: "text-amber-400",
  },
  {
    key: "inreview",
    label: "In Review",
    description: "Submitted to the purchasing department",
    statuses: ["In Review"],
    headerColor: "bg-violet-50 border-violet-200 hover:bg-violet-100/60",
    badgeColor: "bg-violet-100 text-violet-700",
    emptyColor: "text-violet-400",
  },
  {
    key: "active",
    label: "Approved / In Progress",
    description: "Approved or active purchases",
    statuses: ["Approved", "In Progress"],
    headerColor: "bg-blue-50 border-blue-200 hover:bg-blue-100/60",
    badgeColor: "bg-blue-100 text-blue-700",
    emptyColor: "text-blue-400",
  },
  {
    key: "completed",
    label: "Completed",
    description: "Finalized and confirmed purchases",
    statuses: ["Completed"],
    headerColor: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/60",
    badgeColor: "bg-emerald-100 text-emerald-700",
    emptyColor: "text-emerald-400",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    description: "Purchases that were not executed",
    statuses: ["Cancelled"],
    headerColor: "bg-red-50 border-red-200 hover:bg-red-100/60",
    badgeColor: "bg-red-100 text-red-600",
    emptyColor: "text-red-400",
  },
] as const

type Section = typeof SECTIONS[number]

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? {
    label: status ?? "—",
    color: "bg-slate-50 text-slate-600 border-slate-200",
    icon: null,
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar helpers
// ─────────────────────────────────────────────────────────────────────────────
function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase()
}
const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
]
function avatarColor(id?: string | null) {
  if (!id) return AVATAR_COLORS[0]
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// DeleteButton
// ─────────────────────────────────────────────────────────────────────────────
function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const handleDelete = async () => {
    setLoading(true)
    try { await onDelete() }
    finally { setLoading(false); setConfirm(false) }
  }
  if (confirm) return (
    <div className="flex items-center gap-1">
      <button onClick={handleDelete} disabled={loading}
        className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
      </button>
      <button onClick={() => setConfirm(false)}
        className="rounded-lg px-2 py-1 text-[11px] border border-slate-200 text-slate-500 hover:bg-slate-50">
        Cancel
      </button>
    </div>
  )
  return (
    <button onClick={() => setConfirm(true)}
      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary cards
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced PurchaseCard with lazy order/item details
// ─────────────────────────────────────────────────────────────────────────────
function PurchaseCard({
  purchase,
  onOpen,
  onDelete,
}: {
  purchase: PurchaseRow
  onOpen: (id: string) => void
  onDelete: (id: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [fullData, setFullData] = useState<FullPurchase | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && !fullData) {
      setLoadingFull(true)
      try {
        const res = await apiFetch(`/api/purchases/${purchase.ID_Purchase}`, { cache: "no-store" })
        if (res.ok) setFullData(await res.json())
      } finally {
        setLoadingFull(false)
      }
    }
  }

  const orders = fullData?.purchase_orders ?? []
  const allItems = orders.flatMap(o => o.porder_items ?? [])
  const totalQuoted = allItems.reduce((a, it) => a + (it.Quote_value ?? 0), 0)
  const totalPurchased = allItems.reduce((a, it) => a + (it.Purchase_value ?? 0), 0)

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md transition-all overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
          <ShoppingCart className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold text-slate-800 truncate max-w-xs">
              {purchase.Description || <span className="italic text-slate-400">No description</span>}
            </span>
            <StatusBadge status={purchase.Status} />
          </div>
          <p className="mt-0.5 text-[11px] font-mono text-slate-400">
            {purchase.ID_Purchase}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-slate-400">Orders</p>
            <p className="text-sm font-bold text-slate-700">{purchase.order_count ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Items</p>
            <p className="text-sm font-bold text-slate-700">{purchase.item_count ?? 0}</p>
          </div>
          {(purchase.Total_spending ?? 0) > 0 && (
            <div className="text-center">
              <p className="text-xs text-slate-400">Spending</p>
              <p className="text-sm font-bold text-emerald-700">{money(purchase.Total_spending)}</p>
            </div>
          )}
        </div>

        {purchase.Selling_rep && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${avatarColor(purchase.ID_Member)}`}>
              {initials(purchase.Selling_rep)}
            </div>
            <span className="text-xs text-slate-600 truncate max-w-[100px]">{purchase.Selling_rep}</span>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleExpand}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
            title="View details"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => onOpen(purchase.ID_Purchase)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            title="Open purchase"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <DeleteButton onDelete={() => onDelete(purchase.ID_Purchase)} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Basic info grid */}
          <div className="bg-slate-50/50 px-5 py-3 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Pick Up Person</p>
              <p className="text-xs text-slate-700">{purchase.PickUp_person || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Delivery Location</p>
              <p className="text-xs text-slate-700">{purchase.Delivery_location || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Return Request</p>
              <p className="text-xs text-slate-700">{purchase.Return_request || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Member ID</p>
              <p className="text-xs font-mono text-slate-700">{purchase.ID_Member || "—"}</p>
            </div>
          </div>

          {/* Orders and items */}
          <div className="px-5 py-4">
            {loadingFull ? (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading orders and items…
              </div>
            ) : orders.length === 0 && fullData ? (
              <p className="text-xs text-slate-400 italic py-2">No orders in this purchase</p>
            ) : orders.length > 0 ? (
              <div className="space-y-3">
                {/* Summary totals */}
                {allItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="text-slate-500 font-medium">{allItems.length} item{allItems.length !== 1 ? "s" : ""}</span>
                    <span className="text-slate-500">Total quoted: <strong className="text-slate-700">{money(totalQuoted)}</strong></span>
                    {totalPurchased > 0 && (
                      <span className="text-slate-500">Total purchased: <strong className="text-emerald-700">{money(totalPurchased)}</strong></span>
                    )}
                  </div>
                )}

                {/* Orders */}
                {orders.map(order => {
                  const items = order.porder_items ?? []
                  const ordQuoted = items.reduce((a, it) => a + (it.Quote_value ?? 0), 0)
                  return (
                    <div key={order.ID_PurchaseOrder} className="rounded-xl border border-slate-200 overflow-hidden">
                      {/* Order header */}
                      <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                        <ClipboardList className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 truncate">{order.Order_title || "Untitled"}</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {order.ID_PurchaseOrder} · {items.length} item{items.length !== 1 ? "s" : ""} · Quoted: {money(ordQuoted)}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      {items.length === 0 ? (
                        <p className="text-xs text-slate-400 italic px-4 py-3">No items</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {items.map(item => (
                            <div key={item.ID_PurchaseOrderItem} className="px-4 py-3">
                              <div className="flex items-start gap-3">
                                <Tag className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-800">{item.Name}</p>
                                  <div className="mt-2 grid grid-cols-2 gap-3">
                                    {/* Quote column */}
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Quote</p>
                                      <p className="text-sm font-bold text-slate-700">{money(item.Quote_value)}</p>
                                      <p className="text-[11px] text-slate-500">{item.Quote_shop || "—"}</p>
                                      {item.Quote_link && (
                                        <a href={item.Quote_link} target="_blank" rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5">
                                          View link <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                      )}
                                      {item.Quote_notes && (
                                        <div className="mt-1.5 rounded-md bg-amber-50 border border-amber-100 px-2.5 py-1.5">
                                          <p className="text-[10px] font-semibold uppercase text-amber-600 mb-0.5">Quote notes</p>
                                          <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{item.Quote_notes}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Purchase column */}
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Actual Purchase</p>
                                      {(item.Purchase_value ?? 0) > 0 ? (
                                        <>
                                          <p className="text-sm font-bold text-emerald-700">{money(item.Purchase_value)}</p>
                                          <p className="text-[11px] text-slate-500">{item.Purchase_shop || "—"}</p>
                                          {item.Purchase_link && (
                                            <a href={item.Purchase_link} target="_blank" rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5">
                                              View link <ExternalLink className="h-2.5 w-2.5" />
                                            </a>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-xs italic text-slate-300">Pending</p>
                                      )}
                                      {item.Purchase_notes && (
                                        <div className="mt-1.5 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5">
                                          <p className="text-[10px] font-semibold uppercase text-blue-600 mb-0.5">Purchase notes</p>
                                          <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{item.Purchase_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section accordion
// ─────────────────────────────────────────────────────────────────────────────
function PurchaseSection({
  section,
  purchases,
  onOpen,
  onDelete,
}: {
  section: Section
  purchases: PurchaseRow[]
  onOpen: (id: string) => void
  onDelete: (id: string) => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(purchases.length === 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-center justify-between px-5 py-4 border-b transition-colors ${section.headerColor}`}
      >
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${section.badgeColor}`}>
            {purchases.length}
          </span>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">{section.label}</p>
            <p className="text-[11px] text-slate-500">{section.description}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${collapsed ? "" : "rotate-180"}`} />
      </button>

      {!collapsed && (
        <div className="p-4 space-y-2.5">
          {purchases.length === 0 ? (
            <p className="text-center text-xs text-slate-400 italic py-4">No purchases in this status</p>
          ) : (
            purchases.map(p => (
              <PurchaseCard
                key={p.ID_Purchase}
                purchase={p}
                onOpen={onOpen}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tab component
// ─────────────────────────────────────────────────────────────────────────────
export function JobPurchasesTab({ jobId, userRole }: { jobId: string; userRole?: string }) {
  const router = useRouter()

  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const dq = useDebounce(q, 350)
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async (search: string) => {
    if (!jobId) return
    abortRef.current?.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({ page: "1", limit: "200", job_id: jobId })
      if (search) qs.set("q", search)
      const res = await apiFetch(`/api/purchases/table?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const results: PurchaseRow[] = Array.isArray(data.results) ? data.results : []
      setPurchases(results)
      setTotal(typeof data.total === "number" ? data.total : results.length)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError("Could not load purchases for this job.")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load(dq) }, [dq, load])

  const handleDelete = async (id: string) => {
    const res = await apiFetch(`/api/purchases/${id}`, { method: "DELETE", cache: "no-store" })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    setPurchases(prev => prev.filter(p => p.ID_Purchase !== id))
    setTotal(prev => prev - 1)
  }

  const handleCreateNew = () => {
    const returnTo = encodeURIComponent(`/jobs/${jobId}?tab=purchases`)
    router.push(`/purchases/create?job_id=${encodeURIComponent(jobId)}&returnTo=${returnTo}`)
  }

  const handleOpenPurchase = (id: string) => {
    const returnTo = encodeURIComponent(`/jobs/${jobId}?tab=purchases`)
    router.push(`/purchases/${id}?returnTo=${returnTo}`)
  }

  // Group into sections
  const grouped = SECTIONS.map(section => ({
    section,
    purchases: purchases.filter(p => (section.statuses as readonly string[]).includes(p.Status ?? "")),
  }))

  // Summary
  const totalOrders = purchases.reduce((a, p) => a + (p.order_count ?? 0), 0)
  const totalItems = purchases.reduce((a, p) => a + (p.item_count ?? 0), 0)
  const totalSpending = purchases.reduce((a, p) => a + (p.Total_spending ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Purchases</h2>
            <p className="text-xs text-slate-400">{total} purchase{total !== 1 ? "s" : ""} linked to this job</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(dq)}
            className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {userRole !== "LEAD_TECHNICIAN" && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> New Purchase
            </button>
          )}
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Purchases" value={total} sub="linked to job" />
          <SummaryCard label="Orders" value={totalOrders} sub="across all purchases" />
          <SummaryCard label="Items" value={totalItems} sub="total line items" />
          <SummaryCard
            label="Total Spending"
            value={totalSpending > 0 ? money(totalSpending) : "—"}
            sub="sum of confirmed purchases"
            color={totalSpending > 0 ? "text-emerald-700" : undefined}
          />
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search purchases…"
          className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading && purchases.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
          <p className="text-sm font-semibold text-slate-700">Could not load purchases</p>
          <p className="mt-1 text-xs text-red-500">{error}</p>
          <button
            onClick={() => load(dq)}
            className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : total === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Package className="mx-auto mb-3 h-9 w-9 text-slate-200" />
          <p className="text-sm font-semibold text-slate-600">No purchases linked to this job</p>
          <p className="mt-1 text-xs text-slate-400">
            {q ? "Try adjusting your search" : "Create a new purchase to get started"}
          </p>
          {!q && userRole !== "LEAD_TECHNICIAN" && (
            <button
              onClick={handleCreateNew}
              className="mt-4 flex items-center gap-1.5 mx-auto rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Purchase
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pb-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
            </div>
          )}
          {grouped.map(({ section, purchases: sectionPurchases }) => (
            <PurchaseSection
              key={section.key}
              section={section}
              purchases={sectionPurchases}
              onOpen={handleOpenPurchase}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
