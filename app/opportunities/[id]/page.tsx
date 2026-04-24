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
  ExternalLink, Star, Mail, Phone, ChevronDown,
} from "lucide-react"

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
          {value ?? "No state"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl p-1">
        <DropdownMenuItem
          onClick={() => onChange("")}
          className="rounded-lg text-xs text-slate-400 cursor-pointer"
        >
          No state
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
              {s}
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
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Icon className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
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
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Briefcase className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Job</h2>
              <p className="text-xs text-slate-400 mt-0.5">Link this opportunity to a job</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by job ID, project name…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center"><p className="text-sm text-slate-400">No jobs found</p></div>
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

        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-600">{total}</span>
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

// ─── Link Applicant Modal ─────────────────────────────────────────────────────

function LinkApplicantModal({ open, onClose, onLink, excludeIds }: {
  open: boolean
  onClose: () => void
  onLink: (subId: string) => Promise<void>
  excludeIds: string[]
}) {
  const LIMIT = 10
  const [query, setQuery] = useState("")
  const dQ = useDebounce(query, 300)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  useEffect(() => { if (open) { setQuery(""); setPage(1) } }, [open])
  useEffect(() => { setPage(1) }, [dQ])

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ mode: "table", page: String(page), limit: String(LIMIT) })
    if (dQ) params.set("q", dQ)
    apiFetch(`/api/subcontractors?${params}`, { cache: "no-store", signal: ctrl.signal })
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
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add Applicant</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Link a subcontractor to this opportunity{total > 0 && ` · ${total} total`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, org, email…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center"><p className="text-sm text-slate-400">No subcontractors found</p></div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {rows.map((sub) => {
                const alreadyLinked = excludeIds.includes(sub.ID_Subcontractor)
                const isLinking = linking === sub.ID_Subcontractor
                const org = normalizeOrg(sub.Organization)
                const display = org || sub.Email_Address || sub.ID_Subcontractor
                return (
                  <li key={sub.ID_Subcontractor} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 text-sm font-bold">
                      {String(sub.Name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{sub.Name || "—"}</p>
                      <p className="text-xs text-slate-400 truncate">{display}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                      {sub.ID_Subcontractor}
                    </span>
                    <button
                      type="button"
                      disabled={alreadyLinked || linking !== null}
                      onClick={async () => {
                        setLinking(sub.ID_Subcontractor)
                        await onLink(sub.ID_Subcontractor)
                        setLinking(null)
                      }}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        alreadyLinked
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isLinking
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                      }`}
                    >
                      {isLinking
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking…</>
                        : alreadyLinked
                        ? "Linked"
                        : <><Plus className="h-3.5 w-3.5" /> Add</>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-600">{total}</span>
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

  // Edit form state
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [state, setState] = useState<boolean>(true)
  const [priority, setPriority] = useState("Medium")
  const [startDate, setStartDate] = useState("")
  const [editLinkedJob, setEditLinkedJob] = useState<any | null>(null)

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
    } catch {
      toast({ title: "Error", description: "Failed to load opportunity.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
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
      toast({ title: "Saved", description: "Opportunity updated." })
      await fetchOpp()
    } catch (e: any) {
      toast({ title: "Error saving", description: e?.message ?? "Failed to save changes.", variant: "destructive" })
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
    setEditing(false)
  }

  // Skills
  const linkedSkillIds = useMemo(() => (opp?.skills ?? []).map((s) => s.ID_Skill), [opp])

  const handleLinkSkill = async (skillId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/skills/${skillId}`, { method: "POST" })
    if (!res.ok) { toast({ title: "Error", description: "Failed to link skill.", variant: "destructive" }); return }
    await fetchOpp()
  }

  const handleUnlinkSkill = async (skillId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/skills/${skillId}`, { method: "DELETE" })
    if (!res.ok) { toast({ title: "Error", description: "Failed to unlink skill.", variant: "destructive" }); return }
    await fetchOpp()
  }

  // Applicants
  const applicantIds = useMemo(() => applicants.map((a) => a.ID_Subcontractor), [applicants])

  const handleLinkApplicant = async (subId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/applicants/${subId}`, { method: "POST" })
    if (!res.ok) { toast({ title: "Error", description: "Failed to link applicant.", variant: "destructive" }); return }
    const list: OpportunityApplicant[] = await apiFetch(`/api/opportunities/${id}/applicants`)
      .then((r) => r.json()).catch(() => [])
    setApplicants(list)
  }

  const handleUnlinkApplicant = async (subId: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/applicants/${subId}`, { method: "DELETE" })
    if (!res.ok) { toast({ title: "Error", description: "Failed to remove applicant.", variant: "destructive" }); return }
    setApplicants((prev) => prev.filter((a) => a.ID_Subcontractor !== subId))
  }

  const handleUpdateState = async (subId: string, newState: string) => {
    const res = await apiFetch(`/api/opportunities/${id}/applicants/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: newState || null }),
    })
    if (!res.ok) { toast({ title: "Error", description: "Failed to update state.", variant: "destructive" }); return }
    setApplicants((prev) => prev.map((a) => a.ID_Subcontractor === subId ? { ...a, application_state: newState || null } : a))
  }

  const confirmDelete = async () => {
    const res = await apiFetch(`/api/opportunities/${id}`, { method: "DELETE" })
    if (!res.ok) { toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }); return }
    toast({ title: "Deleted", description: "Opportunity removed." })
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
            <p className="text-slate-500">Opportunity not found.</p>
            <Button onClick={() => router.push("/opportunities")}>Back to list</Button>
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
        <main className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" onClick={() => returnTo ? router.push(returnTo) : router.push("/opportunities")} className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 flex-shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-sm flex-shrink-0">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-black text-slate-900 truncate">{opp.Project_name || opp.ID_Opportunities}</h1>
                  <p className="text-xs text-slate-500 font-mono">{opp.ID_Opportunities}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving} className="gap-1.5 text-xs border-slate-200">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs border-slate-200">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-xs border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto p-6 space-y-5">

            {/* Basic Info */}
            <SectionCard icon={Info} title="Basic Info">
              <div>
                <FieldLabel>Project Name</FieldLabel>
                {editing
                  ? <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="border-slate-200" />
                  : <ReadonlyField value={opp.Project_name} />
                }
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                {editing
                  ? <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="border-slate-200 resize-none" />
                  : <ReadonlyField value={opp.Description} />
                }
              </div>
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={Settings} title="Settings">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  {editing ? (
                    <div className="flex flex-wrap gap-2">
                      {PRIORITIES.map((p) => (
                        <button key={p} type="button" onClick={() => setPriority(p)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${priority === p ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  ) : (
                    opp.Priority
                      ? <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_COLORS[opp.Priority] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>{opp.Priority}</span>
                      : <span className="text-slate-300 text-sm">—</span>
                  )}
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  {editing ? (
                    <button type="button" onClick={() => setState((v) => !v)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${state ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}`}>
                      <Zap className={`h-4 w-4 ${state ? "fill-emerald-400 text-emerald-500" : ""}`} />
                      {state ? "Active" : "Inactive"}
                    </button>
                  ) : (
                    opp.State === true
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Active</span>
                      : opp.State === false
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500"><XCircle className="h-3 w-3" /> Inactive</span>
                      : <span className="text-slate-300 text-sm">—</span>
                  )}
                </div>
              </div>
              <div>
                <FieldLabel>Start Date</FieldLabel>
                {editing
                  ? <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-slate-200 max-w-[220px]" />
                  : <ReadonlyField value={formatDate(opp.Start_Date)} />
                }
              </div>
            </SectionCard>

            {/* Linked Job */}
            <SectionCard icon={Briefcase} title="Linked Job">
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
                        Change
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditLinkedJob(null)} className="h-7 text-xs text-slate-400 hover:text-red-500 gap-1">
                        <X className="h-3.5 w-3.5" /> Remove
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
                    Select a job to link…
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
                      <ExternalLink className="h-3 w-3" /> Open Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No job linked</p>
              )}
            </SectionCard>

            {/* Skills */}
            <SectionCard icon={Zap} title={`Required Skills (${opp.skills?.length ?? 0})`}>
              {(opp.skills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {opp.skills.map((skill) => (
                    <span key={skill.ID_Skill} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {skill.Skill_name ?? skill.ID_Skill}
                      <button onClick={() => handleUnlinkSkill(skill.ID_Skill)} className="hover:text-violet-900 ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search skills to add…"
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
                    <p className="text-xs text-slate-400 text-center py-4">No skills found</p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Applicants */}
            <SectionCard
              icon={Users}
              title={`Applicants (${applicants.length})`}
              action={
                <Button variant="outline" size="sm" onClick={() => setApplicantModalOpen(true)} className="h-7 gap-1.5 rounded-lg px-2.5 text-xs border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              }
            >
              {applicants.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Users className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">No applicants yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 -mx-5 -mb-5">
                  {applicants.map((applicant) => (
                    <div key={applicant.ID_Subcontractor} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 text-sm font-bold">
                        {String(applicant.Name ?? "?")[0]?.toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">{applicant.Name || "—"}</p>
                          {applicant.Score !== null && applicant.Score !== undefined && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 flex-shrink-0">
                              <Star className="h-2.5 w-2.5" />{applicant.Score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {applicant.Email_Address && (
                            <a href={`mailto:${String(applicant.Email_Address).split(",")[0].trim()}`} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 transition-colors">
                              <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="truncate max-w-[160px]">{String(applicant.Email_Address).split(",")[0].trim()}</span>
                            </a>
                          )}
                          {applicant.Phone_Number && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
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

          </div>
        </main>
      </div>

      <DeleteOpportunityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        opportunityId={opp.ID_Opportunities}
        projectName={opp.Project_name ?? ""}
        onConfirm={confirmDelete}
      />

      <LinkApplicantModal
        open={applicantModalOpen}
        onClose={() => setApplicantModalOpen(false)}
        onLink={handleLinkApplicant}
        excludeIds={applicantIds}
      />

      <JobPickerModal
        open={jobPickerOpen}
        onClose={() => setJobPickerOpen(false)}
        onSelect={(job) => setEditLinkedJob(job)}
      />
    </div>
  )
}
