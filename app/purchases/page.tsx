"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import {
  Search, Plus, Eye, Trash2, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, AlertCircle, ShoppingCart,
  Package, DollarSign, User, MapPin, RotateCcw, X,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseRow = {
  ID_Purchase:       string
  Selling_rep?:      string | null
  Description?:      string | null
  PickUp_person?:    string | null
  Delivery_location?:string | null
  Status?:           string | null
  Return_request?:   string | null
  Return_status?:    string | null
  Total_spending?:   number | null
  ID_Jobs?:          string | null
  ID_Member?:        string | null
  podio_item_id?:    string | null
  order_count:       number
  item_count:        number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const asStr = (v: unknown) => (v == null ? "" : String(v))

function fmtMoney(v: number | null | undefined) {
  if (v == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
}

function useDebounce<T>(value: T, delay = 350): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs italic text-slate-400">—</span>
  const map: Record<string, string> = {
    "Completed":   "bg-emerald-100 text-emerald-700 border-emerald-200",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
    "Pending":     "bg-amber-100 text-amber-700 border-amber-200",
    "Cancelled":   "bg-red-100 text-red-600 border-red-200",
    "In Review":   "bg-violet-100 text-violet-700 border-violet-200",
    "Approved":    "bg-teal-100 text-teal-700 border-teal-200",
  }
  const cls = map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  )
}

function ReturnBadge({ status }: { status?: string | null }) {
  if (!status) return null
  const cls = status === "Approved"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : status === "Rejected"
      ? "bg-red-100 text-red-600 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <RotateCcw className="h-2.5 w-2.5" />{status}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5 align-middle">
          <div className="h-3.5 animate-pulse rounded-full bg-slate-100" style={{ width: `${50 + (i % 4) * 15}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeletePurchaseDialog({
  purchase, onClose, onDeleted,
}: { purchase: PurchaseRow | null; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!purchase) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/purchases/${purchase.ID_Purchase}`, {
        method: "DELETE", cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? `Error ${res.status}`)
      }
      toast({ title: "Purchase deleted", description: `${purchase.ID_Purchase} was removed.` })
      onDeleted()
    } catch (e: any) {
      toast({ title: "Error deleting", description: e?.message, variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!purchase} onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[90vw] !max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" /> Delete Purchase
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the purchase and all its associated orders and items. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {purchase && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-red-800">{purchase.ID_Purchase}</span>
              <StatusBadge status={purchase.Status} />
            </div>
            {purchase.Selling_rep && (
              <p className="flex items-center gap-1.5 text-xs text-red-700">
                <User className="h-3 w-3" />{purchase.Selling_rep}
              </p>
            )}
            {purchase.Description && (
              <p className="text-xs text-red-600 line-clamp-2">{purchase.Description}</p>
            )}
            <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold text-red-700">
              <span>{purchase.order_count} order{purchase.order_count !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>{purchase.item_count} item{purchase.item_count !== 1 ? "s" : ""}</span>
              {purchase.Total_spending != null && (
                <><span>·</span><span>{fmtMoney(purchase.Total_spending)}</span></>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting} className="text-xs border-slate-200">
            Cancel
          </Button>
          <Button onClick={handleDelete} disabled={deleting} className="gap-1.5 bg-red-600 hover:bg-red-700 text-xs text-white">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {deleting ? "Deleting…" : "Delete Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIMIT = 20
const STATUS_OPTIONS = ["All", "Pending", "In Review", "Approved", "In Progress", "Completed", "Cancelled"]

export default function PurchasesPage() {
  const router = useRouter()
  const [user, setUser]   = useState<any>(null)

  const [rows,    setRows]    = useState<PurchaseRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [toDelete,     setToDelete]     = useState<PurchaseRow | null>(null)

  const debouncedSearch = useDebounce(search, 350)
  const abortRef = useRef<AbortController | null>(null)

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchRows = useCallback(async (p: number, q: string, status: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q)                    qs.set("q", q)
      if (status && status !== "All") qs.set("status", status)

      const res = await apiFetch(`/api/purchases/table?${qs}`, {
        signal: ctrl.signal, cache: "no-store",
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setRows(Array.isArray(data.results) ? data.results : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
      setPage(p)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? "Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchRows(1, debouncedSearch, statusFilter)
  }, [user, debouncedSearch, statusFilter, fetchRows])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleDeleted = () => {
    setToDelete(null)
    fetchRows(page, debouncedSearch, statusFilter)
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Purchases</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Track purchase orders and spending across projects</p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/purchases/create")}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-sm text-white shadow-sm"
              >
                <Plus className="h-4 w-4" /> New Purchase
              </Button>
            </div>
          </div>

          {/* ── Filters ─────────────────────────────────────────────────────── */}
          <div className="border-b border-slate-200 bg-white px-6 py-3">
            <div className="flex flex-wrap items-center gap-3">

              {/* Search */}
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search ID, rep, description…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 text-xs border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1.5">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                      statusFilter === s
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Total */}
              <div className="ml-auto text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{total}</span> purchase{total !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* ── Table ───────────────────────────────────────────────────────── */}
          <div className="p-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] table-fixed">
                  <colgroup>
                    <col className="w-36" />
                    <col className="w-44" />
                    <col />
                    <col className="w-36" />
                    <col className="w-36" />
                    <col className="w-28" />
                    <col className="w-36" />
                    <col className="w-24" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Purchase ID</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Selling Rep</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Orders / Items</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Spent</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Return</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <AlertCircle className="h-8 w-8 text-red-400" />
                            <p className="text-sm text-slate-600">{error}</p>
                            <Button size="sm" variant="outline" onClick={() => fetchRows(page, debouncedSearch, statusFilter)} className="gap-1.5 text-xs">
                              <RefreshCw className="h-3.5 w-3.5" /> Retry
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <ShoppingCart className="h-10 w-10 text-slate-300" />
                            <p className="text-sm text-slate-500">
                              {search || statusFilter !== "All" ? "No purchases match your filters" : "No purchases yet"}
                            </p>
                            {(search || statusFilter !== "All") && (
                              <Button size="sm" variant="outline" onClick={() => { setSearch(""); setStatusFilter("All") }} className="gap-1.5 text-xs">
                                <X className="h-3.5 w-3.5" /> Clear filters
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : rows.map(p => (
                      <tr key={p.ID_Purchase} className="group hover:bg-slate-50/60 transition-colors">

                        {/* ID */}
                        <td className="px-4 py-3.5 align-middle">
                          <span className="font-mono text-xs font-semibold text-slate-700">{p.ID_Purchase}</span>
                          {p.ID_Jobs && (
                            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{p.ID_Jobs}</p>
                          )}
                        </td>

                        {/* Selling rep */}
                        <td className="px-4 py-3.5 align-middle">
                          {p.Selling_rep ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                {p.Selling_rep.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                              </div>
                              <span className="truncate text-xs font-medium text-slate-700">{p.Selling_rep}</span>
                            </div>
                          ) : <span className="text-xs italic text-slate-400">—</span>}
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3.5 align-middle">
                          <p className="truncate text-xs text-slate-600">{p.Description || <span className="italic text-slate-400">No description</span>}</p>
                          {p.Delivery_location && (
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-400">
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />{p.Delivery_location}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 align-middle">
                          <StatusBadge status={p.Status} />
                        </td>

                        {/* Orders / Items */}
                        <td className="px-4 py-3.5 text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                              <Package className="h-3 w-3 text-slate-400" />{p.order_count}
                            </div>
                            <span className="text-slate-300">/</span>
                            <div className="text-xs font-semibold text-slate-700">
                              {p.item_count} items
                            </div>
                          </div>
                        </td>

                        {/* Total spent */}
                        <td className="px-4 py-3.5 text-right align-middle">
                          <span className={`text-xs font-bold ${p.Total_spending != null ? "text-emerald-700" : "italic text-slate-400"}`}>
                            {fmtMoney(p.Total_spending)}
                          </span>
                        </td>

                        {/* Return */}
                        <td className="px-4 py-3.5 align-middle">
                          {p.Return_request ? (
                            <div className="flex flex-col gap-1">
                              <span className="truncate text-[11px] font-medium text-slate-600">{p.Return_request}</span>
                              <ReturnBadge status={p.Return_status} />
                            </div>
                          ) : <span className="text-xs italic text-slate-400">—</span>}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => router.push(`/purchases/${p.ID_Purchase}`)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white transition-colors hover:bg-amber-600"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setToDelete(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white transition-colors hover:bg-red-600"
                              title="Delete purchase"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ─────────────────────────────────────────────── */}
              {!loading && !error && rows.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
                  <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}</span> of{" "}
                    <span className="font-semibold text-slate-800">{total}</span> purchases
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchRows(page - 1, debouncedSearch, statusFilter)}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700">{page} / {totalPages}</span>
                    <button
                      onClick={() => fetchRows(page + 1, debouncedSearch, statusFilter)}
                      disabled={page >= totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Delete modal ──────────────────────────────────────────────────────── */}
      <DeletePurchaseDialog
        purchase={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}