"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, CheckCircle2, Plus, Trash2, Loader2, X,
  ShoppingCart, ClipboardList, Tag, Link2, Search,
  User, Briefcase, ChevronLeft, ChevronRight, AlertCircle,
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

type CreatedItem = {
  ID_PurchaseOrderItem?: string | null
  Name?: string | null
  Quote_shop?: string | null
  Quote_link?: string | null
  Quote_value?: number | null
}

type CreatedOrder = {
  ID_PurchaseOrder?: string | null
  Order_title?: string | null
  items: CreatedItem[]
}

type CreatedPurchase = {
  ID_Purchase?: string | null
  Selling_rep?: string | null
  Description?: string | null
  Status?: string | null
  ID_Member?: string | null
  ID_Jobs?: string | null
  orders: CreatedOrder[]
}

type Step = 1 | 2 | 3 | 4

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

const asNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const safeUrl = (url?: string) => {
  const t = (url ?? "").trim()
  if (!t) return ""
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`
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
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

const API = {
  purchases: "/api/purchases",
  purchaseOrders: "/api/purchase-orders",
  purchaseOrderItems: "/api/purchase-order-items",
  membersTable: "/api/members/table",
  jobsTable: "/api/jobs",
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  })
  const ct = res.headers.get("content-type") ?? ""
  const isJson = ct.includes("application/json")
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    const detail = isJson && (body?.detail || body?.error)
      ? (body.detail || body.error)
      : `Request failed (${res.status})`
    throw new Error(detail)
  }
  return body as T
}

async function patchJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  })
  const ct = res.headers.get("content-type") ?? ""
  const isJson = ct.includes("application/json")
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    const detail = isJson && (body?.detail || body?.error)
      ? (body.detail || body.error)
      : `Request failed (${res.status})`
    throw new Error(detail)
  }
  return body as T
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable: debounce hook
// ─────────────────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Member Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
function MemberPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (m: MemberRow) => void
  onClose: () => void
}) {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dq = useDebounce(q, 320)
  const LIMIT = 8
  const abortRef = useRef<AbortController | null>(null)

  const fetchMembers = useCallback(async (p: number, search: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
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
      setError("No se pudo cargar la lista de miembros.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers(1, dq) }, [dq, fetchMembers])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <User className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Seleccionar Selling Rep</p>
              <p className="text-xs text-slate-400">{total} miembro{total !== 1 ? "s" : ""} disponibles</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={e => { setQ(e.target.value) }}
              placeholder="Buscar por nombre, rol, email…"
              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-xs text-slate-500">{error}</p>
              <button onClick={() => fetchMembers(page, dq)} className="text-xs text-emerald-600 hover:underline">Reintentar</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-slate-400">{q ? "Sin resultados para esta búsqueda" : "No hay miembros disponibles"}</p>
            </div>
          ) : rows.map(m => (
            <button
              key={m.ID_Member}
              onClick={() => onSelect(m)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/60 transition-colors group"
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(m.ID_Member)}`}>
                {initials(m.Member_Name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate group-hover:text-emerald-700">{m.Member_Name}</p>
                <p className="text-[11px] text-slate-400 truncate">{m.Company_Role ?? "Sin rol"} · {m.ID_Member}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
            <span className="text-xs text-slate-400">{page} / {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1 || loading} onClick={() => fetchMembers(page - 1, dq)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button disabled={page >= totalPages || loading} onClick={() => fetchMembers(page + 1, dq)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Job Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
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

function JobPickerModal({
  onSelect,
  onClose,
  onSkip,
}: {
  onSelect: (j: JobRow) => void
  onClose: () => void
  onSkip: () => void
}) {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<JobRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dq = useDebounce(q, 320)
  const LIMIT = 8
  const abortRef = useRef<AbortController | null>(null)

  const fetchJobs = useCallback(async (p: number, search: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
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
      setError("No se pudo cargar la lista de jobs.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs(1, dq) }, [dq, fetchJobs])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Briefcase className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Vincular Job</p>
              <p className="text-xs text-slate-400">{total} job{total !== 1 ? "s" : ""} disponibles · Opcional</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={e => { setQ(e.target.value) }}
              placeholder="Buscar por ID o nombre de proyecto…"
              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-xs text-slate-500">{error}</p>
              <button onClick={() => fetchJobs(page, dq)} className="text-xs text-emerald-600 hover:underline">Reintentar</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-slate-400">{q ? "Sin resultados para esta búsqueda" : "No hay jobs disponibles"}</p>
            </div>
          ) : rows.map(j => (
            <button
              key={j.ID_Jobs}
              onClick={() => onSelect(j)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/60 transition-colors group"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Briefcase className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 font-mono">{j.ID_Jobs}</p>
                  {j.Job_type && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${JOB_TYPE_COLORS[j.Job_type] ?? "bg-slate-100 text-slate-600"}`}>
                      {j.Job_type}
                    </span>
                  )}
                  {j.Job_status && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${JOB_STATUS_COLORS[j.Job_status] ?? "bg-slate-100 text-slate-600"}`}>
                      {j.Job_status}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                  {j.Project_name ?? "Sin nombre"}{j.client?.Client_Community ? ` · ${j.client.Client_Community}` : ""}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Pagination + footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5 gap-3">
          <button
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Omitir por ahora
          </button>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{page} / {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1 || loading} onClick={() => fetchJobs(page - 1, dq)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button disabled={page >= totalPages || loading} onClick={() => fetchJobs(page + 1, dq)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: "Compra", icon: ShoppingCart },
  { n: 2, label: "Orden", icon: ClipboardList },
  { n: 3, label: "Items", icon: Tag },
  { n: 4, label: "Vincular Job", icon: Link2 },
]

function StepIndicator({ step, done }: { step: Step; done: Partial<Record<Step, boolean>> }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const isDone = done[s.n as Step]
        const isActive = step === s.n
        const Icon = s.icon
        return (
          <div key={s.n} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all
              ${isActive ? "bg-emerald-600 text-white shadow-sm" :
                isDone ? "bg-emerald-50 text-emerald-700" :
                  "bg-slate-100 text-slate-400"}`}>
              {isDone && !isActive
                ? <CheckCircle2 className="h-3 w-3" />
                : <Icon className="h-3 w-3" />}
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 rounded-full transition-colors ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section card
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = "emerald",
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  children: React.ReactNode
  accent?: "emerald" | "slate" | "blue" | "amber"
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-100 text-slate-500 border-slate-200",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 border-b px-6 py-4 ${colors[accent]}`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-[11px] opacity-70 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Field label
// ─────────────────────────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
      {children}
      {required && <span className="text-red-400">*</span>}
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function CreatePurchasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams?.get("returnTo") ?? null
  const backUrl = returnTo ? decodeURIComponent(returnTo) : "/purchases"
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showMemberPicker, setShowMemberPicker] = useState(false)
  const [showJobPicker, setShowJobPicker] = useState(false)

  // Step 1 state
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null)
  const [description, setDescription] = useState("")

  // Step 2 state
  const [orderTitle, setOrderTitle] = useState("")

  // Step 3 state
  const [itemName, setItemName] = useState("")
  const [quoteShop, setQuoteShop] = useState("")
  const [quoteLink, setQuoteLink] = useState("")
  const [quoteValue, setQuoteValue] = useState("")

  // Step 4 state
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null)
  const [jobLinked, setJobLinked] = useState(false)

  // Created entities
  const [created, setCreated] = useState<CreatedPurchase>({
    ID_Purchase: null,
    Selling_rep: null,
    Description: null,
    Status: "In Progress",
    ID_Member: null,
    ID_Jobs: null,
    orders: [],
  })

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeOrder = useMemo(() => {
    if (!created.orders.length) return null
    return created.orders[created.orders.length - 1]
  }, [created.orders])

  const totals = useMemo(() => {
    const allItems = created.orders.flatMap(o => o.items)
    return {
      ordersCount: created.orders.length,
      itemsCount: allItems.length,
      totalQuoted: allItems.reduce((a, it) => a + asNumber(it.Quote_value), 0),
    }
  }, [created.orders])

  const done: Partial<Record<Step, boolean>> = {
    1: !!created.ID_Purchase,
    2: created.orders.length > 0,
    3: created.orders.some(o => o.items.length > 0),
    4: jobLinked,
  }

  const canCreatePurchase = !!selectedMember && description.trim().length > 0
  const canCreateOrder = orderTitle.trim().length > 0
  const canAddItem =
    itemName.trim().length > 0 &&
    quoteShop.trim().length > 0 &&
    safeUrl(quoteLink).length > 0 &&
    asNumber(quoteValue) > 0

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreatePurchase = async () => {
    if (!selectedMember) return
    setLoading(true); setError(null)
    try {
      const payload = {
        Selling_rep: selectedMember.Member_Name,
        Description: description.trim(),
        Status: "In Progress",
        ID_Member: selectedMember.ID_Member,
      }
      const data = await postJson<{ ID_Purchase?: string }>(API.purchases, payload)
      const id = data?.ID_Purchase
      if (!id) throw new Error("Purchase creada pero sin ID_Purchase en la respuesta")
      setCreated({
        ID_Purchase: id,
        Selling_rep: payload.Selling_rep,
        Description: payload.Description,
        Status: "In Progress",
        ID_Member: payload.ID_Member,
        ID_Jobs: null,
        orders: [],
      })
      setStep(2)
    } catch (e: any) {
      setError(e?.message ?? "Error al crear la compra")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!created.ID_Purchase) return
    setLoading(true); setError(null)
    try {
      const payload = {
        Order_title: orderTitle.trim(),
        Order_confirmation: false,
        ID_Purchase: created.ID_Purchase,
      }
      const data = await postJson<{ ID_PurchaseOrder?: string }>(API.purchaseOrders, payload)
      const id = data?.ID_PurchaseOrder
      if (!id) throw new Error("Orden creada pero sin ID_PurchaseOrder en la respuesta")
      setCreated(prev => ({
        ...prev,
        orders: [...prev.orders, { ID_PurchaseOrder: id, Order_title: payload.Order_title, items: [] }],
      }))
      setOrderTitle("")
      setStep(3)
    } catch (e: any) {
      setError(e?.message ?? "Error al crear la orden de compra")
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!activeOrder?.ID_PurchaseOrder) return
    setLoading(true); setError(null)
    try {
      const payload = {
        Name: itemName.trim(),
        Quote_shop: quoteShop.trim(),
        Quote_link: safeUrl(quoteLink),
        Quote_value: asNumber(quoteValue),
        Purchase_shop: "",
        Purchase_link: "",
        Purchase_value: null,
        ID_PurchaseOrder: activeOrder.ID_PurchaseOrder,
      }
      const data = await postJson<{ ID_PurchaseOrderItem?: string }>(API.purchaseOrderItems, payload)
      const id = data?.ID_PurchaseOrderItem
      if (!id) throw new Error("Item creado pero sin ID en la respuesta")
      setCreated(prev => {
        const orders = prev.orders.map(o => ({ ...o, items: [...o.items] }))
        const last = orders[orders.length - 1]
        orders[orders.length - 1] = { ...last, items: [...last.items, { ...payload, ID_PurchaseOrderItem: id }] }
        return { ...prev, orders }
      })
      setItemName(""); setQuoteShop(""); setQuoteLink(""); setQuoteValue("")
    } catch (e: any) {
      setError(e?.message ?? "Error al agregar el item")
    } finally {
      setLoading(false)
    }
  }

  const handleLinkJob = async (job: JobRow) => {
    if (!created.ID_Purchase) return
    setShowJobPicker(false)
    setLoading(true); setError(null)
    try {
      await patchJson(`${API.purchases}/${created.ID_Purchase}`, { ID_Jobs: job.ID_Jobs })
      setCreated(prev => ({ ...prev, ID_Jobs: job.ID_Jobs }))
      setSelectedJob(job)
      setJobLinked(true)
    } catch (e: any) {
      setError(e?.message ?? "Error al vincular el job")
    } finally {
      setLoading(false)
    }
  }

  const handleSkipJob = () => {
    setShowJobPicker(false)
    setJobLinked(true)
  }

  const removeLocalItem = (orderIdx: number, itemIdx: number) => {
    setCreated(prev => {
      const orders = prev.orders.map(o => ({ ...o, items: [...o.items] }))
      orders[orderIdx].items.splice(itemIdx, 1)
      return { ...prev, orders }
    })
  }



  if (!user) return null

  return (
    <>
      {showMemberPicker && (
        <MemberPickerModal
          onSelect={m => { setSelectedMember(m); setShowMemberPicker(false) }}
          onClose={() => setShowMemberPicker(false)}
        />
      )}
      {showJobPicker && (
        <JobPickerModal
          onSelect={handleLinkJob}
          onClose={() => setShowJobPicker(false)}
          onSkip={handleSkipJob}
        />
      )}

      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => router.push(backUrl)}
                    className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                        <ShoppingCart className="h-4.5 w-4.5 text-emerald-600" />
                      </div>
                      <h1 className="text-lg font-bold text-slate-900">Nueva Compra</h1>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Cotización guiada paso a paso · Compra → Orden → Items → Job
                    </p>
                  </div>
                </div>

                {/* Totals */}
                {created.ID_Purchase && (
                  <div className="flex flex-wrap items-center gap-2 self-center">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {totals.ordersCount} orden{totals.ordersCount !== 1 ? "es" : ""}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {totals.itemsCount} item{totals.itemsCount !== 1 ? "s" : ""}
                    </span>
                    {totals.totalQuoted > 0 && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        {money(totals.totalQuoted)} cotizado
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Content ──────────────────────────────────────────────────── */}
            <div className="p-6">

              {/* Step indicator */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <StepIndicator step={step} done={done} />
              </div>

              {/* Error banner */}
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="flex-1 text-xs text-red-700">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-3 lg:grid-cols-[1fr_320px]">
                {/* ── Main column ─────────────────────────────────────────── */}
                <div className="xl:col-span-2 space-y-5">

                  {/* ── STEP 1 ── */}
                  {step === 1 && (
                    <SectionCard icon={ShoppingCart} title="Información de la Compra" subtitle="El estado se establece automáticamente como In Progress" accent="emerald">
                      <div className="space-y-4">

                        {/* Selling Rep picker */}
                        <div>
                          <FieldLabel required>Selling Rep</FieldLabel>
                          {selectedMember ? (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(selectedMember.ID_Member)}`}>
                                {initials(selectedMember.Member_Name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800">{selectedMember.Member_Name}</p>
                                <p className="text-[11px] text-slate-500">{selectedMember.Company_Role ?? "Sin rol"} · {selectedMember.ID_Member}</p>
                              </div>
                              <button
                                onClick={() => setSelectedMember(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowMemberPicker(true)}
                              className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-left text-xs text-slate-500 hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700 transition-colors"
                            >
                              <User className="h-4 w-4 flex-shrink-0" />
                              <span>Seleccionar un miembro GQM como selling rep…</span>
                              <Search className="ml-auto h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                            </button>
                          )}
                        </div>

                        {/* Description */}
                        <div>
                          <FieldLabel required>Descripción</FieldLabel>
                          <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="ej. Tile 12x8 para baño principal"
                            className="border-slate-200 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
                          />
                        </div>

                        <div className="flex items-center justify-end pt-1">
                          <Button
                            disabled={!canCreatePurchase || loading}
                            onClick={handleCreatePurchase}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                            Crear Compra
                          </Button>
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  {/* ── STEP 2 ── */}
                  {step === 2 && (
                    <SectionCard icon={ClipboardList} title="Orden de Compra" subtitle="La confirmación y fecha de entrega se pueden agregar después" accent="blue">
                      <div className="space-y-4">
                        <div>
                          <FieldLabel required>Título de la orden</FieldLabel>
                          <Input
                            value={orderTitle}
                            onChange={e => setOrderTitle(e.target.value)}
                            placeholder="ej. Primera porción de Tile"
                            className="border-slate-200 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="gap-1.5 text-xs">
                            <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                          </Button>
                          <Button
                            disabled={!canCreateOrder || loading}
                            onClick={handleCreateOrder}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                            Crear Orden
                          </Button>
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  {/* ── STEP 3 ── */}
                  {step === 3 && (
                    <SectionCard icon={Tag} title="Items de Cotización" subtitle="Los campos de compra real se completan después cuando se confirme la orden" accent="amber">

                      {/* Current order badge */}
                      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <ClipboardList className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{activeOrder?.Order_title ?? "—"}</p>
                          <p className="text-[10px] font-mono text-slate-400">{activeOrder?.ID_PurchaseOrder}</p>
                        </div>
                      </div>

                      {/* Item form */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <div>
                          <FieldLabel required>Nombre del item</FieldLabel>
                          <Input value={itemName} onChange={e => setItemName(e.target.value)}
                            placeholder="ej. 1/4 Tile" className="border-slate-200 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <FieldLabel required>Tienda (Quote)</FieldLabel>
                            <Input value={quoteShop} onChange={e => setQuoteShop(e.target.value)}
                              placeholder="ej. Amazon" className="border-slate-200 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30" />
                          </div>
                          <div>
                            <FieldLabel required>Valor cotizado</FieldLabel>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                              <Input value={quoteValue} onChange={e => setQuoteValue(e.target.value)}
                                placeholder="0.00" inputMode="decimal"
                                className="pl-6 border-slate-200 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <FieldLabel required>Link de cotización</FieldLabel>
                          <Input value={quoteLink} onChange={e => setQuoteLink(e.target.value)}
                            placeholder="https://www.amazon.com/…" className="border-slate-200 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button disabled={!canAddItem || loading} onClick={handleAddItem}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            Agregar Item
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setItemName(""); setQuoteShop(""); setQuoteLink(""); setQuoteValue("") }}
                            className="text-xs">
                            Limpiar
                          </Button>
                        </div>
                      </div>

                      {/* Items list */}
                      {(activeOrder?.items?.length ?? 0) > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {activeOrder!.items.length} item{activeOrder!.items.length !== 1 ? "s" : ""} en esta orden
                          </p>
                          {activeOrder!.items.map((it, idx) => (
                            <div key={(it.ID_PurchaseOrderItem ?? "") + idx}
                              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
                              <Tag className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-700 truncate">{it.Name}</p>
                                <p className="text-[11px] text-slate-400">
                                  {it.Quote_shop} · <span className="text-emerald-600 font-semibold">{money(asNumber(it.Quote_value))}</span>
                                </p>
                              </div>
                              <button
                                onClick={() => removeLocalItem(created.orders.length - 1, idx)}
                                className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Quitar (solo UI)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Step 3 actions */}
                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <Button variant="outline" onClick={() => setStep(2)} disabled={loading} className="gap-1.5 text-xs">
                          <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                        </Button>
                        <Button variant="outline"
                          disabled={loading || (activeOrder?.items?.length ?? 0) < 1}
                          onClick={() => { setError(null); setOrderTitle(""); setStep(2) }}
                          className="text-xs gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Otra orden
                        </Button>
                        <Button
                          disabled={loading || (activeOrder?.items?.length ?? 0) < 1}
                          onClick={() => setStep(4)}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs ml-auto"
                        >
                          Continuar <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {(activeOrder?.items?.length ?? 0) < 1 && (
                        <p className="mt-2 text-[11px] text-slate-400 text-center">Agrega al menos 1 item para continuar</p>
                      )}
                    </SectionCard>
                  )}

                  {/* ── STEP 4 ── */}
                  {step === 4 && (
                    <SectionCard icon={Link2} title="Vincular Job" subtitle="Opcional — puede vincularse después desde el detalle de la compra" accent="slate">
                      <div className="space-y-4">
                        {jobLinked && selectedJob ? (
                          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                              <Briefcase className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold font-mono text-slate-800">{selectedJob.ID_Jobs}</p>
                                {selectedJob.Job_type && (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${JOB_TYPE_COLORS[selectedJob.Job_type] ?? "bg-slate-100 text-slate-600"}`}>
                                    {selectedJob.Job_type}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">{selectedJob.Project_name ?? "Sin nombre"}</p>
                            </div>
                            <button onClick={() => { setSelectedJob(null); setJobLinked(false) }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : jobLinked && !selectedJob ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                            <p className="text-xs text-slate-400">Sin job vinculado — se puede agregar después</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowJobPicker(true)}
                            className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3.5 text-left text-xs text-slate-500 hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700 transition-colors"
                          >
                            <Briefcase className="h-4 w-4 flex-shrink-0" />
                            <span>Buscar y vincular un Job a esta compra…</span>
                            <Search className="ml-auto h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                          </button>
                        )}

                        {!jobLinked && (
                          <Button variant="outline" className="w-full text-xs text-slate-500" onClick={handleSkipJob}>
                            Omitir por ahora
                          </Button>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <Button variant="outline" onClick={() => setStep(3)} disabled={loading} className="gap-1.5 text-xs">
                            <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                          </Button>
                          <Button
                            disabled={!jobLinked || loading}
                            onClick={() => router.push(backUrl)}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Finalizar
                          </Button>
                        </div>
                      </div>
                    </SectionCard>
                  )}
                </div>

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Progress summary */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resumen</p>
                    </div>
                    <div className="px-5 py-4 space-y-3">

                      {/* Purchase ID */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex-shrink-0">Purchase ID</span>
                        <span className="text-xs font-mono font-semibold text-slate-700 text-right">
                          {created.ID_Purchase ?? <span className="text-slate-300 font-sans font-normal">Pendiente</span>}
                        </span>
                      </div>

                      {/* Selling Rep */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex-shrink-0">Selling Rep</span>
                        <div className="flex items-center gap-1.5">
                          {selectedMember ? (
                            <>
                              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(selectedMember.ID_Member)}`}>
                                {initials(selectedMember.Member_Name)}
                              </div>
                              <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{selectedMember.Member_Name}</span>
                            </>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex-shrink-0">Descripción</span>
                        <span className="text-xs text-slate-700 text-right max-w-[160px] truncate">
                          {description || <span className="text-slate-300">—</span>}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex-shrink-0">Estado</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">In Progress</span>
                      </div>

                      {/* Job */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex-shrink-0">Job</span>
                        <span className="text-xs font-mono text-slate-700">
                          {selectedJob?.ID_Jobs ?? <span className="text-slate-300 font-sans">—</span>}
                        </span>
                      </div>

                      {/* Divider */}
                      {created.ID_Purchase && (
                        <>
                          <div className="h-px bg-slate-100" />
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Órdenes</span>
                            <span className="text-sm font-bold text-slate-700">{totals.ordersCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Items totales</span>
                            <span className="text-sm font-bold text-slate-700">{totals.itemsCount}</span>
                          </div>
                          {totals.totalQuoted > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">Total cotizado</span>
                              <span className="text-sm font-bold text-emerald-700">{money(totals.totalQuoted)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Orders list */}
                  {created.orders.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Órdenes ({created.orders.length})
                        </p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {created.orders.map((o, i) => (
                          <div key={(o.ID_PurchaseOrder ?? "") + i} className="px-5 py-3">
                            <p className="text-xs font-semibold text-slate-700 truncate">{o.Order_title ?? "Sin título"}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">{o.ID_PurchaseOrder}</span>
                              <span className="text-[10px] text-slate-400">· {o.items.length} item{o.items.length !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancel */}
                  <Button
                    variant="outline"
                    className="w-full text-xs text-slate-500"
                    onClick={() => router.push(backUrl)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}