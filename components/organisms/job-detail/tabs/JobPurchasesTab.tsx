"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingCart, Plus, Trash2, ExternalLink, RefreshCcw, Loader2,
  AlertCircle, Search, X, Package, ChevronLeft, ChevronRight,
  Tag, ClipboardList, DollarSign, CheckCircle2, Clock, XCircle,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  "Completed": { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  "Pending": { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
  "Cancelled": { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200", icon: <XCircle className="h-3 w-3" /> },
}

function StatusBadge({ status }: { status?: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? { label: status ?? "—", color: "bg-slate-50 text-slate-600 border-slate-200", icon: null }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

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
// Delete confirm inline
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
// Purchase row card
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

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md transition-all overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
          <ShoppingCart className="h-5 w-5 text-emerald-600" />
        </div>

        {/* Core info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-800">{purchase.ID_Purchase}</span>
            <StatusBadge status={purchase.Status} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500 truncate max-w-sm">
            {purchase.Description || <span className="italic">No description</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-slate-400">Orders</p>
            <p className="text-sm font-bold text-slate-700">{purchase.order_count ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Items</p>
            <p className="text-sm font-bold text-slate-700">{purchase.item_count ?? 0}</p>
          </div>
          {purchase.Total_spending != null && (
            <div className="text-center">
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-sm font-bold text-emerald-700">{money(purchase.Total_spending)}</p>
            </div>
          )}
        </div>

        {/* Selling rep avatar */}
        {purchase.Selling_rep && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${avatarColor(purchase.ID_Member)}`}>
              {initials(purchase.Selling_rep)}
            </div>
            <span className="text-xs text-slate-600 truncate max-w-[100px]">{purchase.Selling_rep}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
            title="Toggle details"
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
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Return Status</p>
            <p className="text-xs text-slate-700">{purchase.Return_status || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Member ID</p>
            <p className="text-xs font-mono text-slate-700">{purchase.ID_Member || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Orders / Items</p>
            <p className="text-xs text-slate-700">{purchase.order_count ?? 0} orders · {purchase.item_count ?? 0} items</p>
          </div>
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
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const dq = useDebounce(q, 350)

  const LIMIT = 10
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async (p: number, search: string, status: string) => {
    if (!jobId) return
    abortRef.current?.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({
        page: String(p),
        limit: String(LIMIT),
        job_id: jobId,
      })
      if (search) qs.set("q", search)
      if (status) qs.set("status", status)

      const res = await fetch(`/api/purchases/table?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setPurchases(Array.isArray(data.results) ? data.results : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
      setPage(p)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError("Could not load purchases for this job.")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load(1, dq, statusFilter) }, [dq, statusFilter, load])

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/purchases/${id}`, { method: "DELETE", cache: "no-store" })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    load(page, dq, statusFilter)
  }

  const handleCreateNew = () => {
    const returnTo = encodeURIComponent(`/jobs/${jobId}?tab=purchases`)
    router.push(`/purchases/create?job_id=${encodeURIComponent(jobId)}&returnTo=${returnTo}`)
  }

  const handleOpenPurchase = (id: string) => {
    const returnTo = encodeURIComponent(`/jobs/${jobId}?tab=purchases`)
    router.push(`/purchases/${id}?returnTo=${returnTo}`)
  }

  // Computed summary stats
  const totalSpending = purchases.reduce((a, p) => a + (p.Total_spending ?? 0), 0)
  const totalOrders = purchases.reduce((a, p) => a + (p.order_count ?? 0), 0)
  const totalItems = purchases.reduce((a, p) => a + (p.item_count ?? 0), 0)

  const STATUS_OPTIONS = ["", "In Progress", "Completed", "Pending", "Cancelled"]

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
            <ShoppingCart className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Purchases</h2>
            <p className="text-xs text-slate-400">{total} purchase{total !== 1 ? "s" : ""} linked to this job</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page, dq, statusFilter)}
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
            sub="sum of all purchases"
            color={totalSpending > 0 ? "text-emerald-700" : undefined}
          />
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s || "all"}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${statusFilter === s
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
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
            onClick={() => load(1, dq, statusFilter)}
            className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : purchases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Package className="mx-auto mb-3 h-9 w-9 text-slate-200" />
          <p className="text-sm font-semibold text-slate-600">No purchases linked to this job</p>
          <p className="mt-1 text-xs text-slate-400">
            {q || statusFilter ? "Try adjusting your filters" : "Create a new purchase to get started"}
          </p>
          {!q && !statusFilter && userRole !== "LEAD_TECHNICIAN" && (
            <button
              onClick={handleCreateNew}
              className="mt-4 flex items-center gap-1.5 mx-auto rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Purchase
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pb-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
            </div>
          )}
          {purchases.map(p => (
            <PurchaseCard
              key={p.ID_Purchase}
              purchase={p}
              onOpen={handleOpenPurchase}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-xs text-slate-400">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1, dq, statusFilter)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1, dq, statusFilter)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}