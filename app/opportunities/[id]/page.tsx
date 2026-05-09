"use client"

import { createPortal } from "react-dom"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "@/components/ui/use-toast"
import { DeleteOpportunityDialog } from "@/components/organisms/DeleteOpportunityDialog"
import type { Opportunity, OpportunityApplicant, OpportunitySkill } from "@/lib/types"
import {
  Megaphone, ArrowLeft, Pencil, Save, X, Loader2, Trash2,
  Briefcase, Info, Settings, Zap, Users, Search, Plus,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  ExternalLink, Star, Mail, Phone, ChevronDown, ShoppingCart, DollarSign,
} from "lucide-react"
import { LinkSubcontractorModal } from "@/components/organisms/LinkSubcontractorModal"
import { useTranslations } from "@/components/providers/LocaleProvider"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 300): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/** Parse date without UTC offset shift */
function formatDate(val: string | null | undefined) {
  if (!val) return "—"
  const datePart = val.split("T")[0]
  if (!datePart) return "—"
  const [y, m, d] = datePart.split("-").map(Number)
  if (!y || !m || !d) return "—"
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d))
}

function toDateInput(val: string | null | undefined) {
  if (!val) return ""
  return val.split("T")[0] ?? ""
}

/** Strip PostgreSQL-style braces/quotes from org strings like {"H and F Stone"} */
function normalizeOrg(raw: any): string {
  if (!raw) return ""
  if (Array.isArray(raw)) return raw.map((r) => String(r).trim()).filter(Boolean).join(", ")
  if (typeof raw === "object") {
    try { return String(Object.values(raw)[0] ?? "").trim() } catch { return String(raw) }
  }
  let s = String(raw).trim()
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
    s = s.slice(1, -1).trim()
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1)
  }
  return s.replace(/^[{"'\s]+|[}"'\s]+$/g, "").trim()
}

// ─── Priority / State / Application constants ─────────────────────────────────

const PRIORITIES = ["Low", "Medium", "High", "Critical"]

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 border-slate-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
}

const APP_STATES = ["Pending", "Reviewing", "Accepted", "Rejected"]

const APP_STATE_COLORS: Record<string, { badge: string; dot: string }> = {
  Pending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400" },
  Reviewing: { badge: "bg-blue-50 text-blue-700 border-blue-200",      dot: "bg-blue-400" },
  Accepted:  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  Rejected:  { badge: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-400" },
}

// ─── Application state dropdown ───────────────────────────────────────────────

function AppStateSelector({
  value,
  onChange,
}: {
  value: string | null
  onChange: (state: string) => void
}) {
  const t = useTranslations("opportunities")
  const colors = value ? APP_STATE_COLORS[value] : null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none ${
            colors ? colors.badge : "bg-slate-50 text-slate-400 border-slate-200"
          }`}
        >
          {colors && <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />}
          {value === "Pending" ? t("det_appPending") :
           value === "Reviewing" ? t("det_appReviewing") :
           value === "Accepted" ? t("det_appAccepted") :
           value === "Rejected" ? t("det_appRejected") : (value ?? t("det_noState"))}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl p-1">
        <DropdownMenuItem
          onClick={() => onChange("")}
          className="rounded-lg text-xs text-slate-400 cursor-pointer"
        >
          {t("det_noState")}
        </DropdownMenuItem>
        {APP_STATES.map((s) => {
          const c = APP_STATE_COLORS[s]
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => onChange(s)}
              className="rounded-lg text-xs cursor-pointer gap-2"
            >
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
              {s === "Pending" ? t("det_appPending") :
               s === "Reviewing" ? t("det_appReviewing") :
               s === "Accepted" ? t("det_appAccepted") :
               s === "Rejected" ? t("det_appRejected") : s}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, action }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Icon className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
        </div>
        {action}
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1.5">{children}</label>
}

function ReadonlyField({ value }: { value: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 min-h-[38px]">
      {value || <span className="text-slate-300">—</span>}
    </div>
  )
}

// ─── Job picker modal (shared between create & edit) ──────────────────────────

function JobPickerModal({ open, onClose, onSelect }: {
  open: boolean
  onClose: () => void
  onSelect: (job: any) => void
}) {
  const LIMIT = 10
  const [query, setQuery] = useState("")
  const dQ = useDebounce(query, 300)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const t = useTranslations("opportunities")
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  useEffect(() => { if (open) { setQuery(""); setPage(1) } }, [open])
  useEffect(() => { setPage(1) }, [dQ])

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (dQ) params.set("search", dQ)
    apiFetch(`/api/jobs?${params}`, { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { setRows(d.results ?? []); setTotal(Number(d.total ?? 0)) })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [open, dQ, page])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "calc(100vh - 48px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Briefcase className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("modal_title")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t("modal_subtitle")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("modal_phSearch")}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center"><p className="text-sm text-slate-400">{t("modal_noResults")}</p></div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {rows.map((job) => (
                <li key={job.ID_Jobs}>
                  <button
                    type="button"
                    onClick={() => { onSelect(job); onClose() }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Briefcase className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {job.Project_Name || job.Project_name || job.ID_Jobs}
                      </p>
                      {job.Project_location && <p className="text-xs text-slate-400 truncate">{job.Project_location}</p>}
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                      {job.ID_Jobs}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
          <p className="text-xs text-slate-400">
            {t("modal_showing", { count: rows.length, total })}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))} disabled={page <= 1 || loading} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))} disabled={page >= totalPages || loading} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== "undefined" ? document.body : (null as any),
  )
}


// ─── Main page ────────────────────────────────────────────────────────────────

export default function OpportunityDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const t = useTranslations("opportunities")
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")

  const [opp, setOpp] = useState<Opportunity | null>(null)
  const [applicants, setApplicants] = useState<OpportunityApplicant[]>([])
  const [allSkills, setAllSkills] = useState<OpportunitySkill[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [applicantModalOpen, setApplicantModalOpen] = useState(false)
  const [jobPickerOpen, setJobPickerOpen] = useState(false)
  const [skillSearch, setSkillSearch] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)

  // Edit form state
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [state, setState] = useState<boolean>(true)
  const [priority, setPriority] = useState("Medium")
  const [startDate, setStartDate] = useState("")
  const [editLinkedJob, setEditLinkedJob] = useState<any | null>(null)

  // Order picker state
  const [editLinkedOrder, setEditLinkedOrder] = useState<{ ID_Order: string; Title: string | null; Formula: number | null; Adj_formula: number | null } | null>(null)
  const [jobOrders, setJobOrders] = useState<{ ID_Order: string; Title: string | null; Formula: number | null; Adj_formula: number | null }[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [linkingOrder, setLinkingOrder] = useState(false)

  const fetchOpp = useCallback(async () => {
    setLoading(true)
    try {
      const [oppRes, appRes] = await Promise.all([
        apiFetch(`/api/opportunities/${id}`),
        apiFetch(`/api/opportunities/${id}/applicants`),
      ])
      if (!oppRes.ok) throw new Error("Not found")
      const oppData: Opportunity = await oppRes.json()
      const appData: OpportunityApplicant[] = appRes.ok ? await appRes.json() : []
      setOpp(oppData)
      setApplicants(appData)
      setProjectName(oppData.Project_name ?? "")
      setDescription(oppData.Description ?? "")
      setState(oppData.State ?? true)
      setPriority(oppData.Priority ?? "Medium")
      setStartDate(toDateInput(oppData.Start_Date))
      setEditLinkedJob(oppData.job ?? null)
      setEditLinkedOrder(oppData.order ?? null)
    } catch {
      toast({ title: t("opp_toastError"), description: t("det_errLoad"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch orders for the currently selected job (used in edit mode)
  const fetchJobOrders = useCallback(async (jobId: string) => {
    setOrdersLoading(true)
    setJobOrders([])
    try {
      const res = await apiFetch(`/api/order?ID_Jobs=${encodeURIComponent(jobId)}&limit=100`)
      if (!res.ok) { setJobOrders([]); return }
      const data = await res.json()
      // Backend uses @paginate decorator → { results: [], total: N }
      const list = Array.isArray(data) ? data : (data?.results ?? [])
      setJobOrders(list)
    } catch {
      setJobOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    const parsed = JSON.parse(u)
    setUserRole(parsed.role)
    fetchOpp()
    apiFetch("/api/skills")
      .then((r) => r.json())
      .then((d) => setAllSkills(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {})
  }, [fetchOpp, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        Project_name: projectName.trim() || null,
        Description: description.trim() || null,
        State: state,
        Priority: priority,
        Start_Date: startDate ? `${startDate}T00:00:00` : null,
        ID_Jobs: editLinkedJob?.ID_Jobs ?? null,
        ID_Order: editLinkedOrder?.ID_Order ?? null,
      }
      const res = await apiFetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        const msg = errData?.detail ?? errData?.error ?? `Error ${res.status}`
        throw new Error(msg)
      }
      setEditing(false)
      toast({ title: t("det_toastSaved"), description: t("det_toastSavedDesc") })
      await fetchOpp()
    } catch (e: any) {
      toast({ title: t("opp_toastError"), description: e?.message ?? t("det_toastSaveError"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (!opp) return
    setProjectName(opp.Project_name ?? "")
    setDescription(opp.Description ?? "")
    setState(opp.State ?? true)
    setPriority(opp.Priority ?? "Medium")
    setStartDate(toDateInput(opp.Start_Date))
    setEditLinkedJob(opp.job ?? null)
    setEditLinkedOrder(opp.order ?? null)
    setJobOrders([])
    setEditing(false)
  }

  // Skills
  const linkedSkillIds = useMemo(() => (opp?.skills ?? []).map((s) => s.ID_Skill), [opp])

  const handleLinkSkill = async (skillId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/skills/${skillId}`, { method: "POST" })
    if (!res.ok) { toast({ title: t("opp_toastError"), description: t("det_toastLinkSkillError"), variant: "destructive" }); return }
    await fetchOpp()
  }

  const handleUnlinkSkill = async (skillId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/skills/${skillId}`, { method: "DELETE" })
    if (!res.ok) { toast({ title: t("opp_toastError"), description: t("det_toastUnlinkSkillError"), variant: "destructive" }); return }
    await fetchOpp()
  }

  // Applicants
  const applicantIds = useMemo(() => applicants.map((a) => a.ID_Subcontractor), [applicants])

  const handleLinkApplicant = async (subId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/applicants/${subId}`, { method: "POST" })
    if (!res.ok) { toast({ title: t("opp_toastError"), description: t("det_toastLinkAppError"), variant: "destructive" }); return }
    const list: OpportunityApplicant[] = await apiFetch(`/api/opportunities/${id}/applicants`)
      .then((r) => r.json()).catch(() => [])
    setApplicants(list)
  }

  const handleUnlinkApplicant = async (subId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/applicants/${subId}`, { method: "DELETE" })
    if (!res.ok) { toast({ title: t("opp_toastError"), description: t("det_toastUnlinkAppError"), variant: "destructive" }); return }
    setApplicants((prev) => prev.filter((a) => a.ID_Subcontractor !== subId))
  }

  const handleUpdateState = async (subId: string, newState: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/applicants/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: newState || null }),
    })
    if (!res.ok) { toast({ title: t("opp_toastError"), description: t("det_toastUpdateStateError"), variant: "destructive" }); return }
    setApplicants((prev) => prev.map((a) => a.ID_Subcontractor === subId ? { ...a, application_state: newState || null } : a))
  }

  const confirmDelete = async () => {
    const res = await apiFetch(`/api/opportunities/${id}`, { method: "DELETE" })
    if (!res.ok) { toast({ title: t("opp_toastError"), description: t("det_toastDeleteError"), variant: "destructive" }); return }
    toast({ title: t("det_toastDeleted"), description: t("det_toastDeletedDesc") })
    router.push("/opportunities")
  }

  const filteredSkills = allSkills.filter((s) => {
    const q = skillSearch.toLowerCase()
    return (s.Skill_name ?? "").toLowerCase().includes(q) || (s.Division_trade ?? "").toLowerCase().includes(q)
  })

  // Derive the linked job for display (use opp.job since ID_Jobs is stripped by add_relationships)
  const linkedJob = opp?.job ?? null
  const linkedJobId = linkedJob?.ID_Jobs ?? null

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </main>
        </div>
      </div>
    )
  }

  if (!opp) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-slate-500">{t("det_notFound")}</p>
          <Button onClick={() => router.push("/opportunities")}>{t("det_btnBackList")}</Button>
        </main>
      </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => returnTo ? router.push(returnTo) : router.push("/opportunities")} className="h-8 w-8 flex-shrink-0 rounded-xl text-slate-400 hover:text-slate-700">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-sm sm:flex">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-black text-slate-900 sm:text-xl">{opp.Project_name || opp.ID_Opportunities}</h1>
                  <p className="hidden font-mono text-xs text-slate-500 sm:block">{opp.ID_Opportunities}</p>
                </div>
              </div>
              <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                {userRole !== "LEAD_TECHNICIAN" && (
                  editing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving} className="gap-1.5 text-xs border-slate-200">
                        <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("det_btnCancel")}</span>
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{saving ? t("det_saving") : t("det_btnSave")}</span>
                        <span className="sm:hidden">{t("det_btnSaveShort")}</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs border-slate-200">
                        <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("det_btnEdit")}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-xs border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("det_btnDelete")}</span>
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-3xl space-y-4 p-4 sm:space-y-5 sm:p-6">

            {/* Basic Info */}
            <SectionCard icon={Info} title={t("form_secBasic")}>
              <div>
                <FieldLabel>{t("form_labelProjectName")}</FieldLabel>
                {editing
                  ? <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="border-slate-200" />
                  : <ReadonlyField value={opp.Project_name} />
                }
              </div>
              <div>
                <FieldLabel>{t("form_labelDescription")}</FieldLabel>
                {editing
                  ? <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="border-slate-200 resize-none" />
                  : <ReadonlyField value={opp.Description} />
                }
              </div>
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={Settings} title={t("form_secSettings")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>{t("form_labelPriority")}</FieldLabel>
                  {editing ? (
                    <div className="flex flex-wrap gap-2">
                      {PRIORITIES.map((p) => (
                        <button key={p} type="button" onClick={() => setPriority(p)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${priority === p ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                          {p === "Low" ? t("priority_low") : 
                           p === "Medium" ? t("priority_medium") :
                           p === "High" ? t("priority_high") :
                           p === "Critical" ? t("priority_critical") : p}
                        </button>
                      ))}
                    </div>
                  ) : (
                    opp.Priority
                      ? <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_COLORS[opp.Priority] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {opp.Priority === "Low" ? t("priority_low") : 
                           opp.Priority === "Medium" ? t("priority_medium") :
                           opp.Priority === "High" ? t("priority_high") :
                           opp.Priority === "Critical" ? t("priority_critical") : opp.Priority}
                        </span>
                      : <span className="text-slate-300 text-sm">—</span>
                  )}
                </div>
                <div>
                  <FieldLabel>{t("form_labelState")}</FieldLabel>
                  {editing ? (
                    <button type="button" onClick={() => setState((v) => !v)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${state ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}`}>
                      <Zap className={`h-4 w-4 ${state ? "fill-emerald-400 text-emerald-500" : ""}`} />
                      {state ? t("opp_active") : t("opp_inactive")}
                    </button>
                  ) : (
                    opp.State === true
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> {t("opp_active")}</span>
                      : opp.State === false
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500"><XCircle className="h-3 w-3" /> {t("opp_inactive")}</span>
                      : <span className="text-slate-300 text-sm">—</span>
                  )}
                </div>
              </div>
              <div>
                <FieldLabel>{t("form_labelStartDate")}</FieldLabel>
                {editing
                  ? <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border-slate-200 sm:max-w-[220px]" />
                  : <ReadonlyField value={formatDate(opp.Start_Date)} />
                }
              </div>
            </SectionCard>

            {/* Linked Job */}
            <SectionCard icon={Briefcase} title={t("form_secLinkedJob")}>
              {editing ? (
                editLinkedJob ? (
                  <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {editLinkedJob.Project_Name || editLinkedJob.Project_name || editLinkedJob.ID_Jobs}
                      </p>
                      <p className="font-mono text-xs text-slate-500">{editLinkedJob.ID_Jobs}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setJobPickerOpen(true)} className="h-7 text-xs text-blue-600 hover:bg-blue-100">
                        {t("det_btnChangeJob")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditLinkedJob(null)} className="h-7 text-xs text-slate-400 hover:text-red-500 gap-1">
                        <X className="h-3.5 w-3.5" /> {t("det_btnRemoveJob")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setJobPickerOpen(true)}
                    className="w-full flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    {t("form_btnSelectJob")}
                  </button>
                )
              ) : linkedJob ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {linkedJob.Project_Name || (linkedJob as any).Project_name || linkedJobId}
                    </p>
                    <p className="font-mono text-xs text-slate-500">{linkedJobId}</p>
                  </div>
                  <Link href={`/jobs/${linkedJobId}`} target="_blank">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-blue-600 hover:bg-blue-100">
                      <ExternalLink className="h-3 w-3" /> {t("det_btnOpenJob")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-400">{t("det_noJobLinked")}</p>
              )}
            </SectionCard>

            {/* Linked Order */}
            <SectionCard icon={ShoppingCart} title="Linked Order">
              {editing ? (
                <div className="space-y-3">
                  {/* Job must be selected first */}
                  {!editLinkedJob ? (
                    <p className="text-sm text-slate-400 italic">Select a linked Job first to load its orders.</p>
                  ) : (
                    <>
                      {editLinkedOrder ? (
                        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{editLinkedOrder.Title || editLinkedOrder.ID_Order}</p>
                            <p className="font-mono text-xs text-slate-500">{editLinkedOrder.ID_Order}</p>
                            {editLinkedOrder.Formula != null && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <DollarSign className="h-3 w-3" />
                                {editLinkedOrder.Formula}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm"
                            onClick={() => setEditLinkedOrder(null)}
                            className="h-7 gap-1 text-xs text-slate-400 hover:text-red-500">
                            <X className="h-3.5 w-3.5" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fetchJobOrders(editLinkedJob.ID_Jobs)}
                          className="w-full flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Load orders from linked job
                        </button>
                      )}

                      {/* Order list (shown after clicking Load) */}
                      {!editLinkedOrder && jobOrders.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                          {ordersLoading ? (
                            <div className="flex h-20 items-center justify-center">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                            </div>
                          ) : (
                            jobOrders.map((ord) => (
                              <button
                                key={ord.ID_Order}
                                type="button"
                                onClick={() => setEditLinkedOrder(ord)}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{ord.Title || ord.ID_Order}</p>
                                  <p className="font-mono text-[11px] text-slate-400">{ord.ID_Order}</p>
                                </div>
                                {ord.Formula != null && (
                                  <span className="ml-3 flex-shrink-0 flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                    <DollarSign className="h-2.5 w-2.5" />
                                    {ord.Formula}
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {!editLinkedOrder && !ordersLoading && jobOrders.length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-2">No orders found for this job.</p>
                      )}
                    </>
                  )}
                </div>
              ) : opp.order ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{opp.order.Title || opp.order.ID_Order}</p>
                    <p className="font-mono text-xs text-slate-500">{opp.order.ID_Order}</p>
                  </div>
                  {opp.order.Formula != null && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-700">
                        {opp.order.Formula.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No order linked to this opportunity.</p>
              )}
            </SectionCard>

            {/* Skills */}
            <SectionCard icon={Zap} title={t("det_secSkillsCount", { count: opp.skills?.length ?? 0 })}>
              {(opp.skills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {opp.skills.map((skill) => (
                    <span key={skill.ID_Skill} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {skill.Division_trade || skill.Skill_name || skill.ID_Skill}
                      {userRole !== "LEAD_TECHNICIAN" && (
                        <button onClick={() => handleUnlinkSkill(skill.ID_Skill)} className="hover:text-violet-900 ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {userRole !== "LEAD_TECHNICIAN" && (
                <div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t("det_phSkillSearch")}
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                    {filteredSkills.map((skill) => {
                      const linked = linkedSkillIds.includes(skill.ID_Skill)
                      return (
                        <button
                          key={skill.ID_Skill}
                          type="button"
                          onClick={() => linked ? handleUnlinkSkill(skill.ID_Skill) : handleLinkSkill(skill.ID_Skill)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${linked ? "bg-violet-50" : "hover:bg-slate-50"}`}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">{skill.Skill_name}</p>
                            {skill.Division_trade && <p className="text-xs text-slate-500">{skill.Division_trade}</p>}
                          </div>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${linked ? "border-violet-500 bg-violet-500" : "border-slate-300"}`}>
                            {linked && <span className="text-white text-[9px] font-bold">✓</span>}
                          </div>
                        </button>
                      )
                    })}
                    {filteredSkills.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">{t("form_noSkills")}</p>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>

            {userRole !== "LEAD_TECHNICIAN" && (
              <SectionCard
                icon={Users}
                title={t("det_secApplicantsCount", { count: applicants.length })}
                action={
                  <Button variant="outline" size="sm" onClick={() => setApplicantModalOpen(true)} className="h-7 gap-1.5 rounded-lg px-2.5 text-xs border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600">
                    <Plus className="h-3.5 w-3.5" /> {t("det_btnAddApplicant")}
                  </Button>
                }
              >
                {applicants.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-5 w-5 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">{t("det_noApplicants")}</p>
                  </div>
                ) : (
                  <div className="-mx-4 -mb-4 divide-y divide-slate-50 sm:-mx-5 sm:-mb-5">
                    {applicants.map((applicant) => (
                      <div key={applicant.ID_Subcontractor} className="flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-slate-50 sm:gap-3 sm:px-5 sm:py-3.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500 sm:h-9 sm:w-9">
                          {String(applicant.Name ?? "?")[0]?.toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800">{applicant.Name || "—"}</p>
                            {applicant.Score !== null && applicant.Score !== undefined && (
                              <span className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                <Star className="h-2.5 w-2.5" />{applicant.Score}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            {applicant.Email_Address && (
                              <a href={`mailto:${String(applicant.Email_Address).split(",")[0].trim()}`} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 transition-colors">
                                <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="max-w-[80px] truncate sm:max-w-[160px]">{String(applicant.Email_Address).split(",")[0].trim()}</span>
                              </a>
                            )}
                            {applicant.Phone_Number && (
                              <span className="hidden items-center gap-1 text-[11px] text-slate-400 sm:flex">
                                <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                                {String(applicant.Phone_Number).split(",")[0].trim()}
                              </span>
                            )}
                          </div>
                        </div>

                        <AppStateSelector
                          value={applicant.application_state}
                          onChange={(s) => handleUpdateState(applicant.ID_Subcontractor, s)}
                        />

                        <Link href={`/subcontractors/${applicant.ID_Subcontractor}`} target="_blank">
                          <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </Link>

                        <button
                          onClick={() => handleUnlinkApplicant(applicant.ID_Subcontractor)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

          </div>
        </main>
      </div>

      {/* Modals */}
      <DeleteOpportunityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        opportunityId={id}
        projectName={opp.Project_name ?? ""}
        onConfirm={confirmDelete}
      />

      <LinkSubcontractorModal
        open={applicantModalOpen}
        onClose={() => setApplicantModalOpen(false)}
        onLink={handleLinkApplicant}
        excludeIds={applicantIds}
      />

      <JobPickerModal
        open={jobPickerOpen}
        onClose={() => setJobPickerOpen(false)}
        onSelect={(j) => setEditLinkedJob(j)}
      />
    </div>
  )
}
