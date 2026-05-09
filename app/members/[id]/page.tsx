"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"
import { useTranslations, useLocale } from "@/components/providers/LocaleProvider"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft, Save, X, Loader2, Mail, Phone, MapPin, User,
  Briefcase, ShieldCheck, Search, Plus, Link2, Unlink,
  RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff,
  Calendar, DollarSign, Tag, ExternalLink, Activity,
  Clock, FileText, Wrench, Shield, Filter, ChevronDown, ChevronUp,
  Users, Building2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = {
  ID_Role: string
  Name?: string | null
  Description?: string | null
  Active?: boolean | null
}

type Permission = {
  ID_Permission: string
  Name?: string | null
  Description?: string | null
  Action?: string | null
  Service_Associated?: string | null
  Active?: boolean | null
}

type TLActivity = {
  ID_TLActivity: string
  Action: string | null
  Action_datetime: string | null
  Description: string | null
  ID_Jobs: string | null
  ID_Member: string | null
  ID_Subcontractor: string | null
  ID_Technician: string | null
}

type Job = {
  ID_Jobs: string
  Project_name?: string | null
  Job_type?: string | null
  Job_status?: string | null
  Project_location?: string | null
  Service_type?: string | null
  Date_assigned?: string | null
  Gqm_final_sold_pricing?: number | null
  Gqm_formula_pricing?: number | null
  Gqm_total_change_orders?: number | null
  Permit?: string | null
  ID_Client?: string | null
  Additional_detail?: string | null
}

type MemberFull = {
  ID_Member: string
  Member_Name?: string | null
  Company_Role?: string | null
  Email_Address?: string | null
  Phone_Number?: string | null
  Address?: string | null
  podio_item_id?: string | null
  podio_profile_id?: string | null
  role?: Role | null
  ID_Role?: string | null
  permissions?: Permission[]
  jobs?: Job[]
  tlactivity?: TLActivity[]
}

const SKIP_PATCH = new Set(["ID_Member", "podio_item_id", "podio_profile_id", "role", "permissions", "jobs", "tlactivity"])

// ─── Helpers ──────────────────────────────────────────────────────────────────

const asStr = (v: unknown) => (v == null ? "" : String(v))

function fmtDate(raw: string | null | undefined, locale: string = "en-US", opts?: Intl.DateTimeFormatOptions) {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(locale, opts ?? { month: "short", day: "numeric", year: "numeric" })
}

function fmtDateTime(raw: string | null | undefined, locale: string = "en-US") {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString(locale, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

// ─── Small UI components ──────────────────────────────────────────────────────

function SectionCard({ icon: Icon, iconBg, iconColor, title, action, children }: {
  icon: React.ElementType; iconBg: string; iconColor: string
  title: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>
}

const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"

function changedCls(changed: boolean) {
  return changed ? "border-amber-400 ring-1 ring-amber-400/30" : ""
}

function ActionBadge({ action, t }: { action?: string | null, t: any }) {
  const map: Record<string, string> = {
    "Job updated":  "bg-blue-100 text-blue-700 border-blue-200",
    "Task created": "bg-violet-100 text-violet-700 border-violet-200",
    "Job created":  "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Job deleted":  "bg-red-100 text-red-600 border-red-200",
  }
  const cls = (action ? map[action] : null) ?? "bg-slate-100 text-slate-600 border-slate-200"
  const key = action ? `log_${action.replace(/ /g, "_")}` : "log_default"
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{t(key)}</span>
}

function ServiceBadge({ service }: { service?: string | null }) {
  if (!service) return null
  const map: Record<string, string> = {
    Job:          "bg-blue-50 text-blue-700 border-blue-200",
    Subcontractor:"bg-amber-50 text-amber-700 border-amber-200",
    GQM_Member:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    Technician:   "bg-violet-50 text-violet-700 border-violet-200",
    Client:       "bg-cyan-50 text-cyan-700 border-cyan-200",
    Dashboard:    "bg-slate-100 text-slate-600 border-slate-200",
  }
  const cls = map[service] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{service.replace("_", " ")}</span>
}

function PermActionBadge({ action }: { action?: string | null }) {
  if (!action) return null
  const map: Record<string, string> = {
    View:   "bg-slate-100 text-slate-600 border-slate-200",
    Create: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Edit:   "bg-blue-100 text-blue-700 border-blue-200",
    Delete: "bg-red-100 text-red-600 border-red-200",
  }
  const cls = map[action] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${cls}`}>{action}</span>
}

// ─── Password field ────────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md pr-10 ${inputCls} px-3 py-2 border`}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ─── Job helpers ──────────────────────────────────────────────────────────────

function fmtCurrency(val?: number | null, locale: string = "en-US") {
  if (!val) return null
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val)
}

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

function JobCard({ job, clientName, onClick, t, locale }: { job: Job; clientName?: string | null; onClick: () => void, t: any, locale: string }) {
  const name = job.Project_name ?? job.ID_Jobs
  const status = job.Job_status
  const price = fmtCurrency(job.Gqm_final_sold_pricing, locale)
  const assignedDate = fmtDate(job.Date_assigned, locale)
  const statusColors: Record<string, string> = {
    "assigned/p. quote": "bg-blue-50 text-blue-700 border-blue-200",
    "in progress":       "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed:              "bg-slate-100 text-slate-500 border-slate-200",
    pending:             "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed:           "bg-teal-50 text-teal-700 border-teal-200",
  }
  const statusCls = status ? (statusColors[status.toLowerCase()] ?? "bg-gray-100 text-gray-600 border-gray-200") : null
  const typeColors: Record<string, string> = { qid: "bg-violet-100 text-violet-700", wo: "bg-amber-100 text-amber-700", bid: "bg-cyan-100 text-cyan-700", par: "bg-indigo-100 text-indigo-700" }
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

      {clientName && (
        <div className="mb-2 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <p className="truncate text-xs font-medium text-slate-600">{clientName}</p>
        </div>
      )}

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
            {job.Gqm_total_change_orders} {job.Gqm_total_change_orders !== 1 ? t("labelCOs") : t("labelCO")}
          </span>
        )}
        {job.Permit && job.Permit !== "No" && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            {t("labelPermit")}: {job.Permit}
          </span>
        )}
        <div className="ml-auto flex items-center">
          <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-400" />
        </div>
      </div>
    </button>
  )
}

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton({ user }: { user: any }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-10 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {[140, 180, 120].map((h, i) => <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white" style={{ height: h }} />)}
              </div>
              <div className="space-y-4">
                <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MemberDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { id }       = use(params)
  const { locale }   = useLocale()
  const activeTab    = searchParams.get("tab") || "details"

  const [user, setUser]     = useState<any>(null)
  const [member, setMember] = useState<MemberFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { hasPermission } = usePermissions()
  const canUpdate = hasPermission("member:update")
  const t = useTranslations("members")

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    Member_Name:  "",
    Company_Role: "",
    Email_Address:"",
    Phone_Number: "",
    Address:      "",
  })

  const setField = (k: string, v: string) => {
    setChangedFields(p => { const n = new Set(p); n.add(k); return n })
    setForm(p => ({ ...p, [k]: v }))
  }

  // ── Password state ─────────────────────────────────────────────────────────
  const [pwSection,  setPwSection]  = useState(false)
  const [pwSaving,   setPwSaving]   = useState(false)
  const [pwForm, setPwForm] = useState({ old: "", new: "", confirm: "" })

  // ── Jobs filters ───────────────────────────────────────────────────────────
  const [jobSearch,         setJobSearch]         = useState("")
  const [jobYear,           setJobYear]           = useState("")
  const [jobType,           setJobType]           = useState("")
  const [jobStatus,         setJobStatus]         = useState("")
  const [jobCommunityId,    setJobCommunityId]    = useState("")
  const [jobParentCompany,  setJobParentCompany]  = useState("")
  const [jobFiltersExpanded, setJobFiltersExpanded] = useState(false)

  // community name/parent lookup keyed by ID_Client
  const [communitiesMap, setCommunitiesMap] = useState<Map<string, { name: string; parentCompany: string | null }>>(new Map())
  const [communitiesLoading, setCommunitiesLoading] = useState(false)

  // ── Roles & Permissions modal state ───────────────────────────────────────
  const [modalMode, setModalMode] = useState<"role" | "permission" | null>(null)
  const [allRoles,   setAllRoles]   = useState<Role[]>([])
  const [allPerms,   setAllPerms]   = useState<Permission[]>([])
  const [rpLoading,  setRpLoading]  = useState(false)
  const [rpSearch,   setRpSearch]   = useState("")
  const [linkingId,  setLinkingId]  = useState<string | null>(null)
  const [unlinkingId,setUnlinkingId]= useState<string | null>(null)

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const initForm = (m: MemberFull) => setForm({
    Member_Name:  m.Member_Name  ?? "",
    Company_Role: m.Company_Role ?? "",
    Email_Address:m.Email_Address?? "",
    Phone_Number: m.Phone_Number ?? "",
    Address:      m.Address      ?? "",
  })

  // ── Fetch member ───────────────────────────────────────────────────────────
  const fetchMember = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const res = await apiFetch(`/api/members/${id}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: MemberFull = await res.json()
      setMember(data)
      initForm(data)
      setChangedFields(new Set())
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load member")
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { if (user) fetchMember() }, [user, fetchMember])

  // ── Save details ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!member) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      for (const k of Object.keys(form)) {
        if (!SKIP_PATCH.has(k)) payload[k] = (form as any)[k].trim() || null
      }
      const res = await apiFetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? `Error ${res.status}`)
      }
      const updated: MemberFull = await res.json()
      setMember(prev => ({ ...prev!, ...updated }))
      initForm({ ...member, ...updated })
      setEditing(false); setChangedFields(new Set())
      toast({ title: t("toastSaved"), description: t("toastSavedDesc") })
    } catch (e: any) {
      toast({ title: t("toastErrorSaving"), description: e?.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleCancel = () => {
    if (member) initForm(member)
    setChangedFields(new Set()); setEditing(false)
  }

  // ── Save password ──────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!pwForm.new || !pwForm.confirm) { toast({ title: t("toastFillPwd"), variant: "destructive" }); return }
    if (pwForm.new !== pwForm.confirm)  { toast({ title: t("toastPwdMatch"), variant: "destructive" }); return }
    if (pwForm.new.length < 8 || !/[A-Z]/.test(pwForm.new) || !/[0-9]/.test(pwForm.new)) {
      toast({ title: t("toastWeakPwd"), description: t("toastWeakPwdDesc"), variant: "destructive" }); return
    }
    setPwSaving(true)
    try {
      const res = await apiFetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Password: pwForm.new }),
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      toast({ title: t("toastPwdUpdated") })
      setPwForm({ old: "", new: "", confirm: "" }); setPwSection(false)
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setPwSaving(false) }
  }

  // ── Roles & Permissions ────────────────────────────────────────────────────
  const openModal = async (mode: "role" | "permission") => {
    setModalMode(mode); setRpSearch(""); setRpLoading(true)
    try {
      const endpoint = mode === "role" ? "/api/roles" : "/api/permissions"
      const res = await apiFetch(endpoint, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const items = Array.isArray(data) ? data : (data.results ?? [])
      if (mode === "role") setAllRoles(items)
      else setAllPerms(items)
    } catch (e: any) {
      toast({ title: t("toastErrorLoading"), description: e?.message, variant: "destructive" })
    } finally { setRpLoading(false) }
  }

  const linkRole = async (roleId: string) => {
    setLinkingId(roleId)
    try {
      const res = await apiFetch(`/api/members/${id}/role/${roleId}`, { method: "POST", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: t("toastRoleAssigned") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setLinkingId(null) }
  }

  const unlinkRole = async () => {
    setUnlinkingId("role")
    try {
      const res = await apiFetch(`/api/members/${id}/role/unlink`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: t("toastRoleRemoved") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setUnlinkingId(null) }
  }

  const linkPermission = async (permId: string) => {
    setLinkingId(permId)
    try {
      const res = await apiFetch(`/api/members/${id}/permissions/${permId}`, { method: "POST", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: t("toastPermLinked") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setLinkingId(null) }
  }

  const unlinkPermission = async (permId: string) => {
    setUnlinkingId(permId)
    try {
      const res = await apiFetch(`/api/members/${id}/permissions/${permId}`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: t("toastPermRemoved") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setUnlinkingId(null) }
  }

  // ── Filtered modal lists ───────────────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    const q = rpSearch.toLowerCase()
    return allRoles.filter(r => !q || asStr(r.Name).toLowerCase().includes(q) || asStr(r.ID_Role).toLowerCase().includes(q))
  }, [allRoles, rpSearch])

  const filteredPerms = useMemo(() => {
    const q = rpSearch.toLowerCase()
    return allPerms.filter(p =>
      !q || asStr(p.Name).toLowerCase().includes(q) ||
      asStr(p.Action).toLowerCase().includes(q) ||
      asStr(p.Service_Associated).toLowerCase().includes(q)
    )
  }, [allPerms, rpSearch])

  // ── Fetch community names for jobs ─────────────────────────────────────────
  useEffect(() => {
    const jobs = member?.jobs ?? []
    if (!jobs.length) return
    const clientIds = [...new Set(jobs.map(j => j.ID_Client).filter((id): id is string => !!id))]
    if (!clientIds.length) return
    setCommunitiesLoading(true)
    Promise.all(
      clientIds.map(cid =>
        apiFetch(`/api/clients/${cid}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const map = new Map<string, { name: string; parentCompany: string | null }>()
      results.forEach((client: any) => {
        if (client?.ID_Client) {
          map.set(client.ID_Client, {
            name: client.Client_Community ?? client.ID_Client,
            parentCompany: client.parent_mgmt_co?.Property_mgmt_co ?? null,
          })
        }
      })
      setCommunitiesMap(map)
      setCommunitiesLoading(false)
    })
  }, [member?.jobs])

  // ── Filter option lists ─────────────────────────────────────────────────────
  const jobStatusOptions = useMemo(() => {
    const set = new Set<string>()
    ;(member?.jobs ?? []).forEach(j => { if (j.Job_status) set.add(j.Job_status) })
    return Array.from(set).sort()
  }, [member?.jobs])

  const jobCommunityOptions = useMemo(() => {
    if (communitiesLoading) return []
    const map = new Map<string, string>()
    ;(member?.jobs ?? []).forEach(j => {
      if (j.ID_Client && !map.has(j.ID_Client)) {
        const entry = communitiesMap.get(j.ID_Client)
        if (entry) map.set(j.ID_Client, entry.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [member?.jobs, communitiesMap, communitiesLoading])

  const jobParentCompanyOptions = useMemo(() => {
    const set = new Set<string>()
    ;(member?.jobs ?? []).forEach(j => {
      const pc = communitiesMap.get(j.ID_Client ?? "")?.parentCompany
      if (pc) set.add(pc)
    })
    return Array.from(set).sort()
  }, [member?.jobs, communitiesMap])

  // ── Filtered jobs ──────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let result = member?.jobs ?? []

    if (jobSearch) {
      const q = jobSearch.trim().toLowerCase()
      result = result.filter(j =>
        asStr(j.ID_Jobs).toLowerCase().includes(q) ||
        asStr(j.Project_name).toLowerCase().includes(q) ||
        asStr(j.Job_status).toLowerCase().includes(q) ||
        asStr(j.Service_type).toLowerCase().includes(q) ||
        asStr(j.Project_location).toLowerCase().includes(q)
      )
    }
    if (jobYear) {
      result = result.filter(j => {
        const d = j.Date_assigned
        return d ? new Date(d).getFullYear().toString() === jobYear : false
      })
    }
    if (jobType)  result = result.filter(j => (j.Job_type ?? "").toUpperCase() === jobType.toUpperCase())
    if (jobStatus) result = result.filter(j => (j.Job_status ?? "").toLowerCase() === jobStatus.toLowerCase())
    if (jobCommunityId) result = result.filter(j => j.ID_Client === jobCommunityId)
    if (jobParentCompany) {
      result = result.filter(j => communitiesMap.get(j.ID_Client ?? "")?.parentCompany === jobParentCompany)
    }

    return result
  }, [member?.jobs, jobSearch, jobYear, jobType, jobStatus, jobCommunityId, jobParentCompany, communitiesMap])

  const hasJobFilters = !!(jobSearch || jobYear || jobType || jobStatus || jobCommunityId || jobParentCompany)

  const linkedPermIds = useMemo(() => new Set((member?.permissions ?? []).map(p => p.ID_Permission)), [member?.permissions])

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!user) return null
  if (loading) return <PageSkeleton user={user} />

  if (!member) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 p-6">
          <button onClick={() => router.push("/members")} className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> {t("backToMembers")}
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><h2 className="font-semibold text-red-800">{t("errLoadTitle")}</h2></div>
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
            <Button onClick={fetchMember} className="mt-4 gap-2" variant="outline"><RefreshCw className="h-4 w-4" /> {t("errLoadRetry")}</Button>
          </div>
        </main>
      </div>
    </div>
  )

  const initials = (member.Member_Name ?? member.ID_Member).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "??"

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* ── Sticky header ─────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                <button onClick={() => router.push("/members")}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm sm:h-10 sm:w-10">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-slate-900 leading-none sm:text-lg">{member.Member_Name ?? t("unnamed")}</h1>
                    <p className="mt-0.5 hidden font-mono text-xs text-slate-400 sm:block">{member.ID_Member}</p>
                  </div>
                </div>
                {member.Company_Role && (
                  <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 md:inline-flex">
                    <Briefcase className="h-3 w-3 text-slate-400" />{member.Company_Role}
                  </span>
                )}
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {canUpdate && editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving} className="gap-1.5 text-xs border-slate-200">
                      <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("btnCancel")}</span>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{saving ? t("btnSaving") : t("btnSave")}</span>
                    </Button>
                  </>
                ) : canUpdate ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5 text-xs border-slate-200">
                    ✎<span className="hidden sm:inline"> {t("btnEdit")}</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Content ───────────────────────────────────────────────────── */}
          <div className="p-4 sm:p-6">
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-4 lg:grid-cols-3">

              {/* ── LEFT: tabs ────────────────────────────────────────────── */}
              <div className="min-w-0 xl:col-span-3 lg:col-span-2">
                <Tabs value={activeTab} onValueChange={v => router.push(`/members/${id}?tab=${v}`)}>

                  {/* Tab bar */}
                  <div className="mb-4 overflow-x-auto sm:mb-5">
                    <TabsList className="inline-flex h-auto gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                      {[
                        { value: "details",  labelFull: t("tabDetails"),       labelShort: t("tabDetails"),    count: null },
                        { value: "jobs",     labelFull: t("tabJobs"),          labelShort: t("tabJobs"),       count: member.jobs?.length ?? 0 },
                        { value: "roles",    labelFull: t("tabRolesFull"),     labelShort: t("tabRolesShort"), count: (member.permissions?.length ?? 0) + (member.role ? 1 : 0) },
                        { value: "activity", labelFull: t("tabActivity"),      labelShort: t("tabActivity"),   count: member.tlactivity?.length ?? 0 },
                      ].map(({ value, labelFull, labelShort, count }) => (
                        <TabsTrigger key={value} value={value}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition-colors data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-4">
                          <span className="sm:hidden">{labelShort}</span>
                          <span className="hidden sm:inline">{labelFull}</span>
                          {count !== null && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${activeTab === value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                              {count}
                            </span>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* ── DETAILS tab ─────────────────────────────────────── */}
                  <TabsContent value="details" className="space-y-4">

                    <SectionCard icon={User} iconBg="bg-emerald-50" iconColor="text-emerald-600" title={t("sectionInfo")}>
                      <div className="grid min-w-0 gap-5 md:grid-cols-2">
                        <div className="min-w-0 md:col-span-2">
                          <FieldLabel>{t("fieldFullName")}</FieldLabel>
                          {editing
                            ? <Input value={form.Member_Name} onChange={e => setField("Member_Name", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Member_Name"))}`} placeholder={t("phFullName")} />
                            : <p className="text-sm text-slate-800">{member.Member_Name || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>{t("fieldRole")}</FieldLabel>
                          {editing
                            ? <Input value={form.Company_Role} onChange={e => setField("Company_Role", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Company_Role"))}`} placeholder={t("phRole")} />
                            : <p className="text-sm text-slate-800">{member.Company_Role || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>{t("fieldEmail")}</FieldLabel>
                          {editing
                            ? <Input type="email" value={form.Email_Address} onChange={e => setField("Email_Address", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Email_Address"))}`} placeholder={t("phEmail")} />
                            : member.Email_Address
                              ? <a href={`mailto:${member.Email_Address}`} className="flex min-w-0 items-center gap-1.5 text-sm text-emerald-700 hover:underline"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{member.Email_Address}</span></a>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>{t("fieldPhone")}</FieldLabel>
                          {editing
                            ? <Input value={form.Phone_Number} onChange={e => setField("Phone_Number", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Phone_Number"))}`} placeholder={t("phPhone")} />
                            : member.Phone_Number
                              ? <a href={`tel:${member.Phone_Number}`} className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"><Phone className="h-3.5 w-3.5 flex-shrink-0" />{member.Phone_Number}</a>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div className="min-w-0 md:col-span-2">
                          <FieldLabel>{t("fieldAddress")}</FieldLabel>
                          {editing
                            ? <Textarea value={form.Address} onChange={e => setField("Address", e.target.value)} className={`${inputCls} resize-none ${changedCls(changedFields.has("Address"))}`} rows={2} placeholder={t("phAddress")} />
                            : member.Address
                              ? <p className="flex items-start gap-1.5 text-sm text-slate-800"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{member.Address}</p>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                      </div>
                    </SectionCard>

                    {/* Password */}
                    <SectionCard icon={Shield} iconBg="bg-slate-100" iconColor="text-slate-500" title={t("pwdTitle")}
                      action={
                        <Button variant="outline" size="sm" onClick={() => setPwSection(v => !v)} className="text-xs border-slate-200">
                          {pwSection ? t("btnCancel") : t("pwdBtnChange")}
                        </Button>
                      }>
                      {pwSection ? (
                        <div className="space-y-4">
                          <div>
                            <FieldLabel>{t("pwdNew")}</FieldLabel>
                            <PasswordInput value={pwForm.new} onChange={v => setPwForm(p => ({ ...p, new: v }))} placeholder={t("pwdPhNew")} />
                            <p className="mt-1 text-[11px] text-slate-400">{t("pwdMinRules")}</p>
                          </div>
                          <div>
                            <FieldLabel>{t("pwdConfirm")}</FieldLabel>
                            <PasswordInput value={pwForm.confirm} onChange={v => setPwForm(p => ({ ...p, confirm: v }))} placeholder={t("pwdPhConfirm")} />
                          </div>
                          <Button onClick={handleSavePassword} disabled={pwSaving} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            {pwSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {pwSaving ? t("btnSaving") : t("pwdBtnUpdate")}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm italic text-slate-400">{t("pwdHelp")}</p>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* ── JOBS tab ──────────────────────────────────────────── */}
                  <TabsContent value="jobs">
                    <div className="space-y-4">

                      {/* Filter card */}
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="space-y-4 p-4 sm:p-5">

                          {/* Title + filter toggle */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="rounded-xl bg-violet-50 p-2 text-violet-700">
                                <Briefcase className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold tracking-tight text-slate-900">{t("tabJobsTitle")}</h3>
                                <p className="font-mono text-xs uppercase tracking-wider text-slate-400">
                                  {filteredJobs.length.toLocaleString()} {filteredJobs.length !== 1 ? t("records") : t("record")}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setJobFiltersExpanded(e => !e)}
                              className={cn(
                                "flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all",
                                jobFiltersExpanded
                                  ? "bg-slate-900 text-white hover:bg-slate-800"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              <Filter className={cn("h-4 w-4", hasJobFilters && "text-yellow-400")} />
                              {t("btnFilters")}
                              {hasJobFilters && (
                                <Badge className="flex h-5 min-w-5 items-center justify-center rounded-full border-none bg-yellow-400 p-0 text-[10px] text-slate-900">
                                  {[jobYear, jobType, jobStatus, jobCommunityId, jobParentCompany].filter(Boolean).length}
                                </Badge>
                              )}
                              {jobFiltersExpanded
                                ? <ChevronUp className="ml-1 h-4 w-4" />
                                : <ChevronDown className="ml-1 h-4 w-4" />}
                            </button>
                          </div>

                          {/* Search + reset */}
                          <div className="flex gap-2 sm:gap-3">
                            <div className="group relative flex-1">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-600 sm:left-4" />
                              <input
                                value={jobSearch}
                                onChange={e => setJobSearch(e.target.value)}
                                placeholder={t("phSearchJobs")}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/20 transition-all sm:pl-12"
                              />
                            </div>
                            {hasJobFilters && (
                              <button
                                onClick={() => { setJobSearch(""); setJobYear(""); setJobType(""); setJobStatus(""); setJobCommunityId(""); setJobParentCompany("") }}
                                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-500 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                              >
                                <RefreshCw className="h-4 w-4" />
                                <span className="hidden sm:inline">{t("btnReset")}</span>
                              </button>
                            )}
                          </div>

                          {/* Expandable filter panel */}
                          <div className={cn(
                            "grid transition-all duration-300 ease-in-out",
                            jobFiltersExpanded
                              ? "grid-rows-[1fr] border-t border-slate-100 pt-4 opacity-100"
                              : "invisible grid-rows-[0fr] overflow-hidden opacity-0"
                          )}>
                            <div className="overflow-hidden">
                              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
                                <JobFilterSelect label={t("labelYear")} icon={<Calendar className="h-3.5 w-3.5" />}
                                  value={jobYear || "all"} onValueChange={v => setJobYear(v === "all" ? "" : v)}>
                                  <SelectItem value="all">{t("allYears")}</SelectItem>
                                  {["2026", "2025", "2024", "2023"].map(y => (
                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                  ))}
                                </JobFilterSelect>

                                <JobFilterSelect label={t("labelType")} icon={<Tag className="h-3.5 w-3.5" />}
                                  value={jobType || "all"} onValueChange={v => setJobType(v === "all" ? "" : v)}>
                                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                                  {["QID", "PTL", "PAR"].map(tp => (
                                    <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                                  ))}
                                </JobFilterSelect>

                                <JobFilterSelect label={t("labelStatus")} icon={<Activity className="h-3.5 w-3.5" />}
                                  value={jobStatus || "all"} onValueChange={v => setJobStatus(v === "all" ? "" : v)}>
                                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                                  {jobStatusOptions.map(s => (
                                    <SelectItem key={s} value={s}>
                                      <div className="flex items-center gap-2">
                                        <div className={cn("h-2 w-2 flex-shrink-0 rounded-full", JOB_STATUS_COLOR[s] ?? "bg-slate-400")} />
                                        {s}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </JobFilterSelect>

                                <JobFilterSelect label={t("labelCommunity")} icon={<Building2 className="h-3.5 w-3.5" />}
                                  value={jobCommunityId || "all"} onValueChange={v => setJobCommunityId(v === "all" ? "" : v)}>
                                  <SelectItem value="all">{t("allCommunities")}</SelectItem>
                                  {communitiesLoading
                                    ? <SelectItem value="__loading__" disabled>{t("loading")}</SelectItem>
                                    : jobCommunityOptions.map(({ id, name }) => (
                                        <SelectItem key={id} value={id}>{name}</SelectItem>
                                      ))
                                  }
                                </JobFilterSelect>

                                <JobFilterSelect label={t("labelParentCo")} icon={<Users className="h-3.5 w-3.5" />}
                                  value={jobParentCompany || "all"} onValueChange={v => setJobParentCompany(v === "all" ? "" : v)}>
                                  <SelectItem value="all">{t("allCompanies")}</SelectItem>
                                  {jobParentCompanyOptions.map(pc => (
                                    <SelectItem key={pc} value={pc}>{pc}</SelectItem>
                                  ))}
                                </JobFilterSelect>
                              </div>
                            </div>
                          </div>

                          {/* Active filter badges (collapsed state) */}
                          {hasJobFilters && !jobFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 pt-1">
                               {jobYear         && <ActiveJobBadge label={t("labelYear")}      value={jobYear}   onClear={() => setJobYear("")} />}
                              {jobType         && <ActiveJobBadge label={t("labelType")}      value={jobType}   onClear={() => setJobType("")} />}
                              {jobStatus       && <ActiveJobBadge label={t("labelStatus")}    value={jobStatus} onClear={() => setJobStatus("")} />}
                              {jobCommunityId  && <ActiveJobBadge label={t("labelCommunity")} value={jobCommunityOptions.find(c => c.id === jobCommunityId)?.name ?? jobCommunityId} onClear={() => setJobCommunityId("")} />}
                              {jobParentCompany && <ActiveJobBadge label={t("labelParentCo")} value={jobParentCompany} onClear={() => setJobParentCompany("")} />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Job grid */}
                      {filteredJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16">
                          <Briefcase className="h-10 w-10 text-slate-300" />
                          <p className="text-sm font-medium text-slate-500">
                            {hasJobFilters ? t("noJobsMatch") : t("noJobsAssigned")}
                          </p>
                          {hasJobFilters && (
                            <button
                              onClick={() => { setJobSearch(""); setJobYear(""); setJobType(""); setJobStatus(""); setJobCommunityId(""); setJobParentCompany("") }}
                              className="text-xs text-violet-600 hover:underline"
                            >
                              {t("clearFilters")}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {filteredJobs.map(job => (
                            <JobCard
                              key={job.ID_Jobs}
                              job={job}
                              clientName={communitiesMap.get(job.ID_Client ?? "")?.name}
                              onClick={() => router.push(`/jobs/${job.ID_Jobs}`)}
                              t={t}
                              locale={locale}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── ROLES & PERMISSIONS tab ───────────────────────────── */}
                  <TabsContent value="roles" className="space-y-4">

                    {/* Role (singular) */}
                    <SectionCard icon={ShieldCheck} iconBg="bg-violet-50" iconColor="text-violet-600" title={t("sectionRole")}
                      action={
                        <Button size="sm" onClick={() => openModal("role")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{member.role ? t("btnChangeRole") : t("btnAssignRole")}</span>
                        </Button>
                      }>
                      {member.role ? (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">{member.role.Name ?? t("unnamedRole")}</span>
                              {member.role.Active && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{t("statusActive")}</span>}
                            </div>
                            {member.role.Description && <p className="mt-0.5 text-xs text-slate-500">{member.role.Description}</p>}
                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">{member.role.ID_Role}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={unlinkRole} disabled={unlinkingId === "role"}
                            className="flex-shrink-0 gap-1.5 border-slate-200 text-xs text-red-500 hover:border-red-200 hover:bg-red-50">
                            {unlinkingId === "role" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{t("btnRemove")}</span>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm italic text-slate-400">{t("noRoleAssigned")}</p>
                      )}
                    </SectionCard>

                    {/* Permissions */}
                    <SectionCard icon={CheckCircle} iconBg="bg-blue-50" iconColor="text-blue-600" title={t("sectionPerms")}
                      action={
                        <Button size="sm" onClick={() => openModal("permission")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("btnLinkPerm")}</span>
                        </Button>
                      }>
                      {(member.permissions ?? []).length > 0 ? (
                        <div className="space-y-2">
                          {[...(member.permissions ?? [])].sort((a, b) => asStr(a.Name).localeCompare(asStr(b.Name))).map(perm => {
                            const busy = unlinkingId === perm.ID_Permission
                            return (
                              <div key={perm.ID_Permission} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-slate-800">{perm.Name ?? t("unnamedPerm")}</span>
                                    <PermActionBadge action={perm.Action} />
                                    <ServiceBadge service={perm.Service_Associated} />
                                  </div>
                                  {perm.Description && <p className="mt-0.5 truncate text-xs text-slate-500">{perm.Description}</p>}
                                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{perm.ID_Permission}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => unlinkPermission(perm.ID_Permission)} disabled={busy}
                                  className="flex-shrink-0 gap-1.5 border-slate-200 text-xs text-red-500 hover:border-red-200 hover:bg-red-50">
                                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                                  <span className="hidden sm:inline">{t("btnUnlink")}</span>
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-10">
                          <CheckCircle className="h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-500">{t("noPermsLinked")}</p>
                          <Button size="sm" onClick={() => openModal("permission")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            <Plus className="h-3.5 w-3.5" /> {t("btnLinkFirstPerm")}
                          </Button>
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* ── ACTIVITY tab ──────────────────────────────────────── */}
                  <TabsContent value="activity">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                          <Activity className="h-4 w-4 text-slate-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800">{t("activityTitle")}</h3>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{member.tlactivity?.length ?? 0}</span>
                      </div>
                      <div className="divide-y divide-slate-50 p-0">
                        {(member.tlactivity ?? []).length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-12">
                            <Clock className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">{t("noActivity")}</p>
                          </div>
                        ) : (
                          [...(member.tlactivity ?? [])].sort((a, b) =>
                            new Date(b.Action_datetime ?? 0).getTime() - new Date(a.Action_datetime ?? 0).getTime()
                          ).map(ev => (
                            <div key={ev.ID_TLActivity} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors sm:gap-4 sm:px-6 sm:py-4">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                                <Activity className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <ActionBadge action={ev.Action} t={t} />
                                  {ev.ID_Jobs && (
                                    <button onClick={() => router.push(`/jobs/${ev.ID_Jobs}`)}
                                      className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                                      {ev.ID_Jobs} <ExternalLink className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                                {ev.Description && (
                                  <p className="mt-1 text-xs text-slate-600">
                                    {ev.Description
                                      .replace(/Job:/g,    t("logPrefixJob") + ":")
                                      .replace(/Member:/g, t("logPrefixMember") + ":")
                                      .replace(/Role:/g,   t("logPrefixRole") + ":")
                                      .replace(/Fields:/g, t("logPrefixFields") + ":")
                                    }
                                  </p>
                                )}
                                {ev.Action_datetime && <p className="mt-1 text-[11px] text-slate-400">{fmtDateTime(ev.Action_datetime, locale)}</p>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                </Tabs>
              </div>

              {/* ── RIGHT sidebar ─────────────────────────────────────────── */}
              <div className="min-w-0 space-y-4">

                {/* Quick summary */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("qsTitle")}</p>
                  </div>
                  <div className="divide-y divide-slate-50 px-5">
                    {[
                      { label: t("qsId"),      value: <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">{member.ID_Member}</span> },
                      { label: t("qsRole"),    value: member.role ? <span className="text-xs font-medium text-slate-700">{member.role.Name}</span> : <span className="text-xs italic text-slate-400">{t("qsNoRole")}</span> },
                      { label: t("qsJobs"),       value: <span className="text-sm font-semibold text-slate-800">{member.jobs?.length ?? 0}</span> },
                      { label: t("qsPerms"),value: <span className="text-sm font-semibold text-slate-800">{member.permissions?.length ?? 0}</span> },
                      { label: t("qsActivity"),   value: <span className="text-sm font-semibold text-slate-800">{member.tlactivity?.length ?? 0}</span> },
                      { label: t("qsPodio"),   value: member.podio_item_id
                          ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle className="h-3 w-3" />{t("qsLinked")}</span>
                          : <span className="text-[11px] italic text-slate-400">{t("qsNotLinked")}</span>
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                        {value}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("contactTitle")}</p>
                  </div>
                  <div className="space-y-3 p-5">
                    {member.Email_Address
                      ? <a href={`mailto:${member.Email_Address}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-emerald-700 transition-colors"><Mail className="h-3.5 w-3.5 text-slate-400" />{member.Email_Address}</a>
                      : <p className="text-sm italic text-slate-400">{t("contactNoEmail")}</p>
                    }
                    {member.Phone_Number
                      ? <a href={`tel:${member.Phone_Number}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-emerald-700 transition-colors"><Phone className="h-3.5 w-3.5 text-slate-400" />{member.Phone_Number}</a>
                      : null
                    }
                    {member.Address && <p className="flex items-start gap-2 text-sm text-slate-700"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{member.Address}</p>}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Role Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={modalMode === "role"} onOpenChange={o => !o && setModalMode(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-600" /> {t("modalAssignRole")}</DialogTitle>
            <DialogDescription>{t("modalAssignRoleDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input value={rpSearch} onChange={e => setRpSearch(e.target.value)} placeholder={t("phSearchRoles")} className={`pl-9 ${inputCls}`} />
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[55vh] overflow-x-auto overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-32">{t("colId")}</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("colName")}</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-24 text-right">{t("colAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rpLoading
                    ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm italic text-slate-400">{t("loadingRoles")}</TableCell></TableRow>
                    : filteredRoles.length === 0
                      ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm italic text-slate-400">{t("noRolesFound")}</TableCell></TableRow>
                      : filteredRoles.map(role => {
                          const isCurrent = member?.role?.ID_Role === role.ID_Role
                          const busy = linkingId === role.ID_Role
                          return (
                            <TableRow key={role.ID_Role} className="hover:bg-slate-50">
                              <TableCell className="font-mono text-xs text-slate-500">{role.ID_Role}</TableCell>
                              <TableCell>
                                <p className="text-sm font-medium text-slate-800">{role.Name ?? "—"}</p>
                                {role.Description && <p className="text-xs text-slate-400 truncate max-w-xs">{role.Description}</p>}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" onClick={() => linkRole(role.ID_Role)} disabled={isCurrent || busy}
                                  variant={isCurrent ? "outline" : "default"}
                                  className={`gap-1.5 text-xs ${!isCurrent ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
                                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                                  {isCurrent ? t("btnCurrent") : t("btnAssign")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                  }
                </TableBody>
              </Table>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setModalMode(null)} className="text-xs border-slate-200">{t("btnClose")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Permission Modal ──────────────────────────────────────────────── */}
      <Dialog open={modalMode === "permission"} onOpenChange={o => !o && setModalMode(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-blue-600" /> {t("modalLinkPerm")}</DialogTitle>
            <DialogDescription>{t("modalLinkPermDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input value={rpSearch} onChange={e => setRpSearch(e.target.value)} placeholder={t("phSearchPerms")} className={`pl-9 ${inputCls}`} />
            </div>

            {/* Mobile cards */}
            <div className="max-h-[55vh] overflow-y-auto sm:hidden">
              {rpLoading ? (
                <p className="py-10 text-center text-sm italic text-slate-400">{t("loadingPerms")}</p>
              ) : filteredPerms.length === 0 ? (
                <p className="py-10 text-center text-sm italic text-slate-400">{t("noPermsFound")}</p>
              ) : (
                <div className="space-y-2">
                  {filteredPerms.map(perm => {
                    const already = linkedPermIds.has(perm.ID_Permission)
                    const busy    = linkingId === perm.ID_Permission
                    return (
                      <div key={perm.ID_Permission} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{perm.Name ?? t("unnamedPerm")}</span>
                            <PermActionBadge action={perm.Action} />
                            <ServiceBadge service={perm.Service_Associated} />
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{perm.ID_Permission}</p>
                        </div>
                        <Button size="sm" onClick={() => linkPermission(perm.ID_Permission)} disabled={already || busy}
                          variant={already ? "outline" : "default"}
                          className={`flex-shrink-0 gap-1.5 text-xs ${!already ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                          {already ? t("btnLinked") : t("btnLink")}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:block">
              <div className="max-h-[55vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 sticky top-0 z-10">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-32 py-3">{t("colId")}</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 py-3">{t("colName")}</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-24 py-3">{t("colAction")}</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-32 py-3">{t("colService")}</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-28 text-right py-3">{t("btnLink")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rpLoading
                    ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm italic text-slate-400">{t("loadingPerms")}</TableCell></TableRow>
                    : filteredPerms.length === 0
                      ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm italic text-slate-400">{t("noPermsFound")}</TableCell></TableRow>
                      : filteredPerms.map(perm => {
                          const already = linkedPermIds.has(perm.ID_Permission)
                          const busy    = linkingId === perm.ID_Permission
                          return (
                            <TableRow key={perm.ID_Permission} className="hover:bg-slate-50">
                              <TableCell className="font-mono text-xs text-slate-500 py-4">{perm.ID_Permission}</TableCell>
                              <TableCell className="text-sm font-medium text-slate-800 py-4">{perm.Name ?? "—"}</TableCell>
                              <TableCell className="py-4"><PermActionBadge action={perm.Action} /></TableCell>
                              <TableCell className="py-4"><ServiceBadge service={perm.Service_Associated} /></TableCell>
                              <TableCell className="text-right py-4">
                                <Button size="sm" onClick={() => linkPermission(perm.ID_Permission)} disabled={already || busy}
                                  variant={already ? "outline" : "default"}
                                  className={`gap-1.5 text-xs ${!already ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
                                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                                  {already ? t("btnLinked") : t("btnLink")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                  }
                </TableBody>
              </Table>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setModalMode(null)} className="text-xs border-slate-200">{t("btnClose")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}