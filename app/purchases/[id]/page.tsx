"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, ExternalLink, RefreshCcw, AlertTriangle, Pencil, Check, X,
  ShoppingCart, ClipboardList, Tag, Plus, Trash2, Loader2, Search,
  User, Briefcase, ChevronLeft, ChevronRight, AlertCircle, MapPin,
  Package, DollarSign, FileText, RotateCcw, Save, ChevronDown, ChevronUp,
} from "lucide-react"
import { useSearchParams } from "next/navigation"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type MemberRow = {
  ID_Member: string
  Member_Name: string
  Company_Role?: string | null
  Email_Address?: string | null
}

type JobRow = {
  ID_Jobs: string
  Project_name?: string | null
  Job_type?: string | null
  Job_status?: string | null
  client?: { Client_Community?: string | null } | null
}

type PurchaseOrderItem = {
  ID_PurchaseOrderItem?: string | null
  Name?: string | null
  Quote_shop?: string | null
  Quote_link?: string | null
  Quote_value?: number | null
  Purchase_shop?: string | null
  Purchase_link?: string | null
  Purchase_value?: number | null
}

type PurchaseOrder = {
  ID_PurchaseOrder?: string | null
  Order_title?: string | null
  Est_delivery_date?: string | null
  Order_confirmation?: boolean | null
  porder_items?: PurchaseOrderItem[] | null
}

type Purchase = {
  ID_Purchase?: string | null
  Selling_rep?: string | null
  Description?: string | null
  PickUp_person?: string | null
  Delivery_location?: string | null
  Status?: string | null
  Return_request?: string | null
  Return_status?: string | null
  Purchase_note?: string | null
  Total_spending?: number | null
  // Scalar FKs (normalized from nested objects on fetch)
  ID_Member?: string | null
  ID_Jobs?: string | null
  // Nested objects as returned by the backend GET
  job?: { ID_Jobs?: string | null; Project_name?: string | null; Job_type?: string | null } | null
  member?: { ID_Member?: string | null; Member_Name?: string | null; Company_Role?: string | null } | null
  purchase_orders?: PurchaseOrder[] | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

const asNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const safeUrl = (url?: string | null) => {
  if (!url) return null
  const t = url.trim()
  if (!t) return null
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`
}

const fmtDate = (raw?: string | null) => {
  if (!raw) return "—"
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
}

function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase()
}

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
]
function avatarColor(id?: string | null) {
  if (!id) return AVATAR_COLORS[0]
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length]
}

const STATUS_OPTIONS = ["In Progress", "Completed", "Pending", "Cancelled"]
const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
  "Completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Pending": "bg-amber-100 text-amber-700 border-amber-200",
  "Cancelled": "bg-red-100 text-red-600 border-red-200",
}

const JOB_TYPE_COLORS: Record<string, string> = {
  QID: "bg-blue-100 text-blue-700",
  PTL: "bg-violet-100 text-violet-700",
  PAR: "bg-amber-100 text-amber-700",
}
const JOB_STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Completed: "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  Cancelled: "bg-red-100 text-red-600",
}

const API = {
  purchases: "/api/purchases",
  purchaseOrders: "/api/purchase-orders",
  purchaseOrderItems: "/api/purchase-order-items",
  membersTable: "/api/members/table",
  jobsTable: "/api/jobs",
}

async function apiCall<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const ct = res.headers.get("content-type") ?? ""
  const isJson = ct.includes("application/json")
  const data = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    const detail = isJson ? (data?.detail || data?.error || `Error ${res.status}`) : `Error ${res.status}`
    throw new Error(detail)
  }
  return data as T
}

// ─────────────────────────────────────────────────────────────────────────────
// Debounce hook
// ─────────────────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline editable field
// ─────────────────────────────────────────────────────────────────────────────
function InlineField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<void>
  type?: string
  placeholder?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return }
    setSaving(true); setErr(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (e: any) {
      setErr(e?.message ?? "Error saving")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => { setDraft(value); setEditing(false); setErr(null) }

  useEffect(() => { setDraft(value) }, [value])

  return (
    <div className="group">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {editing ? (
        <div className="space-y-1.5">
          {multiline ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          ) : (
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              type={type}
              placeholder={placeholder}
              autoFocus
              className="border-emerald-300 text-sm focus:ring-2 focus:ring-emerald-400/30"
            />
          )}
          {err && <p className="text-[11px] text-red-500">{err}</p>}
          <div className="flex gap-1.5">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
            </button>
            <button onClick={handleCancel} disabled={saving}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm text-slate-800 min-h-[1.5rem]">
            {value || <span className="italic text-slate-400">{placeholder ?? "—"}</span>}
          </p>
          <button onClick={() => setEditing(true)}
            className="mt-0.5 flex-shrink-0 rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 transition-all">
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Member Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
function MemberPickerModal({ onSelect, onClose }: { onSelect: (m: MemberRow) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dq = useDebounce(q, 320)
  const LIMIT = 8
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(async (p: number, search: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (search) qs.set("q", search)
      const res = await fetch(`${API.membersTable}?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setRows(Array.isArray(data.results) ? data.results : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
      setPage(p)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError("Could not load members list.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_(1, dq) }, [dq, fetch_])
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <User className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Change Selling Rep</p>
              <p className="text-xs text-slate-400">{total} member{total !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, role, email…"
              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30" />
            {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
            : error ? <div className="flex flex-col items-center gap-2 py-10"><AlertCircle className="h-6 w-6 text-red-400" /><p className="text-xs text-slate-500">{error}</p></div>
              : rows.length === 0 ? <div className="py-10 text-center"><p className="text-xs text-slate-400">No results</p></div>
                : rows.map(m => (
                  <button key={m.ID_Member} onClick={() => onSelect(m)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/60 transition-colors group">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(m.ID_Member)}`}>
                      {initials(m.Member_Name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-emerald-700">{m.Member_Name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{m.Company_Role ?? "No role"} · {m.ID_Member}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 flex-shrink-0" />
                  </button>
                ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
            <span className="text-xs text-slate-400">{page} / {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1 || loading} onClick={() => fetch_(page - 1, dq)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button disabled={page >= totalPages || loading} onClick={() => fetch_(page + 1, dq)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
function JobPickerModal({ onSelect, onClose }: { onSelect: (j: JobRow) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<JobRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dq = useDebounce(q, 320)
  const LIMIT = 8
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(async (p: number, search: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (search) qs.set("search", search)
      const res = await fetch(`${API.jobsTable}?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setRows(Array.isArray(data.results) ? data.results : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
      setPage(p)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError("Could not load jobs list.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_(1, dq) }, [dq, fetch_])
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Briefcase className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Link Job</p>
              <p className="text-xs text-slate-400">{total} job{total !== 1 ? "s" : ""} available</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search by ID or project name…"
              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30" />
            {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
            : error ? <div className="flex flex-col items-center gap-2 py-10"><AlertCircle className="h-6 w-6 text-red-400" /><p className="text-xs text-slate-500">{error}</p></div>
              : rows.length === 0 ? <div className="py-10 text-center"><p className="text-xs text-slate-400">No results</p></div>
                : rows.map(j => (
                  <button key={j.ID_Jobs} onClick={() => onSelect(j)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/60 transition-colors group">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold font-mono text-slate-800 group-hover:text-emerald-700">{j.ID_Jobs}</p>
                        {j.Job_type && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${JOB_TYPE_COLORS[j.Job_type] ?? "bg-slate-100 text-slate-600"}`}>{j.Job_type}</span>}
                        {j.Job_status && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${JOB_STATUS_COLORS[j.Job_status] ?? "bg-slate-100 text-slate-600"}`}>{j.Job_status}</span>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate">{j.Project_name ?? "Unnamed"}{j.client?.Client_Community ? ` · ${j.client.Client_Community}` : ""}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 flex-shrink-0" />
                  </button>
                ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
            <span className="text-xs text-slate-400">{page} / {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1 || loading} onClick={() => fetch_(page - 1, dq)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button disabled={page >= totalPages || loading} onClick={() => fetch_(page + 1, dq)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Item row — inline editable
// ─────────────────────────────────────────────────────────────────────────────
function ItemRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: PurchaseOrderItem
  onUpdate: (id: string, patch: Partial<PurchaseOrderItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [draft, setDraft] = useState({ ...item })

  const handleSave = async () => {
    if (!item.ID_PurchaseOrderItem) return
    setSaving(true); setErr(null)
    try {
      const patch: Partial<PurchaseOrderItem> = {}
      if (draft.Name !== item.Name) patch.Name = draft.Name
      if (draft.Quote_shop !== item.Quote_shop) patch.Quote_shop = draft.Quote_shop
      if (draft.Quote_link !== item.Quote_link) patch.Quote_link = draft.Quote_link
      if (draft.Quote_value !== item.Quote_value) patch.Quote_value = asNumber(draft.Quote_value)
      if (draft.Purchase_shop !== item.Purchase_shop) patch.Purchase_shop = draft.Purchase_shop
      if (draft.Purchase_link !== item.Purchase_link) patch.Purchase_link = draft.Purchase_link
      if (draft.Purchase_value !== item.Purchase_value) patch.Purchase_value = asNumber(draft.Purchase_value)
      await onUpdate(item.ID_PurchaseOrderItem, patch)
      setEditing(false)
    } catch (e: any) {
      setErr(e?.message ?? "Error saving")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item.ID_PurchaseOrderItem) return
    setDeleting(true); setErr(null)
    try { await onDelete(item.ID_PurchaseOrderItem) }
    catch (e: any) { setErr(e?.message ?? "Error deleting"); setDeleting(false); setConfirmDelete(false) }
  }

  useEffect(() => { setDraft({ ...item }) }, [item])

  const qLink = safeUrl(item.Quote_link)
  const pLink = safeUrl(item.Purchase_link)

  if (editing) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Name</label>
            <Input value={draft.Name ?? ""} onChange={e => setDraft(p => ({ ...p, Name: e.target.value }))}
              className="text-sm border-slate-200 focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Quote Shop</label>
            <Input value={draft.Quote_shop ?? ""} onChange={e => setDraft(p => ({ ...p, Quote_shop: e.target.value }))}
              className="text-sm border-slate-200 focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Quote Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
              <Input value={draft.Quote_value ?? ""} onChange={e => setDraft(p => ({ ...p, Quote_value: e.target.value as any }))}
                className="pl-6 text-sm border-slate-200 focus:border-emerald-400" inputMode="decimal" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Quote Link</label>
            <Input value={draft.Quote_link ?? ""} onChange={e => setDraft(p => ({ ...p, Quote_link: e.target.value }))}
              className="text-sm border-slate-200 focus:border-emerald-400" placeholder="https://..." />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Purchase Shop</label>
            <Input value={draft.Purchase_shop ?? ""} onChange={e => setDraft(p => ({ ...p, Purchase_shop: e.target.value }))}
              className="text-sm border-slate-200 focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Purchase Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
              <Input value={draft.Purchase_value ?? ""} onChange={e => setDraft(p => ({ ...p, Purchase_value: e.target.value as any }))}
                className="pl-6 text-sm border-slate-200 focus:border-emerald-400" inputMode="decimal" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 block">Purchase Link</label>
            <Input value={draft.Purchase_link ?? ""} onChange={e => setDraft(p => ({ ...p, Purchase_link: e.target.value }))}
              className="text-sm border-slate-200 focus:border-emerald-400" placeholder="https://..." />
          </div>
        </div>
        {err && <p className="text-[11px] text-red-500">{err}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setDraft({ ...item }); setEditing(false); setErr(null) }}
            disabled={saving} className="text-xs">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 hover:shadow-sm transition-all">
      <Tag className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
      <div className="min-w-0 flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
        <div className="col-span-2">
          <p className="text-sm font-semibold text-slate-800">{item.Name ?? "—"}</p>
          <p className="text-[10px] font-mono text-slate-400">{item.ID_PurchaseOrderItem}</p>
        </div>
        {/* Quote */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Quote</p>
          <p className="text-sm font-bold text-slate-700">{money(asNumber(item.Quote_value))}</p>
          <p className="text-[11px] text-slate-500">{item.Quote_shop || "—"}</p>
          {qLink && (
            <a href={qLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5">
              View link <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        {/* Purchase */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Actual Purchase</p>
          <p className={`text-sm font-bold ${asNumber(item.Purchase_value) > 0 ? "text-emerald-700" : "text-slate-300 italic text-xs font-normal"}`}>
            {asNumber(item.Purchase_value) > 0 ? money(asNumber(item.Purchase_value)) : "Pending"}
          </p>
          <p className="text-[11px] text-slate-500">{item.Purchase_shop || "—"}</p>
          {pLink && (
            <a href={pLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5">
              View link <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {confirmDelete ? (
          <div className="flex gap-1">
            <button onClick={handleDelete} disabled={deleting}
              className="rounded-lg p-1.5 bg-red-500 text-white hover:bg-red-600">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Item inline form
// ─────────────────────────────────────────────────────────────────────────────
function AddItemForm({ orderId, onAdded }: { orderId: string; onAdded: (item: PurchaseOrderItem) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [shop, setShop] = useState("")
  const [link, setLink] = useState("")
  const [value, setValue] = useState("")

  const valid = name.trim().length > 0 && shop.trim().length > 0 && asNumber(value) > 0

  const handleAdd = async () => {
    setLoading(true); setErr(null)
    try {
      const payload = {
        Name: name.trim(),
        Quote_shop: shop.trim(),
        Quote_link: link.trim() ? (link.trim().startsWith("http") ? link.trim() : `https://${link.trim()}`) : "",
        Quote_value: asNumber(value),
        Purchase_shop: "",
        Purchase_link: "",
        Purchase_value: null,
        ID_PurchaseOrder: orderId,
      }
      const data = await apiCall<PurchaseOrderItem>(API.purchaseOrderItems, "POST", payload)
      onAdded(data)
      setName(""); setShop(""); setLink(""); setValue("")
      setOpen(false)
    } catch (e: any) {
      setErr(e?.message ?? "Error adding item")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-2.5 text-xs text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/40 transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add item
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
      <p className="text-xs font-semibold text-emerald-700">New item</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Item name *"
            className="text-sm border-slate-200 focus:border-emerald-400" />
        </div>
        <Input value={shop} onChange={e => setShop(e.target.value)} placeholder="Shop *"
          className="text-sm border-slate-200 focus:border-emerald-400" />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
          <Input value={value} onChange={e => setValue(e.target.value)} placeholder="0.00 *" inputMode="decimal"
            className="pl-6 text-sm border-slate-200 focus:border-emerald-400" />
        </div>
        <div className="col-span-2">
          <Input value={link} onChange={e => setLink(e.target.value)} placeholder="Quote link"
            className="text-sm border-slate-200 focus:border-emerald-400" />
        </div>
      </div>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={!valid || loading} onClick={handleAdd}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setOpen(false); setErr(null) }} className="text-xs">Cancel</Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Order block — collapsible + editable header
// ─────────────────────────────────────────────────────────────────────────────
function OrderBlock({
  order,
  onUpdateOrder,
  onDeleteOrder,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: {
  order: PurchaseOrder
  onUpdateOrder: (id: string, patch: Partial<PurchaseOrder>) => Promise<void>
  onDeleteOrder: (id: string) => Promise<void>
  onUpdateItem: (id: string, patch: Partial<PurchaseOrderItem>) => Promise<void>
  onDeleteItem: (orderId: string, itemId: string) => Promise<void>
  onAddItem: (orderId: string, item: PurchaseOrderItem) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(order.Order_title ?? "")
  const [titleSaving, setTitleSaving] = useState(false)
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const items = Array.isArray(order.porder_items) ? order.porder_items : []
  const totalQuoted = items.reduce((a, it) => a + asNumber(it.Quote_value), 0)
  const totalPurchased = items.reduce((a, it) => a + asNumber(it.Purchase_value), 0)

  const saveTitle = async () => {
    if (!order.ID_PurchaseOrder || titleDraft === order.Order_title) { setEditingTitle(false); return }
    setTitleSaving(true)
    try {
      await onUpdateOrder(order.ID_PurchaseOrder, { Order_title: titleDraft })
      setEditingTitle(false)
    } catch (e: any) {
      setErr(e?.message ?? "Error")
    } finally { setTitleSaving(false) }
  }

  const deleteOrder = async () => {
    if (!order.ID_PurchaseOrder) return
    setDeletingOrder(true)
    try { await onDeleteOrder(order.ID_PurchaseOrder) }
    catch (e: any) { setErr(e?.message ?? "Error deleting orden"); setDeletingOrder(false); setConfirmDeleteOrder(false) }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Order header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <ClipboardList className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} autoFocus
                className="h-7 text-sm border-emerald-300 focus:ring-1 focus:ring-emerald-400/30 py-0" />
              <button onClick={saveTitle} disabled={titleSaving} className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700">
                {titleSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </button>
              <button onClick={() => { setTitleDraft(order.Order_title ?? ""); setEditingTitle(false) }}
                className="rounded border border-slate-200 p-1 text-slate-500">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <p className="text-sm font-semibold text-slate-800 truncate">{order.Order_title || "Untitled"}</p>
              <button onClick={() => setEditingTitle(true)}
                className="opacity-0 group-hover/title:opacity-100 rounded p-0.5 text-slate-400 hover:text-slate-600 transition-opacity">
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="font-mono text-[10px] text-slate-400">{order.ID_PurchaseOrder}</span>
            <span className="text-[10px] text-slate-400">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Quoted: {money(totalQuoted)}</span>
            {totalPurchased > 0 && <span className="text-[10px] text-slate-600 font-semibold">Purchased: {money(totalPurchased)}</span>}
            {order.Est_delivery_date && <span className="text-[10px] text-slate-400">Delivery: {fmtDate(order.Est_delivery_date)}</span>}
            <span className={`text-[10px] font-semibold ${order.Order_confirmation ? "text-emerald-600" : "text-amber-600"}`}>
              {order.Order_confirmation ? "✓ Confirmed" : "Pending confirmación"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {confirmDeleteOrder ? (
            <>
              <button onClick={deleteOrder} disabled={deletingOrder}
                className="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-red-500 text-white hover:bg-red-600">
                {deletingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
              </button>
              <button onClick={() => setConfirmDeleteOrder(false)}
                className="rounded-lg px-2.5 py-1 text-[11px] border border-slate-200 text-slate-500 hover:bg-slate-50">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDeleteOrder(true)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {err && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-100">
          <p className="text-[11px] text-red-600">{err}</p>
        </div>
      )}

      {/* Items */}
      {!collapsed && (
        <div className="p-4 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-2">No items in this order</p>
          )}
          {items.map(it => (
            <ItemRow
              key={it.ID_PurchaseOrderItem}
              item={it}
              onUpdate={onUpdateItem}
              onDelete={(itemId) => onDeleteItem(order.ID_PurchaseOrder!, itemId)}
            />
          ))}
          <AddItemForm
            orderId={order.ID_PurchaseOrder!}
            onAdded={(item) => onAddItem(order.ID_PurchaseOrder!, item)}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function PurchaseDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const searchParams = useSearchParams()
  const returnTo = searchParams?.get("returnTo") ?? null
  const backUrl = returnTo ? decodeURIComponent(returnTo) : "/purchases"

  const [user, setUser] = useState<any>(null)
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // Modals
  const [showMemberPicker, setShowMemberPicker] = useState(false)
  const [showJobPicker, setShowJobPicker] = useState(false)

  // New order form
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [newOrderTitle, setNewOrderTitle] = useState("")
  const [addingOrder, setAddingOrder] = useState(false)
  const [addOrderErr, setAddOrderErr] = useState<string | null>(null)

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const fetchPurchase = useCallback(async (pid: string) => {
    setLoading(true); setLoadError(null)
    try {
      const raw = await apiCall<any>(`${API.purchases}/${pid}`, "GET")
      // Backend returns nested objects: raw.job.ID_Jobs and raw.member.ID_Member
      // Extract scalar IDs so the rest of the UI can use them directly
      const normalizedData: Purchase = {
        ...raw,
        ID_Jobs: raw.ID_Jobs ?? raw.job?.ID_Jobs ?? null,
        ID_Member: raw.ID_Member ?? raw.member?.ID_Member ?? null,
        Selling_rep: raw.Selling_rep ?? raw.member?.Member_Name ?? null,
        purchase_orders: Array.isArray(raw.purchase_orders) ? raw.purchase_orders : [],
      }
      setPurchase(normalizedData)
    } catch (e: any) {
      setLoadError(e?.message ?? "Error loading purchase")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && id) fetchPurchase(id)
  }, [user, id, fetchPurchase])

  // ── Patch purchase field ───────────────────────────────────────────────────
  const patchPurchase = useCallback(async (patch: Partial<Purchase>) => {
    if (!id) return
    setSaving(true); setSaveErr(null)
    try {
      const updated = await apiCall<Purchase>(`${API.purchases}/${id}`, "PATCH", patch)
      setPurchase(prev => {
        if (!prev) return prev
        // Backend PATCH may not return relational fields — preserve them from prev
        return {
          ...prev,
          ...updated,
          purchase_orders: updated.purchase_orders ?? prev.purchase_orders,
          ID_Jobs: "ID_Jobs" in patch ? (patch.ID_Jobs ?? updated.ID_Jobs ?? prev.ID_Jobs) : prev.ID_Jobs,
          ID_Member: "ID_Member" in patch ? (patch.ID_Member ?? updated.ID_Member ?? prev.ID_Member) : prev.ID_Member,
        }
      })
    } catch (e: any) {
      setSaveErr(e?.message ?? "Error saving")
      throw e
    } finally {
      setSaving(false)
    }
  }, [id])

  // ── Member picker handler ──────────────────────────────────────────────────
  const handleSelectMember = async (m: MemberRow) => {
    setShowMemberPicker(false)
    await patchPurchase({ Selling_rep: m.Member_Name, ID_Member: m.ID_Member })
  }

  // ── Job picker handler ─────────────────────────────────────────────────────
  const handleSelectJob = async (j: JobRow) => {
    setShowJobPicker(false)
    await patchPurchase({ ID_Jobs: j.ID_Jobs })
  }

  // ── Order operations ───────────────────────────────────────────────────────
  const handleUpdateOrder = useCallback(async (orderId: string, patch: Partial<PurchaseOrder>) => {
    await apiCall(`${API.purchaseOrders}/${orderId}`, "PATCH", patch)
    setPurchase(prev => {
      if (!prev) return prev
      return {
        ...prev,
        purchase_orders: prev.purchase_orders?.map(o =>
          o.ID_PurchaseOrder === orderId ? { ...o, ...patch } : o
        ),
      }
    })
  }, [])

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    await apiCall(`${API.purchaseOrders}/${orderId}`, "DELETE")
    setPurchase(prev => {
      if (!prev) return prev
      return {
        ...prev,
        purchase_orders: prev.purchase_orders?.filter(o => o.ID_PurchaseOrder !== orderId),
      }
    })
  }, [])

  const handleAddOrder = async () => {
    if (!id || !newOrderTitle.trim()) return
    setAddingOrder(true); setAddOrderErr(null)
    try {
      const data = await apiCall<PurchaseOrder>(API.purchaseOrders, "POST", {
        Order_title: newOrderTitle.trim(),
        Order_confirmation: false,
        ID_Purchase: id,
      })
      setPurchase(prev => prev ? { ...prev, purchase_orders: [...(prev.purchase_orders ?? []), { ...data, porder_items: [] }] } : prev)
      setNewOrderTitle("")
      setShowAddOrder(false)
    } catch (e: any) {
      setAddOrderErr(e?.message ?? "Error creating order")
    } finally {
      setAddingOrder(false)
    }
  }

  // ── Item operations ────────────────────────────────────────────────────────
  const handleUpdateItem = useCallback(async (itemId: string, patch: Partial<PurchaseOrderItem>) => {
    await apiCall(`${API.purchaseOrderItems}/${itemId}`, "PATCH", patch)
    setPurchase(prev => {
      if (!prev) return prev
      return {
        ...prev,
        purchase_orders: prev.purchase_orders?.map(o => ({
          ...o,
          porder_items: o.porder_items?.map(it =>
            it.ID_PurchaseOrderItem === itemId ? { ...it, ...patch } : it
          ),
        })),
      }
    })
  }, [])

  const handleDeleteItem = useCallback(async (orderId: string, itemId: string) => {
    await apiCall(`${API.purchaseOrderItems}/${itemId}`, "DELETE")
    setPurchase(prev => {
      if (!prev) return prev
      return {
        ...prev,
        purchase_orders: prev.purchase_orders?.map(o =>
          o.ID_PurchaseOrder === orderId
            ? { ...o, porder_items: o.porder_items?.filter(it => it.ID_PurchaseOrderItem !== itemId) }
            : o
        ),
      }
    })
  }, [])

  const handleAddItem = useCallback((orderId: string, item: PurchaseOrderItem) => {
    setPurchase(prev => {
      if (!prev) return prev
      return {
        ...prev,
        purchase_orders: prev.purchase_orders?.map(o =>
          o.ID_PurchaseOrder === orderId
            ? { ...o, porder_items: [...(o.porder_items ?? []), item] }
            : o
        ),
      }
    })
  }, [])

  // ── Computed totals ────────────────────────────────────────────────────────
  const computed = useMemo(() => {
    const orders = purchase?.purchase_orders ?? []
    const items = orders.flatMap(o => o.porder_items ?? [])
    const totalQuoted = items.reduce((a, it) => a + asNumber(it.Quote_value), 0)
    const totalPurchased = items.reduce((a, it) => a + asNumber(it.Purchase_value), 0)
    const totalSpendingDb = asNumber(purchase?.Total_spending)
    const hasMismatch = totalSpendingDb > 0 && Math.abs(totalSpendingDb - totalPurchased) > 0.01
    return {
      ordersCount: orders.length,
      itemsCount: items.length,
      totalQuoted,
      totalPurchased,
      totalSpendingDb,
      totalSaved: totalQuoted - totalPurchased,
      hasMismatch,
    }
  }, [purchase])

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!user) return null

  if (!id) return (
    <Shell user={user}>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">Invalid purchase ID.</p>
        <Button onClick={() => router.push("/purchases")} variant="outline" className="mt-4 text-xs">← Volver</Button>
      </div>
    </Shell>
  )

  if (loading) return (
    <Shell user={user}>
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    </Shell>
  )

  if (!purchase) return (
    <Shell user={user}>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <p className="text-sm font-semibold text-slate-700">Could not load purchase</p>
        <p className="mt-1 text-xs text-red-500">{loadError}</p>
        <Button onClick={() => fetchPurchase(id)} className="mt-4 gap-1.5 text-xs">
          <RefreshCcw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    </Shell>
  )

  const statusColor = STATUS_COLORS[purchase.Status ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200"
  

  return (
    <>
      {showMemberPicker && <MemberPickerModal onSelect={handleSelectMember} onClose={() => setShowMemberPicker(false)} />}
      {showJobPicker && <JobPickerModal onSelect={handleSelectJob} onClose={() => setShowJobPicker(false)} />}

      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => router.push(backUrl)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-lg font-bold font-mono text-slate-900">{purchase.ID_Purchase ?? id}</h1>
                      <span className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold ${statusColor}`}>
                        {purchase.Status ?? "—"}
                      </span>
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{purchase.Description || "No description"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => fetchPurchase(id)} className="gap-1.5 text-xs">
                    <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Save error ───────────────────────────────────────────────── */}
            {saveErr && (
              <div className="border-b border-red-100 bg-red-50 px-6 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{saveErr}</p>
                </div>
                <button onClick={() => setSaveErr(null)} className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {/* ── Mismatch warning ─────────────────────────────────────────── */}
            {computed.hasMismatch && (
              <div className="border-b border-amber-100 bg-amber-50 px-6 py-2.5 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  El <strong>Total_spending</strong> guardado ({money(computed.totalSpendingDb)}) does not match the sum of item Purchase_value ({money(computed.totalPurchased)}).
                </p>
              </div>
            )}

            {/* ── Content ──────────────────────────────────────────────────── */}
            <div className="p-6">
              <div className="grid gap-6 xl:grid-cols-[1fr_420px]">

                {/* ── Main ─────────────────────────────────────────────────── */}
                <div className="space-y-5">

                  {/* Orders section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700">
                          Purchase Orders <span className="text-slate-400 font-normal">({computed.ordersCount})</span>
                        </p>
                      </div>
                      <button onClick={() => setShowAddOrder(a => !a)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> New order
                      </button>
                    </div>

                    {/* Add order form */}
                    {showAddOrder && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
                        <p className="text-xs font-semibold text-emerald-700">New purchase order</p>
                        <Input value={newOrderTitle} onChange={e => setNewOrderTitle(e.target.value)}
                          placeholder="Order title *" className="text-sm border-slate-200 focus:border-emerald-400" />
                        {addOrderErr && <p className="text-[11px] text-red-500">{addOrderErr}</p>}
                        <div className="flex gap-2">
                          <Button size="sm" disabled={!newOrderTitle.trim() || addingOrder} onClick={handleAddOrder}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            {addingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setShowAddOrder(false); setAddOrderErr(null) }} className="text-xs">Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Order blocks */}
                    {(purchase.purchase_orders ?? []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                        <Package className="mx-auto mb-2 h-7 w-7 text-slate-200" />
                        <p className="text-sm text-slate-400">No purchase orders</p>
                      </div>
                    ) : (
                      (purchase.purchase_orders ?? []).map(o => (
                        <OrderBlock
                          key={o.ID_PurchaseOrder}
                          order={o}
                          onUpdateOrder={handleUpdateOrder}
                          onDeleteOrder={handleDeleteOrder}
                          onUpdateItem={handleUpdateItem}
                          onDeleteItem={handleDeleteItem}
                          onAddItem={handleAddItem}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* ── Sidebar ──────────────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Purchase details — editable */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center gap-2">
                      <ShoppingCart className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchase Details</p>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                      <InlineField
                        label="Description"
                        value={purchase.Description ?? ""}
                        placeholder="No description"
                        onSave={v => patchPurchase({ Description: v })}
                      />
                      {/* Status */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                        <select
                          value={purchase.Status ?? ""}
                          onChange={e => patchPurchase({ Status: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <InlineField label="Pick Up Person" value={purchase.PickUp_person ?? ""} placeholder="—"
                        onSave={v => patchPurchase({ PickUp_person: v })} />
                      <InlineField label="Delivery Location" value={purchase.Delivery_location ?? ""} placeholder="—"
                        onSave={v => patchPurchase({ Delivery_location: v })} />
                      <InlineField label="Return Request" value={purchase.Return_request ?? ""} placeholder="—"
                        onSave={v => patchPurchase({ Return_request: v })} />
                      <InlineField label="Return Status" value={purchase.Return_status ?? ""} placeholder="—"
                        onSave={v => patchPurchase({ Return_status: v })} />
                      <InlineField label="Notes" value={purchase.Purchase_note ?? ""} placeholder="No notes…"
                        multiline onSave={v => patchPurchase({ Purchase_note: v })} />
                    </div>
                  </div>

                  {/* Selling Rep */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selling Rep</p>
                      </div>
                      <button onClick={() => setShowMemberPicker(true)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="px-5 py-4">
                      {purchase.Selling_rep ? (
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(purchase.ID_Member)}`}>
                            {initials(purchase.Selling_rep)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{purchase.Selling_rep}</p>
                            {purchase.ID_Member && <p className="text-[11px] font-mono text-slate-400">{purchase.ID_Member}</p>}
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setShowMemberPicker(true)}
                          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                          <User className="h-3.5 w-3.5" /> Asignar member
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Linked Job */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Linked Job</p>
                      </div>
                      <button onClick={() => setShowJobPicker(true)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="px-5 py-4">
                      {purchase.ID_Jobs ? (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <p className="text-sm font-bold font-mono text-slate-800">{purchase.ID_Jobs}</p>
                          <button onClick={() => router.push(`/jobs/${purchase.ID_Jobs}`)}
                            className="ml-auto text-slate-400 hover:text-emerald-600 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setShowJobPicker(true)}
                          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                          <Briefcase className="h-3.5 w-3.5" /> Link job
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Financial Summary</p>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Orders</span>
                        <span className="text-sm font-bold text-slate-700">{computed.ordersCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Total items</span>
                        <span className="text-sm font-bold text-slate-700">{computed.itemsCount}</span>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Total quoted</span>
                        <span className="text-sm font-bold text-slate-700">{money(computed.totalQuoted)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Total purchased</span>
                        <span className={`text-sm font-bold ${computed.totalPurchased > 0 ? "text-emerald-700" : "text-slate-300"}`}>
                          {money(computed.totalPurchased)}
                        </span>
                      </div>
                      {computed.totalSpendingDb > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Total spending (DB)</span>
                          <span className="text-sm font-bold text-slate-700">{money(computed.totalSpendingDb)}</span>
                        </div>
                      )}
                      {computed.totalPurchased > 0 && (
                        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                          <span className="text-xs font-semibold text-emerald-700">Savings</span>
                          <span className="text-sm font-bold text-emerald-700">{money(computed.totalSaved)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell wrapper for error states
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ user, children }: { user: any; children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}