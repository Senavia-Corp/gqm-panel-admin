"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"
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
  Clock, FileText, Wrench, Shield,
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

function fmtDate(raw: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" })
}

function fmtDateTime(raw: string | null | undefined) {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
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

function ActionBadge({ action }: { action?: string | null }) {
  const map: Record<string, string> = {
    "Job updated":  "bg-blue-100 text-blue-700 border-blue-200",
    "Task created": "bg-violet-100 text-violet-700 border-violet-200",
    "Job created":  "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Job deleted":  "bg-red-100 text-red-600 border-red-200",
  }
  const cls = (action ? map[action] : null) ?? "bg-slate-100 text-slate-600 border-slate-200"
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{action ?? "Activity"}</span>
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
  const activeTab    = searchParams.get("tab") || "details"

  const [user, setUser]     = useState<any>(null)
  const [member, setMember] = useState<MemberFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { hasPermission } = usePermissions()
  const canUpdate = hasPermission("member:update")

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

  // ── Jobs search ────────────────────────────────────────────────────────────
  const [jobSearch, setJobSearch] = useState("")

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
      toast({ title: "Saved", description: "Member updated successfully." })
    } catch (e: any) {
      toast({ title: "Error saving", description: e?.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleCancel = () => {
    if (member) initForm(member)
    setChangedFields(new Set()); setEditing(false)
  }

  // ── Save password ──────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!pwForm.new || !pwForm.confirm) { toast({ title: "Fill all password fields", variant: "destructive" }); return }
    if (pwForm.new !== pwForm.confirm)  { toast({ title: "Passwords do not match", variant: "destructive" }); return }
    if (pwForm.new.length < 8 || !/[A-Z]/.test(pwForm.new) || !/[0-9]/.test(pwForm.new)) {
      toast({ title: "Weak password", description: "Min 8 chars, one uppercase, one number.", variant: "destructive" }); return
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
      toast({ title: "Password updated" })
      setPwForm({ old: "", new: "", confirm: "" }); setPwSection(false)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
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
      toast({ title: "Error loading", description: e?.message, variant: "destructive" })
    } finally { setRpLoading(false) }
  }

  const linkRole = async (roleId: string) => {
    setLinkingId(roleId)
    try {
      const res = await apiFetch(`/api/members/${id}/role/${roleId}`, { method: "POST", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: "Role assigned" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setLinkingId(null) }
  }

  const unlinkRole = async () => {
    setUnlinkingId("role")
    try {
      const res = await apiFetch(`/api/members/${id}/role/unlink`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: "Role removed" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setUnlinkingId(null) }
  }

  const linkPermission = async (permId: string) => {
    setLinkingId(permId)
    try {
      const res = await apiFetch(`/api/members/${id}/permissions/${permId}`, { method: "POST", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: "Permission linked" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setLinkingId(null) }
  }

  const unlinkPermission = async (permId: string) => {
    setUnlinkingId(permId)
    try {
      const res = await apiFetch(`/api/members/${id}/permissions/${permId}`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchMember()
      toast({ title: "Permission removed" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
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

  // ── Filtered jobs ──────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase()
    if (!q) return member?.jobs ?? []
    return (member?.jobs ?? []).filter(j =>
      asStr(j.ID_Jobs).toLowerCase().includes(q) ||
      asStr(j.Project_name).toLowerCase().includes(q) ||
      asStr(j.Job_status).toLowerCase().includes(q) ||
      asStr(j.Service_type).toLowerCase().includes(q) ||
      asStr(j.Project_location).toLowerCase().includes(q)
    )
  }, [member?.jobs, jobSearch])

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
            <ArrowLeft className="h-4 w-4" /> Back to Members
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><h2 className="font-semibold text-red-800">Could not load member</h2></div>
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
            <Button onClick={fetchMember} className="mt-4 gap-2" variant="outline"><RefreshCw className="h-4 w-4" /> Retry</Button>
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
                    <h1 className="truncate text-base font-bold text-slate-900 leading-none sm:text-lg">{member.Member_Name ?? "Unnamed"}</h1>
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
                      <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cancel</span>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{saving ? "Saving…" : "Save Changes"}</span>
                    </Button>
                  </>
                ) : canUpdate ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5 text-xs border-slate-200">
                    ✎<span className="hidden sm:inline"> Edit</span>
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
                        { value: "details",  labelFull: "Details",             labelShort: "Details",  count: null },
                        { value: "jobs",     labelFull: "Jobs",                labelShort: "Jobs",     count: member.jobs?.length ?? 0 },
                        { value: "roles",    labelFull: "Roles & Permissions", labelShort: "Roles",    count: (member.permissions?.length ?? 0) + (member.role ? 1 : 0) },
                        { value: "activity", labelFull: "Activity",            labelShort: "Activity", count: member.tlactivity?.length ?? 0 },
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

                    <SectionCard icon={User} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="Member Information">
                      <div className="grid min-w-0 gap-5 md:grid-cols-2">
                        <div className="min-w-0 md:col-span-2">
                          <FieldLabel>Full Name</FieldLabel>
                          {editing
                            ? <Input value={form.Member_Name} onChange={e => setField("Member_Name", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Member_Name"))}`} placeholder="Full name" />
                            : <p className="text-sm text-slate-800">{member.Member_Name || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Company Role</FieldLabel>
                          {editing
                            ? <Input value={form.Company_Role} onChange={e => setField("Company_Role", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Company_Role"))}`} placeholder="e.g. Account Representative" />
                            : <p className="text-sm text-slate-800">{member.Company_Role || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Email Address</FieldLabel>
                          {editing
                            ? <Input type="email" value={form.Email_Address} onChange={e => setField("Email_Address", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Email_Address"))}`} placeholder="email@example.com" />
                            : member.Email_Address
                              ? <a href={`mailto:${member.Email_Address}`} className="flex min-w-0 items-center gap-1.5 text-sm text-emerald-700 hover:underline"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{member.Email_Address}</span></a>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Phone Number</FieldLabel>
                          {editing
                            ? <Input value={form.Phone_Number} onChange={e => setField("Phone_Number", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Phone_Number"))}`} placeholder="(555) 000-0000" />
                            : member.Phone_Number
                              ? <a href={`tel:${member.Phone_Number}`} className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"><Phone className="h-3.5 w-3.5 flex-shrink-0" />{member.Phone_Number}</a>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div className="min-w-0 md:col-span-2">
                          <FieldLabel>Address</FieldLabel>
                          {editing
                            ? <Textarea value={form.Address} onChange={e => setField("Address", e.target.value)} className={`${inputCls} resize-none ${changedCls(changedFields.has("Address"))}`} rows={2} placeholder="Full address" />
                            : member.Address
                              ? <p className="flex items-start gap-1.5 text-sm text-slate-800"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{member.Address}</p>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                      </div>
                    </SectionCard>

                    {/* Password */}
                    <SectionCard icon={Shield} iconBg="bg-slate-100" iconColor="text-slate-500" title="Password Management"
                      action={
                        <Button variant="outline" size="sm" onClick={() => setPwSection(v => !v)} className="text-xs border-slate-200">
                          {pwSection ? "Cancel" : "Change Password"}
                        </Button>
                      }>
                      {pwSection ? (
                        <div className="space-y-4">
                          <div>
                            <FieldLabel>New Password</FieldLabel>
                            <PasswordInput value={pwForm.new} onChange={v => setPwForm(p => ({ ...p, new: v }))} placeholder="New password" />
                            <p className="mt-1 text-[11px] text-slate-400">Min 8 characters, one uppercase letter, one number</p>
                          </div>
                          <div>
                            <FieldLabel>Confirm Password</FieldLabel>
                            <PasswordInput value={pwForm.confirm} onChange={v => setPwForm(p => ({ ...p, confirm: v }))} placeholder="Confirm new password" />
                          </div>
                          <Button onClick={handleSavePassword} disabled={pwSaving} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            {pwSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {pwSaving ? "Saving…" : "Update Password"}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm italic text-slate-400">Click "Change Password" to update credentials</p>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* ── JOBS tab ──────────────────────────────────────────── */}
                  <TabsContent value="jobs">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800">Jobs</h3>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{member.jobs?.length ?? 0}</span>
                        </div>
                        <div className="relative w-full sm:w-56">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <Input placeholder="Search jobs…" value={jobSearch} onChange={e => setJobSearch(e.target.value)} className={`pl-9 text-xs ${inputCls}`} />
                          {jobSearch && <button onClick={() => setJobSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
                        </div>
                      </div>
                      <div className="p-4 sm:p-6">
                        {filteredJobs.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-12">
                            <Briefcase className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">{jobSearch ? `No jobs matching "${jobSearch}"` : "No jobs associated"}</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredJobs.map(job => {
                              const typeMap: Record<string, { cls: string }> = {
                                QID: { cls: "bg-violet-100 text-violet-700 border-violet-200" },
                                WO:  { cls: "bg-amber-100 text-amber-700 border-amber-200" },
                                BID: { cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
                                PAR: { cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
                              }
                              const typeCls = typeMap[job.Job_type ?? ""]?.cls ?? "bg-slate-100 text-slate-600 border-slate-200"
                              const statusMap: Record<string, string> = {
                                PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
                                COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
                                ACTIVE: "bg-blue-100 text-blue-700 border-blue-200",
                                PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
                                CANCELLED: "bg-red-100 text-red-600 border-red-200",
                              }
                              const statusCls = statusMap[(job.Job_status ?? "").toUpperCase()] ?? "bg-slate-100 text-slate-500 border-slate-200"
                              const sold    = job.Gqm_final_sold_pricing != null ? Number(job.Gqm_final_sold_pricing) : null
                              const formula = job.Gqm_formula_pricing    != null ? Number(job.Gqm_formula_pricing)    : null
                              const cos     = job.Gqm_total_change_orders != null ? Number(job.Gqm_total_change_orders) : null

                              return (
                                <div key={job.ID_Jobs} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-800 leading-none">{job.Project_name ?? job.ID_Jobs}</p>
                                      <p className="mt-1 font-mono text-[11px] text-slate-400">{job.ID_Jobs}</p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-1.5">
                                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${typeCls}`}>{job.Job_type ?? "—"}</span>
                                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}>{job.Job_status ?? "—"}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    {job.Project_location && <div className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3 w-3 text-slate-400" /><span className="truncate">{job.Project_location}</span></div>}
                                    {job.Service_type      && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Wrench className="h-3 w-3 text-slate-400" /><span>{job.Service_type}</span></div>}
                                    {fmtDate(job.Date_assigned) && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="h-3 w-3 text-slate-400" /><span>Assigned {fmtDate(job.Date_assigned)}</span></div>}
                                  </div>
                                  {(sold != null || formula != null || cos != null) && (
                                    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                      {sold    != null && <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><DollarSign className="h-3 w-3" />${sold.toLocaleString()} <span className="font-normal text-slate-400">sold</span></div>}
                                      {formula != null && <div className="flex items-center gap-1 text-xs font-semibold text-blue-700"><DollarSign className="h-3 w-3" />${formula.toLocaleString()} <span className="font-normal text-slate-400">formula</span></div>}
                                      {cos     != null && <div className="flex items-center gap-1 text-xs font-semibold text-orange-600"><Tag className="h-3 w-3" />${cos.toLocaleString()} <span className="font-normal text-slate-400">COs</span></div>}
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    {job.Permit && job.Permit !== "No" && job.Permit !== "N/A"
                                      ? <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Permit: {job.Permit}</span>
                                      : <div />
                                    }
                                    <button onClick={() => router.push(`/jobs/${job.ID_Jobs}`)}
                                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700">
                                      View Job <ExternalLink className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── ROLES & PERMISSIONS tab ───────────────────────────── */}
                  <TabsContent value="roles" className="space-y-4">

                    {/* Role (singular) */}
                    <SectionCard icon={ShieldCheck} iconBg="bg-violet-50" iconColor="text-violet-600" title="Role"
                      action={
                        <Button size="sm" onClick={() => openModal("role")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{member.role ? "Change Role" : "Assign Role"}</span>
                        </Button>
                      }>
                      {member.role ? (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">{member.role.Name ?? "Unnamed Role"}</span>
                              {member.role.Active && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Active</span>}
                            </div>
                            {member.role.Description && <p className="mt-0.5 text-xs text-slate-500">{member.role.Description}</p>}
                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">{member.role.ID_Role}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={unlinkRole} disabled={unlinkingId === "role"}
                            className="flex-shrink-0 gap-1.5 border-slate-200 text-xs text-red-500 hover:border-red-200 hover:bg-red-50">
                            {unlinkingId === "role" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Remove</span>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm italic text-slate-400">No role assigned — click "Assign Role" to add one</p>
                      )}
                    </SectionCard>

                    {/* Permissions */}
                    <SectionCard icon={CheckCircle} iconBg="bg-blue-50" iconColor="text-blue-600" title="Permissions"
                      action={
                        <Button size="sm" onClick={() => openModal("permission")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Link Permission</span>
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
                                    <span className="text-sm font-medium text-slate-800">{perm.Name ?? "Unnamed"}</span>
                                    <PermActionBadge action={perm.Action} />
                                    <ServiceBadge service={perm.Service_Associated} />
                                  </div>
                                  {perm.Description && <p className="mt-0.5 truncate text-xs text-slate-500">{perm.Description}</p>}
                                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{perm.ID_Permission}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => unlinkPermission(perm.ID_Permission)} disabled={busy}
                                  className="flex-shrink-0 gap-1.5 border-slate-200 text-xs text-red-500 hover:border-red-200 hover:bg-red-50">
                                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                                  <span className="hidden sm:inline">Unlink</span>
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-10">
                          <CheckCircle className="h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-500">No permissions linked yet</p>
                          <Button size="sm" onClick={() => openModal("permission")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            <Plus className="h-3.5 w-3.5" /> Link first permission
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
                        <h3 className="text-sm font-semibold text-slate-800">Activity Log</h3>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{member.tlactivity?.length ?? 0}</span>
                      </div>
                      <div className="divide-y divide-slate-50 p-0">
                        {(member.tlactivity ?? []).length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-12">
                            <Clock className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">No activity recorded yet</p>
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
                                  <ActionBadge action={ev.Action} />
                                  {ev.ID_Jobs && (
                                    <button onClick={() => router.push(`/jobs/${ev.ID_Jobs}`)}
                                      className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                                      {ev.ID_Jobs} <ExternalLink className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                                {ev.Description && <p className="mt-1 text-xs text-slate-600">{ev.Description}</p>}
                                {ev.Action_datetime && <p className="mt-1 text-[11px] text-slate-400">{fmtDateTime(ev.Action_datetime)}</p>}
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
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quick Summary</p>
                  </div>
                  <div className="divide-y divide-slate-50 px-5">
                    {[
                      { label: "ID",      value: <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">{member.ID_Member}</span> },
                      { label: "Role",    value: member.role ? <span className="text-xs font-medium text-slate-700">{member.role.Name}</span> : <span className="text-xs italic text-slate-400">No role</span> },
                      { label: "Jobs",       value: <span className="text-sm font-semibold text-slate-800">{member.jobs?.length ?? 0}</span> },
                      { label: "Permissions",value: <span className="text-sm font-semibold text-slate-800">{member.permissions?.length ?? 0}</span> },
                      { label: "Activity",   value: <span className="text-sm font-semibold text-slate-800">{member.tlactivity?.length ?? 0}</span> },
                      { label: "Podio",   value: member.podio_item_id
                          ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle className="h-3 w-3" />Linked</span>
                          : <span className="text-[11px] italic text-slate-400">Not linked</span>
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
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contact</p>
                  </div>
                  <div className="space-y-3 p-5">
                    {member.Email_Address
                      ? <a href={`mailto:${member.Email_Address}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-emerald-700 transition-colors"><Mail className="h-3.5 w-3.5 text-slate-400" />{member.Email_Address}</a>
                      : <p className="text-sm italic text-slate-400">No email</p>
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
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-600" /> Assign Role</DialogTitle>
            <DialogDescription>Select a role to assign. The member can only have one role at a time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input value={rpSearch} onChange={e => setRpSearch(e.target.value)} placeholder="Search roles…" className={`pl-9 ${inputCls}`} />
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[55vh] overflow-x-auto overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-32">ID</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rpLoading
                    ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm italic text-slate-400">Loading roles…</TableCell></TableRow>
                    : filteredRoles.length === 0
                      ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm italic text-slate-400">No roles found</TableCell></TableRow>
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
                                  {isCurrent ? "Current" : "Assign"}
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
          <DialogFooter><Button variant="outline" onClick={() => setModalMode(null)} className="text-xs border-slate-200">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Permission Modal ──────────────────────────────────────────────── */}
      <Dialog open={modalMode === "permission"} onOpenChange={o => !o && setModalMode(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-blue-600" /> Link Permission</DialogTitle>
            <DialogDescription>Search and link permissions. Already linked ones are disabled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input value={rpSearch} onChange={e => setRpSearch(e.target.value)} placeholder="Search by name, action, service…" className={`pl-9 ${inputCls}`} />
            </div>

            {/* Mobile cards */}
            <div className="max-h-[55vh] overflow-y-auto sm:hidden">
              {rpLoading ? (
                <p className="py-10 text-center text-sm italic text-slate-400">Loading permissions…</p>
              ) : filteredPerms.length === 0 ? (
                <p className="py-10 text-center text-sm italic text-slate-400">No permissions found</p>
              ) : (
                <div className="space-y-2">
                  {filteredPerms.map(perm => {
                    const already = linkedPermIds.has(perm.ID_Permission)
                    const busy    = linkingId === perm.ID_Permission
                    return (
                      <div key={perm.ID_Permission} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{perm.Name ?? "—"}</span>
                            <PermActionBadge action={perm.Action} />
                            <ServiceBadge service={perm.Service_Associated} />
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{perm.ID_Permission}</p>
                        </div>
                        <Button size="sm" onClick={() => linkPermission(perm.ID_Permission)} disabled={already || busy}
                          variant={already ? "outline" : "default"}
                          className={`flex-shrink-0 gap-1.5 text-xs ${!already ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                          {already ? "Linked" : "Link"}
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
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-32 py-3">ID</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 py-3">Name</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-24 py-3">Action</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-32 py-3">Service</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-28 text-right py-3">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rpLoading
                    ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm italic text-slate-400">Loading permissions…</TableCell></TableRow>
                    : filteredPerms.length === 0
                      ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm italic text-slate-400">No permissions found</TableCell></TableRow>
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
                                  {already ? "Linked" : "Link"}
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
          <DialogFooter><Button variant="outline" onClick={() => setModalMode(null)} className="text-xs border-slate-200">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}