"use client"

import React, { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
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
  Loader2, RefreshCw, Building2, Wrench, Calendar, DollarSign, Tag, Shield
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"

// ─── Types ────────────────────────────────────────────────────────────────────

type ParentMgmtCo = {
  ID_Community_Tracking: string
  Property_mgmt_co: string | null
  Company_abbrev: string | null
  Main_office_hq: string | null
  State: string | null
  podio_item_id: string | null
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
  Estimated_completion_date?: string | null
  Pricing_target?: string | null
  Gqm_final_sold_pricing?: number | null
  Gqm_total_change_orders?: number | null
  Additional_detail?: string | null
  podio_item_id?: string | null
  Job_Description?: string | null
  Job_Status?: string | null
}

type Manager = {
  ID_Manager: string
  Manager_name?: string | null
  Manager_email?: string | null
  Manager_location?: string | null
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

// ✅ parent_mgmt_co en SKIP para que no se envíe en el PATCH
const SKIP_ON_PATCH: Array<keyof Client> = ["jobs", "manager", "members", "ID_Client", "parent_mgmt_co"]
type TabId = "details" | "jobs" | "managers" | "members"
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
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-violet-700">{name}</p>
          <p className="font-mono text-[11px] text-slate-400">{job.ID_Jobs}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {typeCls && <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${typeCls}`}>{job.Job_type}</span>}
          {statusCls && <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusCls}`}>{status}</span>}
        </div>
      </div>
      {job.Project_location && (
        <div className="mb-2 flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <p className="line-clamp-1 text-xs text-slate-500">{job.Project_location}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {job.Service_type && <span className="flex items-center gap-1"><Wrench className="h-3 w-3 text-slate-400" />{job.Service_type}</span>}
        {assignedDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" />{assignedDate}</span>}
        {price && <span className="flex items-center gap-1 font-semibold text-emerald-700"><DollarSign className="h-3 w-3" />{price}</span>}
        {(job.Gqm_total_change_orders ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-orange-600"><Tag className="h-3 w-3" />{job.Gqm_total_change_orders} CO{job.Gqm_total_change_orders !== 1 ? "s" : ""}</span>
        )}
        {job.Permit && job.Permit !== "No" && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">Permit: {job.Permit}</span>
        )}
        <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-300 group-hover:text-violet-400" />
      </div>
    </button>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "details",  label: "Details",  icon: Building2 },
  { id: "jobs",     label: "Jobs",     icon: Briefcase },
  { id: "managers", label: "Managers", icon: UserCheck  },
  { id: "members",  label: "Members",  icon: Users      },
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
            className={`relative flex items-center gap-2 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors
              ${on ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600" : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="h-4 w-4" />
            {label}
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
  const [results, setResults] = useState<Manager[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const [rolMap, setRolMap] = useState<Record<string, string>>({})

  const fetch_ = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await apiFetch(`/api/managers?${q ? `q=${encodeURIComponent(q)}&` : ""}limit=30`, { cache: "no-store" })
      const d = await r.json(); setResults(d.results ?? d)
    } catch { setResults([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (open) { setSearch(""); fetch_("") } }, [open, fetch_])
  useEffect(() => { const t = setTimeout(() => { if (open) fetch_(search) }, 300); return () => clearTimeout(t) }, [search, open, fetch_])

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

  const filtered = results.filter((m) => !existingIds.has(m.ID_Manager))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-emerald-600" />Link Manager</DialogTitle></DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search managers…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none" />
        </div>
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          : filtered.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No managers found</p>
          : filtered.map((m) => (
            <div key={m.ID_Manager} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                {(m.Manager_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.Manager_name ?? "—"}</p>
                <p className="truncate text-xs text-slate-500">{m.Manager_email ?? m.ID_Manager}</p>
              </div>
              <select value={rolMap[m.ID_Manager] ?? ""} onChange={(e) => setRolMap((p) => ({ ...p, [m.ID_Manager]: e.target.value }))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none">
                <option value="">No role</option>{ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs" disabled={linking === m.ID_Manager} onClick={() => doLink(m)}>
                {linking === m.ID_Manager ? <Loader2 className="h-3 w-3 animate-spin" /> : "Link"}
              </Button>
            </div>
          ))}
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
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [parentSelectorOpen, setParentSelectorOpen] = useState(false)
  const [unlinkingManager, setUnlinkingManager] = useState<string | null>(null)
  const [unlinkingMember, setUnlinkingMember] = useState<string | null>(null)

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
    details: undefined,
    jobs: client?.jobs?.length ?? 0,
    managers: client?.manager?.length ?? 0,
    members: client?.members?.length ?? 0,
  }

  const website = client?.Website?.trim()
    ? (client.Website.startsWith("http") ? client.Website : `https://${client.Website}`) : null

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar /><div className="flex flex-1 flex-col overflow-hidden"><TopBar />
        <main className="flex-1 overflow-y-auto"><div className="flex h-full items-center justify-center p-6">
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
        <main className="flex-1 overflow-y-auto"><div className="mx-auto max-w-xl p-6">
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
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="px-6 pt-4 pb-0">
              <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-slate-700">
                  <ArrowLeft className="h-3.5 w-3.5" />Back
                </button>
                <ChevronRight className="h-3.5 w-3.5" /><span>Community Detail</span>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{client.Client_Community ?? "Unnamed Community"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{client.ID_Client}</span>
                    <StatusBadge status={client.Client_Status} />
                    {client.ID_Community_Tracking && (
                      <span className="text-xs text-slate-400">Parent: <span className="font-mono">{client.ID_Community_Tracking}</span></span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300">
                    <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${syncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                      onClick={() => setSyncPodio((v) => !v)}>
                      <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </div>
                    Sync Podio
                  </label>

                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Globe className="h-3.5 w-3.5" />Website</Button>
                    </a>
                  )}

                  {activeTab === "details" && canUpdate && (
                    !isEditing
                      ? <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}
                          className="h-8 gap-1.5 text-xs border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700">✎ Edit</Button>
                      : <>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                            onClick={() => { setIsEditing(false); setEditedFields(new Set()); setFormData(client) }}>
                            <X className="h-3.5 w-3.5" />Cancel
                          </Button>
                          {editedFields.size > 0 && (
                            <Button size="sm" disabled={saving} onClick={handleSave} className="h-8 bg-gqm-green hover:bg-gqm-green/90 gap-1.5 text-xs">
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save
                            </Button>
                          )}
                        </>
                  )}
                  {activeTab === "managers" && canUpdate && (
                    <Button size="sm" variant="outline" onClick={() => setManagerModalOpen(true)}
                      className="h-8 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <Plus className="h-3.5 w-3.5" />Link Manager
                    </Button>
                  )}
                  {activeTab === "members" && canUpdate && (
                    <Button size="sm" variant="outline" onClick={() => setMemberModalOpen(true)}
                      className="h-8 gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                      <Plus className="h-3.5 w-3.5" />Link Member
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <TabBar active={activeTab} counts={tabCounts}
              onChange={(t) => { setActiveTab(t); if (t !== "details") { setIsEditing(false); setEditedFields(new Set()); setFormData(client) } }} />
          </div>

          {/* ── Tab panels ── */}
          <div className="p-6">

            {/* DETAILS */}
            {activeTab === "details" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <Card className="p-6">
                    <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Community Information</h2>
                    <div className="grid gap-5 md:grid-cols-2">

                      <div className="md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Community Name</Label>
                        <Input disabled={!isEditing} value={formData.Client_Community ?? ""}
                          onChange={(e) => set_("Client_Community", e.target.value)} className={ch("Client_Community")} />
                      </div>

                      <div className="md:col-span-2">
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
                      <div>
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
                      <div>
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
                      <div>
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

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium">Website</Label>
                        <Input disabled={!isEditing} value={formData.Website ?? ""}
                          onChange={(e) => set_("Website", e.target.value)} className={ch("Website")} placeholder="https://…" />
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium">Email Address</Label>
                        {isEditing
                          ? <ArrayEdit values={eEmails} icon={Mail} placeholder="email@example.com" changed={editedFields.has("Email_Address")} onChange={(v) => set_("Email_Address", v)} />
                          : <Chips values={dEmails} icon={Mail} linkPrefix="mailto:" empty="No email" />}
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium">Phone Number</Label>
                        {isEditing
                          ? <ArrayEdit values={ePhones} icon={Phone} placeholder="(555) 000-0000" changed={editedFields.has("Phone_Number")} onChange={(v) => set_("Phone_Number", v)} />
                          : <Chips values={dPhones} icon={Phone} linkPrefix="tel:" empty="No phone" />}
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium">Maintenance Sup</Label>
                        <Input disabled={!isEditing} value={formData.Maintenance_Sup ?? ""}
                          onChange={(e) => set_("Maintenance_Sup", e.target.value)} className={ch("Maintenance_Sup")} />
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium">Payment Collection</Label>
                        <Input disabled={!isEditing} value={formData.Payment_Collection ?? ""}
                          onChange={(e) => set_("Payment_Collection", e.target.value)} className={ch("Payment_Collection")} />
                      </div>

                      {/* ✅ Services Interested In — Select */}
                      <div className="md:col-span-2">
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

                      <div className="md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Invoice Collection</Label>
                        <Textarea disabled={!isEditing} value={formData.Invoice_Collection ?? ""}
                          onChange={(e) => set_("Invoice_Collection", e.target.value)} className={ch("Invoice_Collection")} rows={2} />
                      </div>

                      <div className="md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Collection Process</Label>
                        <Textarea disabled={!isEditing} value={formData.Collection_Process ?? ""}
                          onChange={(e) => set_("Collection_Process", e.target.value)} className={ch("Collection_Process")} rows={2} />
                      </div>

                      <div className="md:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium">Notes</Label>
                        <Textarea disabled={!isEditing} value={formData.Text ?? ""}
                          onChange={(e) => set_("Text", e.target.value)} className={ch("Text")} rows={3} />
                      </div>

                      {/* ✅ Parent Company — modal en edición, card en vista */}
                      <div className="md:col-span-2">
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

                {/* Sidebar */}
                <div className="space-y-4">
                  <Card className="p-5">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Info</h3>
                    <dl className="space-y-3">
                      {[
                        { label: "Client ID", value: client.ID_Client },
                        // ✅ Optional chaining — ya no lanza runtime error si parent_mgmt_co es null
                        { label: "Parent Co.", value: client.parent_mgmt_co?.Property_mgmt_co ?? null },
                        { label: "Podio ID",   value: client.podio_item_id },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <dt className="text-xs font-medium text-slate-500">{label}</dt>
                          <dd className="mt-0.5 font-mono text-sm text-slate-700">{value ?? <span className="font-sans italic text-slate-400">—</span>}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                  <Card className="p-5">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Summary</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Jobs",     count: client.jobs?.length ?? 0,    color: "text-violet-600",  bg: "bg-violet-50"  },
                        { label: "Managers", count: client.manager?.length ?? 0,  color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Members",  count: client.members?.length ?? 0,  color: "text-blue-600",    bg: "bg-blue-50"    },
                      ].map(({ label, count, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center rounded-lg ${bg} p-3`}>
                          <span className={`text-lg font-bold ${color}`}>{count}</span>
                          <span className="mt-0.5 text-[10px] text-slate-500">{label}</span>
                        </div>
                      ))}
                    </div>
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
              (client.jobs?.length ?? 0) === 0
                ? <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16">
                    <Briefcase className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No jobs associated yet</p>
                  </div>
                : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {client.jobs!.map((job) => (
                      <JobCard key={job.ID_Jobs} job={job} onClick={() => router.push(`/jobs/${job.ID_Jobs}`)} />
                    ))}
                  </div>
            )}

            {/* MANAGERS */}
            {activeTab === "managers" && (
              (client.manager?.length ?? 0) === 0
                ? <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16">
                    <UserCheck className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No managers linked yet</p>
                    <button onClick={() => setManagerModalOpen(true)} className="text-xs text-emerald-600 hover:underline">Link a manager</button>
                  </div>
                : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {client.manager!.map((mgr) => (
                      <div key={mgr.ID_Manager} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                          {(mgr.Manager_name ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{mgr.Manager_name ?? "—"}</p>
                          {mgr.Manager_email && <a href={`mailto:${mgr.Manager_email}`} className="block truncate text-xs text-slate-500 hover:text-emerald-600">{mgr.Manager_email}</a>}
                          {mgr.Manager_location && <p className="flex items-center gap-1 truncate text-xs text-slate-400 mt-0.5"><MapPin className="h-3 w-3" />{mgr.Manager_location}</p>}
                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{mgr.ID_Manager}</p>
                          {mgr.rol && <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{mgr.rol}</span>}
                        </div>
                        {canUpdate && (
                          <button onClick={() => unlinkMgr(mgr.ID_Manager)} disabled={unlinkingManager === mgr.ID_Manager}
                            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors">
                            {unlinkingManager === mgr.ID_Manager ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
            )}

            {/* MEMBERS */}
            {activeTab === "members" && (
              (client.members?.length ?? 0) === 0
                ? <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16">
                    <Users className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No members linked yet</p>
                    <button onClick={() => setMemberModalOpen(true)} className="text-xs text-blue-600 hover:underline">Link a member</button>
                  </div>
                : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {client.members!.map((mem) => (
                      <div key={mem.ID_Member} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {(mem.Member_Name ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{mem.Member_Name ?? "—"}</p>
                          <p className="truncate text-xs text-slate-500">{mem.Company_Role ?? "—"}</p>
                          {mem.Email_Address && <a href={`mailto:${mem.Email_Address}`} className="block truncate text-xs text-slate-400 hover:text-blue-600 mt-0.5">{mem.Email_Address}</a>}
                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{mem.ID_Member}</p>
                          {mem.rol && <span className="mt-1.5 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">{mem.rol}</span>}
                        </div>
                        {canUpdate && (
                          <button onClick={() => unlinkMem(mem.ID_Member)} disabled={unlinkingMember === mem.ID_Member}
                            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors">
                            {unlinkingMember === mem.ID_Member ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
            )}
          </div>

          {/* ── Modals ── */}
          <LinkManagerModal open={managerModalOpen} onOpenChange={setManagerModalOpen}
            clientId={clientId} syncPodio={syncPodio} existingIds={exMgrIds}
            onLinked={(m) => { setClient((p) => p ? { ...p, manager: [...(p.manager ?? []), m] } : p); setManagerModalOpen(false) }} />
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