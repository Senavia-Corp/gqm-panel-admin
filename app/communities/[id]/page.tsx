"use client"

import React, { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft, Save, X, Mail, Phone, Plus, Briefcase, Users, UserCheck,
  Search, Trash2, ExternalLink, MapPin, Globe, AlertCircle, ChevronRight,
  Loader2, RefreshCw, Building2, Wrench, Calendar, DollarSign, Tag, Shield, Activity,
  Send, CheckCircle2, Clock, CreditCard, TrendingUp, Filter, Info,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"
import { CommunityTimelineTab } from "@/components/organisms/community-detail/tabs/CommunityTimelineTab"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

// ─── Types ────────────────────────────────────────────────────────────────────

type ParentMgmtCo = {
  ID_Community_Tracking: string
  Property_mgmt_co: string | null
  Company_abbrev: string | null
  Main_office_hq: string | null
  State: string | null
  podio_item_id: string | null
}

type JobMember = {
  ID_Member: string
  Member_Name?: string | null
  rol?: string | null
}

type Job = {
  ID_Jobs: string
  Project_name?: string | null
  Project_location?: string | null
  Job_type?: string | null
  Job_status?: string | null
  Service_type?: string | null
  Permit?: string | null
  Date_assigned?: string | null
  Estimated_start_date?: string | null
  Estimated_completion_date?: string | null
  Pricing_target?: string | null
  Gqm_final_sold_pricing?: number | null
  Gqm_total_change_orders?: number | null
  Additional_detail?: string | null
  podio_item_id?: string | null
  Job_Description?: string | null
  Job_Status?: string | null
  members?: JobMember[]
}

type Manager = {
  ID_Manager: string
  Manager_name?: string | null
  Manager_email?: string | null
  Manager_location?: string | null
  ID_Community_Tracking?: string | null
  rol?: string | null
}

type Member = {
  ID_Member: string
  Member_Name?: string | null
  Company_Role?: string | null
  Email_Address?: string | null
  Phone_Number?: string | null
  podio_profile_id?: string | null
  rol?: string | null
}

type Client = {
  ID_Client: string
  Client_Community?: string | null
  Address?: string | null
  Website?: string | null
  Invoice_Collection?: string | null
  Compliance_Partner?: string | null
  Risk_Value?: string | null
  Maintenance_Sup?: string | null
  Email_Address?: string[] | string | null
  Phone_Number?: string[] | string | null
  Client_Status?: string | null
  Services_interested_in?: string | null
  Collection_Process?: string | null
  Payment_Collection?: string | null
  Text?: string | null
  podio_item_id?: string | null
  ID_Community_Tracking?: string | null
  // ✅ Ahora tipado correctamente
  parent_mgmt_co?: ParentMgmtCo | null
  jobs?: Job[]
  manager?: Manager[]
  members?: Member[]
}

type CommunityMetrics = {
  proposals: number
  approved_jobs: number
  in_progress_jobs: number
  paid_jobs: number
  paid_revenue: number
  filter: { month: number | null; year: number | null }
}

const MONTH_LABELS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const JOB_STATUS_COLOR: Record<string, string> = {
  "Assigned/P. Quote":            "bg-blue-500",
  "Waiting for Approval":         "bg-yellow-500",
  "Scheduled / Work in Progress": "bg-green-500",
  "Completed P. INV / POs":       "bg-emerald-600",
  "Invoiced":                     "bg-purple-500",
  "HOLD":                         "bg-orange-600",
  "PAID":                         "bg-green-600",
  "Paid":                         "bg-green-600",
  "Warranty":                     "bg-indigo-500",
  "Received-Stand By":            "bg-slate-500",
  "Assigned-In progress":         "bg-sky-500",
  "In Progress":                  "bg-sky-500",
  "Completed PVI":                "bg-teal-600",
  "Completed PVI / POs":          "bg-teal-600",
  "Cancelled":                    "bg-red-500",
  "Archived":                     "bg-gray-700",
}

// ✅ parent_mgmt_co en SKIP para que no se envíe en el PATCH
const SKIP_ON_PATCH: Array<keyof Client> = ["jobs", "manager", "members", "ID_Client", "parent_mgmt_co"]
type TabId = "details" | "jobs" | "managers" | "members" | "timeline"
type Props = { params: Promise<{ id: string }> }

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ⚠️  When `raw` is already an array (editing state), DO NOT filter out empty
// strings — they represent blank inputs the user just added with "Add another".
// Only filter when parsing a raw DB string (PostgreSQL set literal or plain).
function parseArrayField(raw: string[] | string | null | undefined, keepEmpty = false): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return keepEmpty ? raw : raw.filter(Boolean)
  const t = raw.trim()
  if (t.startsWith("{") && t.endsWith("}")) {
    const inner = t.slice(1, -1)
    const items: string[] = []
    let cur = "", inQ = false
    for (const ch of inner) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === "," && !inQ) { items.push(cur.trim()); cur = ""; continue }
      cur += ch
    }
    if (cur.trim()) items.push(cur.trim())
    return items.filter(Boolean)
  }
  return t ? [t] : []
}

function serializeArrayField(v: string[]): string[] { return v.filter((s) => s.trim()) }

function fmtDate(raw?: string | null) {
  if (!raw) return null
  try { return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return raw }
}

function fmtCurrency(val?: number | null) {
  if (!val) return null
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val)
}

// ─── Shared UI — definidos FUERA del componente principal ─────────────────────
// ✅ FIX FOCUS LOSS: Si estos estuvieran definidos DENTRO del componente
//    principal, React los re-crearía como nuevos tipos de componente en cada
//    render, desmontando los inputs activos y causando el bug donde se pierde
//    el foco al escribir una letra.

function Chips({ values, icon: Icon, linkPrefix, empty }: {
  values: string[]; icon: React.ElementType; linkPrefix?: string; empty: string
}) {
  if (!values.length) return (
    <p className="flex items-center gap-1.5 text-xs italic text-slate-400"><Icon className="h-3.5 w-3.5" />{empty}</p>
  )
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v, i) => linkPrefix ? (
        <a key={i} href={`${linkPrefix}${v}`}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
          <Icon className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" /><span className="max-w-[200px] truncate">{v}</span>
        </a>
      ) : (
        <span key={i} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
          <Icon className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" /><span className="max-w-[200px] truncate">{v}</span>
        </span>
      ))}
    </div>
  )
}

function ArrayEdit({ values, icon: Icon, placeholder, onChange, changed }: {
  values: string[]; icon: React.ElementType; placeholder: string
  onChange: (v: string[]) => void; changed?: boolean
}) {
  const items = values.length ? values : [""]
  return (
    <div className={`space-y-1.5 rounded-lg border p-2 ${changed ? "border-yellow-500 ring-2 ring-yellow-200" : "border-slate-200"}`}>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <input type="text" value={item} placeholder={placeholder}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n) }}
            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30" />
          <button type="button" onClick={() => items.length === 1 ? onChange([""]) : onChange(items.filter((_, i) => i !== idx))}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors">
        <Plus className="h-3 w-3" /> Add another
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs italic text-slate-400">—</span>
  const map: Record<string, string> = {
    "new client":         "bg-blue-100 text-blue-700 border-blue-200",
    "current client":     "bg-emerald-100 text-emerald-700 border-emerald-200",
    "no longer a client": "bg-slate-100 text-slate-500 border-slate-200",
    // legacy fallbacks
    active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive:  "bg-slate-100 text-slate-600 border-slate-200",
    pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
    "on hold": "bg-orange-100 text-orange-700 border-orange-200",
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status.toLowerCase()] ?? "bg-blue-100 text-blue-700 border-blue-200"}`}>
      {status}
    </span>
  )
}

function CompanyAvatar({ name, abbrev }: { name?: string | null; abbrev?: string | null }) {
  const initials = abbrev?.slice(0, 2) ?? (name ?? "?").slice(0, 2).toUpperCase()
  const COLORS = [
    ["#ECFDF5", "#059669"], ["#EFF6FF", "#2563EB"], ["#FFF7ED", "#EA580C"],
    ["#F5F3FF", "#7C3AED"], ["#FEF2F2", "#DC2626"], ["#F0FDF4", "#16A34A"],
  ]
  const [bg, fg] = COLORS[(initials.charCodeAt(0) ?? 0) % COLORS.length]
  return (
    <div style={{ background: bg, color: fg }}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-black">
      {initials}
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const name = job.Project_name ?? job.Job_Description ?? job.ID_Jobs
  const status = job.Job_status ?? job.Job_Status
  const price = fmtCurrency(job.Gqm_final_sold_pricing)
  const assignedDate = fmtDate(job.Date_assigned)
  const statusColors: Record<string, string> = {
    "assigned/p. quote": "bg-blue-50 text-blue-700 border-blue-200",
    "in progress":       "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed:              "bg-slate-100 text-slate-500 border-slate-200",
    pending:             "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed:           "bg-teal-50 text-teal-700 border-teal-200",
  }
  const statusCls = status ? (statusColors[status.toLowerCase()] ?? "bg-gray-100 text-gray-600 border-gray-200") : null
  const typeColors: Record<string, string> = { qid: "bg-violet-100 text-violet-700", wo: "bg-amber-100 text-amber-700", bid: "bg-cyan-100 text-cyan-700" }
  const typeCls = job.Job_type ? (typeColors[job.Job_type.toLowerCase()] ?? "bg-slate-100 text-slate-600") : null
  return (
    <button onClick={onClick} className="group w-full rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:border-violet-200 hover:shadow-md">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-violet-700 sm:text-base">{name}</p>
          <p className="font-mono text-[10px] text-slate-400 sm:text-[11px]">{job.ID_Jobs}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:flex-shrink-0">
          {typeCls && <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold sm:text-[11px] ${typeCls}`}>{job.Job_type}</span>}
          {statusCls && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${statusCls}`}>{status}</span>}
        </div>
      </div>

      {job.Project_location && (
        <div className="mb-3 flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <p className="line-clamp-2 text-xs text-slate-500 sm:line-clamp-1">{job.Project_location}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500 sm:text-xs">
        {job.Service_type && (
          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3 text-slate-400" />
            <span className="truncate max-w-[120px]">{job.Service_type}</span>
          </span>
        )}
        {assignedDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            {assignedDate}
          </span>
        )}
        {price && (
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            <DollarSign className="h-3 w-3" />
            {price}
          </span>
        )}
        {(job.Gqm_total_change_orders ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-orange-600">
            <Tag className="h-3 w-3" />
            {job.Gqm_total_change_orders} CO{job.Gqm_total_change_orders !== 1 ? "s" : ""}
          </span>
        )}
        {job.Permit && job.Permit !== "No" && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            Permit: {job.Permit}
          </span>
        )}
        <div className="ml-auto flex items-center">
          <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-400" />
        </div>
      </div>
    </button>
  )
}

// ─── Job filter helpers ───────────────────────────────────────────────────────

function JobFilterSelect({ label, icon, value, onValueChange, children }: {
  label: string; icon: React.ReactNode; value: string
  onValueChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 px-1">
        <span className="text-slate-400 group-focus-within:text-violet-600 transition-colors">{icon}</span>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">{label}</label>
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/30 group-focus-within:bg-white transition-all shadow-none hover:bg-slate-50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl shadow-xl border-slate-100 max-h-72">
          {children}
        </SelectContent>
      </Select>
    </div>
  )
}

function ActiveJobBadge({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
      <span className="text-slate-400 font-medium">{label}:</span>
      <span>{value}</span>
      <button onClick={onClear} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "details",  label: "Details",  icon: Building2 },
  { id: "jobs",     label: "Jobs",     icon: Briefcase },
  { id: "managers", label: "Managers", icon: UserCheck  },
  { id: "members",  label: "Members",  icon: Users      },
  { id: "timeline", label: "Timeline", icon: Activity   },
]

function TabBar({ active, onChange, counts }: {
  active: TabId; onChange: (t: TabId) => void; counts: Record<TabId, number | undefined>
}) {
  return (
    <div className="flex overflow-x-auto border-b border-slate-200 bg-white">
      {TABS.map(({ id, label, icon: Icon }) => {
        const on = active === id
        const count = counts[id]
        return (
          <button key={id} onClick={() => onChange(id)}
            className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors sm:gap-2 sm:px-5 sm:py-3 sm:text-sm
              ${on ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600" : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {count !== undefined && (
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Parent Company Selector Modal ────────────────────────────────────────────

function ParentCompanySelectorModal({ open, onOpenChange, onSelect }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSelect: (company: ParentMgmtCo) => void
}) {
  const [companies, setCompanies] = useState<ParentMgmtCo[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const first = await apiFetch("/api/parent_mgmt_co?page=1&limit=1", { cache: "no-store" })
      if (!first.ok) throw new Error(`Error ${first.status}`)
      const firstData = await first.json()
      const total: number = firstData.total ?? 0
      const limit = total > 0 ? total : 200
      const r = await apiFetch(`/api/parent_mgmt_co?page=1&limit=${limit}`, { cache: "no-store" })
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const d = await r.json()
      setCompanies(d.results ?? [])
    } catch (e: any) { setError(e?.message ?? "Failed to load companies") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (open) { setSearch(""); fetchCompanies() } }, [open, fetchCompanies])

  const filtered = companies.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [c.Property_mgmt_co, c.Company_abbrev, c.ID_Community_Tracking, c.State].filter(Boolean).join(" ").toLowerCase().includes(q)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" />Select Parent Company</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, abbrev, state…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/20" />
        </div>
        <div className="max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={fetchCompanies} className="text-xs text-emerald-600 hover:underline">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{search ? `No results for "${search}"` : "No companies available"}</p>
          ) : filtered.map((company) => (
            <button key={company.ID_Community_Tracking} onClick={() => { onSelect(company); onOpenChange(false) }}
              className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-sm">
              <CompanyAvatar name={company.Property_mgmt_co} abbrev={company.Company_abbrev} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-emerald-800">
                    {company.Property_mgmt_co ?? <span className="font-normal italic text-slate-400">Unnamed</span>}
                  </p>
                  {company.Company_abbrev && (
                    <span className="flex-shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                      {company.Company_abbrev}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">{company.ID_Community_Tracking}</span>
                  {company.State && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">{company.State}</span>}
                  {company.podio_item_id && <span className="flex items-center gap-0.5 text-[10px] text-violet-500"><ExternalLink className="h-2.5 w-2.5" />Podio</span>}
                </div>
                {company.Main_office_hq && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                    <MapPin className="h-2.5 w-2.5 flex-shrink-0" />{company.Main_office_hq}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </button>
          ))}
        </div>
        {!loading && !error && filtered.length > 0 && (
          <p className="text-right text-xs text-slate-400">{filtered.length} of {companies.length} companies</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Link Manager Modal ───────────────────────────────────────────────────────

function LinkManagerModal({ open, onOpenChange, clientId, syncPodio, existingIds, onLinked }: {
  open: boolean; onOpenChange: (v: boolean) => void; clientId: string; syncPodio: boolean
  existingIds: Set<string>; onLinked: (m: Manager) => void
}) {
  const ROLES = ["Prop. Manager", "Regional Manager"]
  const [search, setSearch] = useState("")
  const [allManagers, setAllManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const [rolMap, setRolMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setSearch(""); setRolMap({})
    setLoading(true)
    apiFetch("/api/managers?limit=200", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAllManagers(d.results ?? d ?? []))
      .catch(() => setAllManagers([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allManagers.filter((m) =>
      !existingIds.has(m.ID_Manager) &&
      (!q || (m.Manager_name ?? "").toLowerCase().includes(q) || (m.Manager_email ?? "").toLowerCase().includes(q))
    )
  }, [allManagers, existingIds, search])

  const doLink = async (m: Manager) => {
    setLinking(m.ID_Manager)
    try {
      const rol = rolMap[m.ID_Manager] ?? ""
      const r = await apiFetch(`/api/client_manager?clientId=${clientId}&managerId=${m.ID_Manager}&sync_podio=${syncPodio}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol }) })
      if (!r.ok) throw new Error(await r.text())
      onLinked({ ...m, rol }); toast({ title: "Manager linked" })
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setLinking(null) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            Link Existing Manager
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20" />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <UserCheck className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">{search ? `No results for "${search}"` : "No managers available to link"}</p>
            </div>
          ) : filtered.map((m) => (
            <div key={m.ID_Manager} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {(m.Manager_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{m.Manager_name ?? "—"}</p>
                <p className="truncate text-xs text-slate-400">{m.Manager_email ?? m.ID_Manager}</p>
              </div>
              <select value={rolMap[m.ID_Manager] ?? ""} onChange={(e) => setRolMap((p) => ({ ...p, [m.ID_Manager]: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400">
                <option value="">No role</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <Button size="sm" className="h-8 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-xs rounded-lg"
                disabled={linking === m.ID_Manager} onClick={() => doLink(m)}>
                {linking === m.ID_Manager ? <Loader2 className="h-3 w-3 animate-spin" /> : "Link"}
              </Button>
            </div>
          ))}
        </div>
        {!loading && filtered.length > 0 && (
          <p className="text-right text-xs text-slate-400">{filtered.length} manager{filtered.length !== 1 ? "s" : ""} available</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Manager Modal ─────────────────────────────────────────────────────

function CreateManagerModal({ open, onOpenChange, clientId, syncPodio, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void
  clientId: string; syncPodio: boolean; onCreated: (m: Manager) => void
}) {
  const ROLES = ["Prop. Manager", "Regional Manager"]
  const [form, setForm] = useState({ name: "", email: "", location: "", rol: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ name: "", email: "", location: "", rol: "" })
  }, [open])

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return }
    setSaving(true)
    try {
      // 1 — create the manager
      const createRes = await apiFetch("/api/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Manager_name: form.name.trim(), Manager_email: form.email.trim() || null, Manager_location: form.location.trim() || null }),
      })
      if (!createRes.ok) throw new Error(await createRes.text())
      const created: Manager = await createRes.json()

      // 2 — link to this community
      const linkRes = await apiFetch(
        `/api/client_manager?clientId=${clientId}&managerId=${created.ID_Manager}&sync_podio=${syncPodio}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol: form.rol }) }
      )
      if (!linkRes.ok) throw new Error(await linkRes.text())

      onCreated({ ...created, rol: form.rol })
      onOpenChange(false)
      toast({ title: "Manager created & linked" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <Plus className="h-4 w-4 text-emerald-600" />
            </div>
            Create New Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="City, State"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role in this community</label>
            <select value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20">
              <option value="">No role</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create & Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Manager Modal ───────────────────────────────────────────────────────

function EditManagerModal({ manager, open, onOpenChange, onSaved }: {
  manager: Manager | null; open: boolean; onOpenChange: (v: boolean) => void
  onSaved: (updated: Manager) => void
}) {
  const [form, setForm] = useState({ name: "", email: "", location: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (manager) setForm({
      name:     manager.Manager_name     ?? "",
      email:    manager.Manager_email    ?? "",
      location: manager.Manager_location ?? "",
    })
  }, [manager])

  const handleSave = async () => {
    if (!manager) return
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return }
    setSaving(true)
    try {
      const res = await apiFetch(`/api/managers/${manager.ID_Manager}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Manager_name: form.name.trim(), Manager_email: form.email.trim() || null, Manager_location: form.location.trim() || null }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated: Manager = await res.json()
      onSaved({ ...manager, ...updated })
      onOpenChange(false)
      toast({ title: "Manager updated" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <Save className="h-4 w-4 text-blue-600" />
            </div>
            Edit Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="City, State"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Link Member Modal ────────────────────────────────────────────────────────

function LinkMemberModal({ open, onOpenChange, clientId, syncPodio, existingIds, onLinked }: {
  open: boolean; onOpenChange: (v: boolean) => void; clientId: string; syncPodio: boolean
  existingIds: Set<string>; onLinked: (m: Member) => void
}) {
  const ROLES = ["Acc. Rep", "Inv/Acc Pro"]
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const [rolMap, setRolMap] = useState<Record<string, string>>({})

  const fetch_ = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await apiFetch(`/api/members?${q ? `q=${encodeURIComponent(q)}&` : ""}limit=30`, { cache: "no-store" })
      const d = await r.json(); setResults(d.results ?? d)
    } catch { setResults([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (open) { setSearch(""); fetch_("") } }, [open, fetch_])
  useEffect(() => { const t = setTimeout(() => { if (open) fetch_(search) }, 300); return () => clearTimeout(t) }, [search, open, fetch_])

  const doLink = async (m: Member) => {
    setLinking(m.ID_Member)
    try {
      const rol = rolMap[m.ID_Member] ?? ""
      const r = await apiFetch(`/api/client_member?clientId=${clientId}&memberId=${m.ID_Member}&sync_podio=${syncPodio}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol }) })
      if (!r.ok) throw new Error(await r.text())
      onLinked({ ...m, rol }); toast({ title: "Member linked" })
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setLinking(null) }
  }

  const filtered = results.filter((m) => !existingIds.has(m.ID_Member))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" />Link Member</DialogTitle></DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none" />
        </div>
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          : filtered.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No members found</p>
          : filtered.map((m) => (
            <div key={m.ID_Member} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {(m.Member_Name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.Member_Name ?? "—"}</p>
                <p className="truncate text-xs text-slate-500">{m.Company_Role ?? m.ID_Member}</p>
              </div>
              <select value={rolMap[m.ID_Member] ?? ""} onChange={(e) => setRolMap((p) => ({ ...p, [m.ID_Member]: e.target.value }))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none">
                <option value="">No role</option>{ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-xs" disabled={linking === m.ID_Member} onClick={() => doLink(m)}>
                {linking === m.ID_Member ? <Loader2 className="h-3 w-3 animate-spin" /> : "Link"}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientDetailPage({ params }: Props) {
  const router = useRouter()
  const { id: clientId } = use(params)

  const [user, setUser] = useState<any>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("details")
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<Partial<Client>>({})
  const [saving, setSaving] = useState(false)
  const [syncPodio, setSyncPodio] = useState(false)
  const [managerModalOpen, setManagerModalOpen] = useState(false)
  const [createManagerOpen, setCreateManagerOpen] = useState(false)
  const [editingManager, setEditingManager] = useState<Manager | null>(null)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [parentSelectorOpen, setParentSelectorOpen] = useState(false)
  const [unlinkingManager, setUnlinkingManager] = useState<string | null>(null)
  const [unlinkingMember, setUnlinkingMember] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const [metricsMonth, setMetricsMonth] = useState<string>("")
  const [metricsYear, setMetricsYear] = useState<string>("")
  const [metrics, setMetrics] = useState<CommunityMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)

  const [jobSearch, setJobSearch] = useState("")
  const [jobYear, setJobYear] = useState("")
  const [jobType, setJobType] = useState("")
  const [jobStatus, setJobStatus] = useState("")
  const [jobMemberId, setJobMemberId] = useState("")
  const [fullJobs, setFullJobs] = useState<Job[]>([])
  const [fullJobsLoading, setFullJobsLoading] = useState(false)
  const [jobsFetched, setJobsFetched] = useState(false)
  const [jobFiltersExpanded, setJobFiltersExpanded] = useState(false)

  const { hasPermission } = usePermissions()
  const canRead = hasPermission("client:read")
  const canUpdate = hasPermission("client:update")

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const fetchClient = useCallback(async () => {
    if (!clientId) return
    setLoading(true); setLoadError(null)
    try {
      const res = await apiFetch(`/api/clients/${clientId}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = (await res.json()) as Client
      const n: Client = {
        ...data,
        jobs: Array.isArray(data.jobs) ? data.jobs : [],
        manager: Array.isArray(data.manager) ? data.manager : [],
        members: Array.isArray(data.members) ? data.members : [],
        Email_Address: parseArrayField(data.Email_Address),
        Phone_Number: parseArrayField(data.Phone_Number),
      }
      setClient(n); setFormData(n)
    } catch (e: any) {
      setLoadError(e?.message ?? "Unknown error")
      toast({ title: "Error", description: "Failed to load client", variant: "destructive" })
    } finally { setLoading(false) }
  }, [clientId])

  useEffect(() => { fetchClient() }, [fetchClient])

  const fetchMetrics = useCallback(async () => {
    if (!clientId) return
    setMetricsLoading(true)
    try {
      const params = new URLSearchParams()
      if (metricsMonth) params.set("month", metricsMonth)
      if (metricsYear)  params.set("year",  metricsYear)
      const qs = params.toString() ? `?${params.toString()}` : ""
      const res = await apiFetch(`/api/clients/${clientId}/metrics${qs}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`${res.status}`)
      setMetrics(await res.json())
    } catch { setMetrics(null) }
    finally { setMetricsLoading(false) }
  }, [clientId, metricsMonth, metricsYear])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  const fetchFullJobs = useCallback(async () => {
    if (!clientId || jobsFetched) return
    setFullJobsLoading(true)
    try {
      const res = await apiFetch(`/api/jobs/by-client/${clientId}?page=1&limit=500`, { cache: "no-store" })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setFullJobs(data.results ?? data)
      setJobsFetched(true)
    } catch {
      setFullJobs(client?.jobs ?? [])
      setJobsFetched(true)
    } finally { setFullJobsLoading(false) }
  }, [clientId, jobsFetched, client?.jobs])

  useEffect(() => {
    if (activeTab === "jobs" && !jobsFetched) fetchFullJobs()
  }, [activeTab, jobsFetched, fetchFullJobs])

  const set_ = (field: keyof Client, value: any) => {
    setEditedFields((p) => new Set([...p, field as string]))
    setFormData((p) => ({ ...p, [field]: value }))
  }

  // ✅ Handler para seleccionar parent company desde el modal
  const handleSelectParent = (company: ParentMgmtCo) => {
    setEditedFields((p) => new Set([...p, "ID_Community_Tracking"]))
    setFormData((p) => ({ ...p, ID_Community_Tracking: company.ID_Community_Tracking, parent_mgmt_co: company }))
  }

  const handleClearParent = () => {
    setEditedFields((p) => new Set([...p, "ID_Community_Tracking"]))
    setFormData((p) => ({ ...p, ID_Community_Tracking: null, parent_mgmt_co: null }))
  }

  const handleSave = async () => {
    if (!clientId) return; setSaving(true)
    try {
      const payload: Record<string, any> = {}
      for (const [k, v] of Object.entries(formData)) {
        if (SKIP_ON_PATCH.includes(k as keyof Client)) continue
        if (!editedFields.has(k)) continue
        payload[k] = (k === "Email_Address" || k === "Phone_Number") ? serializeArrayField(parseArrayField(v as any)) : v
      }
      const res = await apiFetch(`/api/clients/${clientId}?sync_podio=${syncPodio}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(await res.text())
      const upd = (await res.json()) as Client
      const n: Client = {
        ...upd,
        // ✅ Preservar relaciones y parent_mgmt_co — el PATCH response no las devuelve
        jobs: client?.jobs ?? [],
        manager: client?.manager ?? [],
        members: client?.members ?? [],
        parent_mgmt_co: formData.parent_mgmt_co ?? client?.parent_mgmt_co ?? null,
        Email_Address: parseArrayField(upd.Email_Address),
        Phone_Number: parseArrayField(upd.Phone_Number),
      }
      setClient(n); setFormData(n); setIsEditing(false); setEditedFields(new Set())
      toast({ title: "Saved", description: "Community updated successfully" })
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setSaving(false) }
  }

  const unlinkMgr = async (id: string) => {
    setUnlinkingManager(id)
    try {
      const r = await apiFetch(`/api/client_manager?clientId=${clientId}&managerId=${id}&sync_podio=${syncPodio}`, { method: "DELETE" })
      if (!r.ok) throw new Error(await r.text())
      setClient((p) => p ? { ...p, manager: (p.manager ?? []).filter((m) => m.ID_Manager !== id) } : p)
      toast({ title: "Unlinked", description: "Manager removed" })
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setUnlinkingManager(null) }
  }

  const unlinkMem = async (id: string) => {
    setUnlinkingMember(id)
    try {
      const r = await apiFetch(`/api/client_member?clientId=${clientId}&memberId=${id}&sync_podio=${syncPodio}`, { method: "DELETE" })
      if (!r.ok) throw new Error(await r.text())
      setClient((p) => p ? { ...p, members: (p.members ?? []).filter((m) => m.ID_Member !== id) } : p)
      toast({ title: "Unlinked", description: "Member removed" })
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setUnlinkingMember(null) }
  }

  const dEmails = useMemo(() => parseArrayField(client?.Email_Address), [client?.Email_Address])
  const dPhones = useMemo(() => parseArrayField(client?.Phone_Number), [client?.Phone_Number])
  // keepEmpty=true so blank fields added by "Add another" are not filtered out during editing
  const eEmails = useMemo(() => parseArrayField(formData.Email_Address, true), [formData.Email_Address])
  const ePhones = useMemo(() => parseArrayField(formData.Phone_Number, true), [formData.Phone_Number])
  const exMgrIds = useMemo(() => new Set((client?.manager ?? []).map((m) => m.ID_Manager)), [client?.manager])
  const exMemIds = useMemo(() => new Set((client?.members ?? []).map((m) => m.ID_Member)), [client?.members])
  const ch = (f: keyof Client) => editedFields.has(f as string) ? "border-yellow-500 ring-2 ring-yellow-200" : ""

  const tabCounts: Record<TabId, number | undefined> = {
    details:  undefined,
    jobs:     jobsFetched ? fullJobs.length : (client?.jobs?.length ?? 0),
    managers: client?.manager?.length ?? 0,
    members:  client?.members?.length ?? 0,
    timeline: undefined,
  }

  const jobStatusOptions = useMemo(() => {
    const set = new Set<string>()
    fullJobs.forEach((j) => { const s = j.Job_status ?? j.Job_Status; if (s) set.add(s) })
    return Array.from(set).sort()
  }, [fullJobs])

  const jobMemberOptions = useMemo(() => {
    const map = new Map<string, string>()
    fullJobs.forEach((j) => {
      j.members?.forEach((m) => {
        if (m.ID_Member && !map.has(m.ID_Member)) map.set(m.ID_Member, m.Member_Name ?? m.ID_Member)
      })
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [fullJobs])

  const filteredJobs = useMemo(() => {
    const source = jobsFetched ? fullJobs : (client?.jobs ?? [])
    let result = source

    if (jobSearch) {
      const q = jobSearch.toLowerCase()
      result = result.filter((j) =>
        j.Project_name?.toLowerCase().includes(q) ||
        j.ID_Jobs?.toLowerCase().includes(q) ||
        j.Project_location?.toLowerCase().includes(q)
      )
    }

    if (jobYear) {
      result = result.filter((j) => {
        const dateStr = j.Job_type === "PTL" ? j.Estimated_start_date : j.Date_assigned
        if (!dateStr) return false
        return new Date(dateStr).getFullYear().toString() === jobYear
      })
    }

    if (jobType) {
      result = result.filter((j) => (j.Job_type ?? "").toUpperCase() === jobType.toUpperCase())
    }

    if (jobStatus) {
      result = result.filter((j) => (j.Job_status ?? j.Job_Status ?? "").toLowerCase() === jobStatus.toLowerCase())
    }

    if (jobMemberId) {
      result = result.filter((j) => j.members?.some((m) => m.ID_Member === jobMemberId))
    }

    return result
  }, [fullJobs, client?.jobs, jobsFetched, jobSearch, jobYear, jobType, jobStatus, jobMemberId])

  const hasJobFilters = jobSearch || jobYear || jobType || jobStatus || jobMemberId

  const website = client?.Website?.trim()
    ? (client.Website.startsWith("http") ? client.Website : `https://${client.Website}`) : null

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar /><div className="flex flex-1 flex-col overflow-hidden"><TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto"><div className="flex h-full items-center justify-center p-6">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading community…</p>
          </div>
        </div></main>
      </div>
    </div>
  )

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (!client) return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar /><div className="flex flex-1 flex-col overflow-hidden"><TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto"><div className="mx-auto max-w-xl p-6">
          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2 text-red-500"><AlertCircle className="h-5 w-5" /><h1 className="text-lg font-semibold">Community could not be loaded</h1></div>
            <p className="text-sm text-muted-foreground">{loadError ?? "Unknown error"}</p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
              <Button onClick={fetchClient} className="gap-2"><RefreshCw className="h-4 w-4" />Retry</Button>
            </div>
          </Card>
        </div></main>
      </div>
    </div>
  )

  if (!canRead && !loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 shadow-sm shadow-red-100">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Access Denied</h1>
            <p className="mt-2 max-w-sm text-slate-500">
              You do not have the <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-red-600 text-xs">client:read</code> permission required to access this resource.
            </p>
            <Button onClick={() => router.push("/clients")} variant="outline" className="mt-8 gap-2 rounded-xl group transition-all hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go Back to Clients
            </Button>
          </main>
        </div>
      </div>
    )
  }

  // parent a mostrar (puede venir del formData si el usuario lo cambió)
  const displayParent = formData.parent_mgmt_co ?? client.parent_mgmt_co

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="px-4 pt-3 pb-0 sm:px-6 sm:pt-4">
              <div className="mb-2 hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-slate-700">
                  <ArrowLeft className="h-3.5 w-3.5" />Back
                </button>
                <ChevronRight className="h-3.5 w-3.5" /><span>Community Detail</span>
              </div>

              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 pb-3">
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{client.Client_Community ?? "Unnamed Community"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{client.ID_Client}</span>
                    <StatusBadge status={client.Client_Status} />
                    {client.ID_Community_Tracking && (
                      <span className="text-xs text-slate-400">Parent: <span className="font-mono">{client.ID_Community_Tracking}</span></span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 sm:px-3">
                    <div className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${syncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                      onClick={() => setSyncPodio((v) => !v)}>
                      <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="hidden sm:inline">Sync Podio</span>
                  </label>

                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                        <Globe className="h-3.5 w-3.5" /><span className="hidden sm:inline">Website</span>
                      </Button>
                    </a>
                  )}

                  {activeTab === "details" && canUpdate && (
                    !isEditing
                      ? <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}
                          className="h-8 gap-1.5 text-xs border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
                          ✎<span className="hidden sm:inline"> Edit</span>
                        </Button>
                      : <>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                            onClick={() => { setIsEditing(false); setEditedFields(new Set()); setFormData(client) }}>
                            <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cancel</span>
                          </Button>
                          {editedFields.size > 0 && (
                            <Button size="sm" disabled={saving} onClick={handleSave} className="h-8 bg-gqm-green hover:bg-gqm-green/90 gap-1.5 text-xs">
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">Save</span>
                            </Button>
                          )}
                        </>
                  )}
                  {activeTab === "managers" && canUpdate && (
                    <Button size="sm" variant="outline" onClick={() => setManagerModalOpen(true)}
                      className="h-8 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Link Manager</span>
                    </Button>
                  )}
                  {activeTab === "members" && canUpdate && (
                    <Button size="sm" variant="outline" onClick={() => setMemberModalOpen(true)}
                      className="h-8 gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                      <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Link Member</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <TabBar active={activeTab} counts={tabCounts}
              onChange={(t) => { setActiveTab(t); if (t !== "details") { setIsEditing(false); setEditedFields(new Set()); setFormData(client) } }} />
          </div>

          {/* ── Tab panels ── */}
          <div className="p-4 sm:p-6">

            {/* DETAILS */}
            {activeTab === "details" && (
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
                  <Card className="overflow-hidden p-4 sm:p-6">
                    <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Community Information</h2>
                    <div className="grid min-w-0 gap-5 md:grid-cols-2">

                      <div className="min-w-0 md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Community Name</Label>
                        <Input disabled={!isEditing} value={formData.Client_Community ?? ""}
                          onChange={(e) => set_("Client_Community", e.target.value)} className={ch("Client_Community")} />
                      </div>

                      <div className="min-w-0 md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Address</Label>
                        {isEditing
                          ? <Textarea value={formData.Address ?? ""} onChange={(e) => set_("Address", e.target.value)} className={ch("Address")} rows={2} />
                          : <div className="flex items-start gap-1.5 text-sm text-slate-700">
                              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                              <span>{client.Address ?? <span className="italic text-slate-400">No address</span>}</span>
                            </div>
                        }
                      </div>

                      {/* ✅ Status — Select con las 3 opciones */}
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Status</Label>
                        {isEditing ? (
                          <Select value={formData.Client_Status ?? ""} onValueChange={(v) => set_("Client_Status", v)}>
                            <SelectTrigger className={ch("Client_Status")}><SelectValue placeholder="Select status…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="New Client">New Client</SelectItem>
                              <SelectItem value="Current Client">Current Client</SelectItem>
                              <SelectItem value="No Longer a Client">No Longer a Client</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="mt-1"><StatusBadge status={client.Client_Status} /></div>
                        )}
                      </div>

                      {/* ✅ Compliance Partner — Select */}
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Compliance Partner</Label>
                        {isEditing ? (
                          <Select value={formData.Compliance_Partner || "none"} onValueChange={(v) => set_("Compliance_Partner", v === "none" ? "" : v)}>
                            <SelectTrigger className={ch("Compliance_Partner")}><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input disabled value={client.Compliance_Partner ?? ""} />
                        )}
                      </div>

                      {/* ✅ Risk Value — Select */}
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Risk Value</Label>
                        {isEditing ? (
                          <Select value={formData.Risk_Value || ""} onValueChange={(v) => set_("Risk_Value", v)}>
                            <SelectTrigger className={ch("Risk_Value")}><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input disabled value={client.Risk_Value ?? ""} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Website</Label>
                        <Input disabled={!isEditing} value={formData.Website ?? ""}
                          onChange={(e) => set_("Website", e.target.value)} className={ch("Website")} placeholder="https://…" />
                      </div>

                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Email Address</Label>
                        {isEditing
                          ? <ArrayEdit values={eEmails} icon={Mail} placeholder="email@example.com" changed={editedFields.has("Email_Address")} onChange={(v) => set_("Email_Address", v)} />
                          : <Chips values={dEmails} icon={Mail} linkPrefix="mailto:" empty="No email" />}
                      </div>

                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Phone Number</Label>
                        {isEditing
                          ? <ArrayEdit values={ePhones} icon={Phone} placeholder="(555) 000-0000" changed={editedFields.has("Phone_Number")} onChange={(v) => set_("Phone_Number", v)} />
                          : <Chips values={dPhones} icon={Phone} linkPrefix="tel:" empty="No phone" />}
                      </div>

                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Maintenance Sup</Label>
                        <Input disabled={!isEditing} value={formData.Maintenance_Sup ?? ""}
                          onChange={(e) => set_("Maintenance_Sup", e.target.value)} className={ch("Maintenance_Sup")} />
                      </div>

                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-sm font-medium">Payment Collection</Label>
                        <Input disabled={!isEditing} value={formData.Payment_Collection ?? ""}
                          onChange={(e) => set_("Payment_Collection", e.target.value)} className={ch("Payment_Collection")} />
                      </div>

                      {/* ✅ Services Interested In — Select */}
                      <div className="min-w-0 md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Services Interested In</Label>
                        {isEditing ? (
                          <Select value={formData.Services_interested_in || ""} onValueChange={(v) => set_("Services_interested_in", v)}>
                            <SelectTrigger className={ch("Services_interested_in")}><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              {["Rehabs", "Work Orders", "Paint", "Plumbing", "HVAC", "General"].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input disabled value={client.Services_interested_in ?? ""} />
                        )}
                      </div>

                      <div className="min-w-0 md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Invoice Collection</Label>
                        <Textarea disabled={!isEditing} value={formData.Invoice_Collection ?? ""}
                          onChange={(e) => set_("Invoice_Collection", e.target.value)} className={ch("Invoice_Collection")} rows={2} />
                      </div>

                      <div className="min-w-0 md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Collection Process</Label>
                        <Textarea disabled={!isEditing} value={formData.Collection_Process ?? ""}
                          onChange={(e) => set_("Collection_Process", e.target.value)} className={ch("Collection_Process")} rows={2} />
                      </div>

                      <div className="min-w-0 md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Notes</Label>
                        <Textarea disabled={!isEditing} value={formData.Text ?? ""}
                          onChange={(e) => set_("Text", e.target.value)} className={ch("Text")} rows={3} />
                      </div>

                      {/* ✅ Parent Company — modal en edición, card en vista */}
                      <div className="min-w-0 md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Parent Company</Label>
                        {isEditing ? (
                          displayParent ? (
                            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                              <CompanyAvatar name={displayParent.Property_mgmt_co} abbrev={displayParent.Company_abbrev} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{displayParent.Property_mgmt_co ?? "Unnamed"}</p>
                                <p className="font-mono text-[11px] text-slate-500">{displayParent.ID_Community_Tracking}</p>
                              </div>
                              <button type="button" onClick={() => setParentSelectorOpen(true)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                                Change
                              </button>
                              <button type="button" onClick={handleClearParent}
                                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setParentSelectorOpen(true)}
                              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-400 transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-600">
                              <Building2 className="h-4 w-4 flex-shrink-0" />
                              <span>Click to select a parent company…</span>
                            </button>
                          )
                        ) : (
                          displayParent ? (
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                              <CompanyAvatar name={displayParent.Property_mgmt_co} abbrev={displayParent.Company_abbrev} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{displayParent.Property_mgmt_co ?? "Unnamed"}</p>
                                <p className="font-mono text-[11px] text-slate-500">{displayParent.ID_Community_Tracking}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs italic text-slate-400">No parent company assigned</p>
                          )
                        )}
                      </div>

                    </div>
                  </Card>
                </div>

                {/* Sidebar — Performance Dashboard */}
                <div className="min-w-0 space-y-4">
                  <Card className="p-4 sm:p-5">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Performance
                      </h3>
                      {(metricsMonth || metricsYear) && (
                        <button onClick={() => { setMetricsMonth(""); setMetricsYear("") }}
                          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                          <X className="h-2.5 w-2.5" />
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Filters */}
                    <div className="mb-4 flex gap-2">
                      <div className="relative flex-1">
                        <Filter className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <select value={metricsMonth} onChange={(e) => setMetricsMonth(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-6 pr-2 text-xs text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/30 transition-colors">
                          <option value="">All months</option>
                          {MONTH_LABELS.map((m, i) => (
                            <option key={m} value={String(i + 1)}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative flex-1">
                        <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <select value={metricsYear} onChange={(e) => setMetricsYear(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-6 pr-2 text-xs text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/30 transition-colors">
                          <option value="">All years</option>
                          {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                            <option key={y} value={String(y)}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Metrics */}
                    <TooltipProvider delayDuration={200}>
                    {metricsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="h-[60px] animate-pulse rounded-xl bg-slate-100" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Proposals */}
                        <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 text-violet-600 shadow-sm">
                            <Send className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] text-slate-500">Proposals sent</p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 cursor-help text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[220px] text-xs">
                                  Jobs in <strong>Waiting for Approval</strong> status for the selected period.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xl font-bold leading-tight text-violet-700">
                              {metrics?.proposals ?? <span className="text-slate-400">—</span>}
                            </p>
                          </div>
                        </div>

                        {/* Approved jobs */}
                        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 text-emerald-600 shadow-sm">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] text-slate-500">Approved jobs</p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 cursor-help text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[220px] text-xs">
                                  Jobs not in <strong>Assigned/P. Quote</strong>, <strong>Waiting for Approval</strong>, or <strong>Cancelled</strong> status.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xl font-bold leading-tight text-emerald-700">
                              {metrics?.approved_jobs ?? <span className="text-slate-400">—</span>}
                            </p>
                          </div>
                        </div>

                        {/* In progress */}
                        <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 text-blue-600 shadow-sm">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] text-slate-500">In progress</p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 cursor-help text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[220px] text-xs">
                                  Jobs in <strong>Scheduled / Work in Progress</strong>, <strong>Assigned-In progress</strong>, <strong>Invoiced</strong>, or <strong>In Progress</strong> status.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xl font-bold leading-tight text-blue-700">
                              {metrics?.in_progress_jobs ?? <span className="text-slate-400">—</span>}
                            </p>
                          </div>
                        </div>

                        {/* Revenue paid */}
                        <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 text-amber-600 shadow-sm">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] text-slate-500">Revenue collected</p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 cursor-help text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[220px] text-xs">
                                  Sum of <strong>Final Premium in Money</strong> for all jobs in <strong>Paid</strong> or <strong>PAID</strong> status.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="truncate text-lg font-bold leading-tight text-amber-700">
                              {metrics
                                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(metrics.paid_revenue)
                                : <span className="text-slate-400">—</span>
                              }
                            </p>
                          </div>
                        </div>

                        {/* Paid jobs count */}
                        <div className="flex items-center gap-3 rounded-xl bg-teal-50 p-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 text-teal-600 shadow-sm">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] text-slate-500">Paid jobs</p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 cursor-help text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[220px] text-xs">
                                  Total number of jobs in <strong>Paid</strong> or <strong>PAID</strong> status for the selected period.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xl font-bold leading-tight text-teal-700">
                              {metrics?.paid_jobs ?? <span className="text-slate-400">—</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    </TooltipProvider>

                    {/* Active filter label */}
                    {(metricsMonth || metricsYear) && !metricsLoading && (
                      <p className="mt-3 text-center text-[10px] text-slate-400">
                        {[metricsMonth ? MONTH_LABELS[+metricsMonth - 1] : null, metricsYear || null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </Card>

                  {syncPodio && (
                    <Card className="border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold text-emerald-700">🔄 Podio sync is ON</p>
                      <p className="mt-1 text-xs text-emerald-600">Changes will be pushed to Podio on save</p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* JOBS */}
            {activeTab === "jobs" && (
              <div className="space-y-4">
                {/* ── Filter card ── */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 space-y-4">

                    {/* Top row: title + count + filter toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-50 text-violet-700">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">Jobs</h3>
                          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                            {fullJobsLoading ? "Loading…" : `${filteredJobs.length.toLocaleString()} record${filteredJobs.length !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setJobFiltersExpanded((e) => !e)}
                        className={cn(
                          "flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold transition-all",
                          jobFiltersExpanded
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        <Filter className={cn("h-4 w-4", hasJobFilters && "text-yellow-400")} />
                        Filters
                        {hasJobFilters && (
                          <Badge className="h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-yellow-400 text-slate-900 border-none">
                            {[jobYear, jobType, jobStatus, jobMemberId].filter(Boolean).length}
                          </Badge>
                        )}
                        {jobFiltersExpanded
                          ? <ChevronUp className="h-4 w-4 ml-1" />
                          : <ChevronDown className="h-4 w-4 ml-1" />}
                      </button>
                    </div>

                    {/* Search row */}
                    <div className="flex gap-2 sm:gap-3">
                      <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-600 transition-colors sm:left-4" />
                        <input
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                          placeholder="Search by name, ID, location…"
                          className="w-full h-11 pl-10 sm:pl-12 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/20 transition-all"
                        />
                      </div>
                      {hasJobFilters && (
                        <button
                          onClick={() => { setJobSearch(""); setJobYear(""); setJobType(""); setJobStatus(""); setJobMemberId("") }}
                          className="flex items-center gap-1.5 h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shrink-0"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="hidden sm:inline">Reset</span>
                        </button>
                      )}
                    </div>

                    {/* Expandable filter panel */}
                    <div className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      jobFiltersExpanded
                        ? "grid-rows-[1fr] opacity-100 pt-4 border-t border-slate-100"
                        : "grid-rows-[0fr] opacity-0 invisible overflow-hidden"
                    )}>
                      <div className="overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                          <JobFilterSelect
                            label="Year"
                            icon={<Calendar className="h-3.5 w-3.5" />}
                            value={jobYear || "all"}
                            onValueChange={(v) => setJobYear(v === "all" ? "" : v)}
                          >
                            <SelectItem value="all">All years</SelectItem>
                            {["2026", "2025", "2024", "2023"].map((y) => (
                              <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                          </JobFilterSelect>

                          <JobFilterSelect
                            label="Type"
                            icon={<Tag className="h-3.5 w-3.5" />}
                            value={jobType || "all"}
                            onValueChange={(v) => setJobType(v === "all" ? "" : v)}
                          >
                            <SelectItem value="all">All types</SelectItem>
                            {["QID", "PTL", "PAR"].map((tp) => (
                              <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                            ))}
                          </JobFilterSelect>

                          <JobFilterSelect
                            label="Status"
                            icon={<Activity className="h-3.5 w-3.5" />}
                            value={jobStatus || "all"}
                            onValueChange={(v) => setJobStatus(v === "all" ? "" : v)}
                          >
                            <SelectItem value="all">All statuses</SelectItem>
                            {jobStatusOptions.map((s) => (
                              <SelectItem key={s} value={s}>
                                <div className="flex items-center gap-2">
                                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", JOB_STATUS_COLOR[s] ?? "bg-slate-400")} />
                                  {s}
                                </div>
                              </SelectItem>
                            ))}
                          </JobFilterSelect>

                          <JobFilterSelect
                            label="Member"
                            icon={<Users className="h-3.5 w-3.5" />}
                            value={jobMemberId || "all"}
                            onValueChange={(v) => setJobMemberId(v === "all" ? "" : v)}
                          >
                            <SelectItem value="all">All members</SelectItem>
                            {jobMemberOptions.map(({ id, name }) => (
                              <SelectItem key={id} value={id}>{name}</SelectItem>
                            ))}
                          </JobFilterSelect>
                        </div>
                      </div>
                    </div>

                    {/* Active filter badges when panel is collapsed */}
                    {hasJobFilters && !jobFiltersExpanded && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {jobYear     && <ActiveJobBadge label="Year"   value={jobYear}   onClear={() => setJobYear("")} />}
                        {jobType     && <ActiveJobBadge label="Type"   value={jobType}   onClear={() => setJobType("")} />}
                        {jobStatus   && <ActiveJobBadge label="Status" value={jobStatus} onClear={() => setJobStatus("")} />}
                        {jobMemberId && <ActiveJobBadge label="Member" value={jobMemberOptions.find((m) => m.id === jobMemberId)?.name ?? jobMemberId} onClear={() => setJobMemberId("")} />}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Job grid ── */}
                {fullJobsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16">
                    <Briefcase className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      {hasJobFilters ? "No jobs match the current filters" : "No jobs associated yet"}
                    </p>
                    {hasJobFilters && (
                      <button
                        onClick={() => { setJobSearch(""); setJobYear(""); setJobType(""); setJobStatus(""); setJobMemberId("") }}
                        className="text-xs text-violet-600 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredJobs.map((job) => (
                      <JobCard key={job.ID_Jobs} job={job} onClick={() => router.push(`/jobs/${job.ID_Jobs}`)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MANAGERS */}
            {activeTab === "managers" && (
              <div className="space-y-4">
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Property Managers</h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        {client.manager?.length ?? 0} linked
                      </p>
                    </div>
                  </div>
                  {canUpdate && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"
                        className="h-9 gap-2 rounded-xl border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                        onClick={() => setManagerModalOpen(true)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Link existing</span>
                      </Button>
                      <Button size="sm"
                        className="h-9 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setCreateManagerOpen(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">New manager</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── Empty state or grid ── */}
                {(client.manager?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-16">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                      <UserCheck className="h-7 w-7 text-emerald-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No managers linked yet</p>
                    <p className="text-xs text-slate-400">Create a new manager or link an existing one</p>
                    {canUpdate && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => setManagerModalOpen(true)} className="text-xs font-semibold text-emerald-600 hover:underline">Link existing</button>
                        <span className="text-xs text-slate-300">·</span>
                        <button onClick={() => setCreateManagerOpen(true)} className="text-xs font-semibold text-emerald-600 hover:underline">Create new</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {client.manager!.map((mgr) => {
                      const initials = (mgr.Manager_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                      return (
                        <div key={mgr.ID_Manager}
                          className="group relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">

                          {/* Avatar + name row */}
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-black text-white shadow-sm">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p className="truncate text-sm font-bold text-slate-800" title={mgr.Manager_name ?? ""}>{mgr.Manager_name ?? "—"}</p>
                              <p className="font-mono text-[10px] text-slate-400">{mgr.ID_Manager}</p>
                            </div>
                          </div>

                          {/* Contact info */}
                          <div className="space-y-1.5">
                            {mgr.Manager_email ? (
                              <a href={`mailto:${mgr.Manager_email}`}
                                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group/link">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 group-hover/link:text-emerald-500" />
                                <span className="truncate">{mgr.Manager_email}</span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-400 italic">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />No email
                              </div>
                            )}
                            {mgr.Manager_location ? (
                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                                <span className="truncate">{mgr.Manager_location}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-400 italic">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />No location
                              </div>
                            )}
                          </div>

                          {/* Role badge */}
                          {mgr.rol && (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              <Shield className="h-3 w-3" />
                              {mgr.rol}
                            </span>
                          )}

                          {/* Action buttons */}
                          {canUpdate && (
                            <div className="flex gap-2 pt-1 border-t border-slate-100">
                              <button
                                onClick={() => setEditingManager(mgr)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                <Save className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <div className="w-px bg-slate-100" />
                              <button
                                onClick={() => unlinkMgr(mgr.ID_Manager)}
                                disabled={unlinkingManager === mgr.ID_Manager}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50">
                                {unlinkingManager === mgr.ID_Manager
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
                                Unlink
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MEMBERS */}
            {activeTab === "members" && (
              <div className="space-y-4">
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">GQM Members</h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        {client.members?.length ?? 0} linked
                      </p>
                    </div>
                  </div>
                  {canUpdate && (
                    <Button size="sm" variant="outline"
                      className="h-9 gap-2 rounded-xl border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                      onClick={() => setMemberModalOpen(true)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Link member</span>
                    </Button>
                  )}
                </div>

                {/* ── Empty state or grid ── */}
                {(client.members?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-16">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                      <Users className="h-7 w-7 text-blue-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No members linked yet</p>
                    <p className="text-xs text-slate-400">Link a GQM member to this community</p>
                    {canUpdate && (
                      <button onClick={() => setMemberModalOpen(true)} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
                        Link a member
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {client.members!.map((mem) => {
                      const initials = (mem.Member_Name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                      return (
                        <div key={mem.ID_Member}
                          className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">

                          {/* Avatar + name row */}
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-sm font-black text-white shadow-sm">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p className="truncate text-sm font-bold text-slate-800" title={mem.Member_Name ?? ""}>{mem.Member_Name ?? "—"}</p>
                              <p className="font-mono text-[10px] text-slate-400">{mem.ID_Member}</p>
                            </div>
                          </div>

                          {/* Contact & role info */}
                          <div className="space-y-1.5">
                            {mem.Company_Role && (
                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                                <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                                <span className="truncate">{mem.Company_Role}</span>
                              </div>
                            )}
                            {mem.Email_Address ? (
                              <a href={`mailto:${mem.Email_Address}`}
                                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors group/link">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 group-hover/link:text-blue-500" />
                                <span className="truncate">{mem.Email_Address}</span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-400 italic">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />No email
                              </div>
                            )}
                            {mem.Phone_Number && (
                              <a href={`tel:${mem.Phone_Number}`}
                                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors group/phone">
                                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 group-hover/phone:text-blue-500" />
                                <span className="truncate">{mem.Phone_Number}</span>
                              </a>
                            )}
                          </div>

                          {/* Community role badge */}
                          {mem.rol && (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                              <Shield className="h-3 w-3" />
                              {mem.rol}
                            </span>
                          )}

                          {/* Unlink action */}
                          {canUpdate && (
                            <div className="border-t border-slate-100 pt-1">
                              <button
                                onClick={() => unlinkMem(mem.ID_Member)}
                                disabled={unlinkingMember === mem.ID_Member}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50">
                                {unlinkingMember === mem.ID_Member
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
                                Unlink
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE */}
            {activeTab === "timeline" && (
              <CommunityTimelineTab clientId={clientId} />
            )}
          </div>

          {/* ── Modals ── */}
          <LinkManagerModal open={managerModalOpen} onOpenChange={setManagerModalOpen}
            clientId={clientId} syncPodio={syncPodio} existingIds={exMgrIds}
            onLinked={(m) => { setClient((p) => p ? { ...p, manager: [...(p.manager ?? []), m] } : p); setManagerModalOpen(false) }} />
          <CreateManagerModal open={createManagerOpen} onOpenChange={setCreateManagerOpen}
            clientId={clientId} syncPodio={syncPodio}
            onCreated={(m) => setClient((p) => p ? { ...p, manager: [...(p.manager ?? []), m] } : p)} />
          <EditManagerModal manager={editingManager} open={!!editingManager} onOpenChange={(v) => { if (!v) setEditingManager(null) }}
            onSaved={(updated) => {
              setClient((p) => p ? { ...p, manager: (p.manager ?? []).map((m) => m.ID_Manager === updated.ID_Manager ? { ...m, ...updated } : m) } : p)
              setEditingManager(null)
            }} />
          <LinkMemberModal open={memberModalOpen} onOpenChange={setMemberModalOpen}
            clientId={clientId} syncPodio={syncPodio} existingIds={exMemIds}
            onLinked={(m) => { setClient((p) => p ? { ...p, members: [...(p.members ?? []), m] } : p); setMemberModalOpen(false) }} />
          <ParentCompanySelectorModal
            open={parentSelectorOpen}
            onOpenChange={setParentSelectorOpen}
            onSelect={handleSelectParent}
          />
        </main>
      </div>
    </div>
  )
}