"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  ShieldCheck, Search, Plus, Link2, Unlink,
  RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff,
  ExternalLink, Wrench, Shield, Users
} from "lucide-react"
import { SelectSubcontractorModal } from "@/components/organisms/SelectSubcontractorModal"

// ─── Types ────────────────────────────────────────────────────────────────────

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

type TechnicianFull = {
  ID_Technician: string
  Name?: string | null
  Location?: string | null
  Email_Address?: string | null
  Phone_Number?: string | null
  Type_of_technician?: string | null
  ID_Subcontractor?: string | null
  subcontractor?: { ID_Subcontractor: string; Name: string } | null
  permissions?: Permission[]
  tlactivity?: TLActivity[]
}

const SKIP_PATCH = new Set(["ID_Technician", "subcontractor", "permissions", "tlactivity"])

// ─── Helpers ──────────────────────────────────────────────────────────────────

const asStr = (v: unknown) => (v == null ? "" : String(v))

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
  const cls = action?.toLowerCase().includes("delete") ? "bg-red-100 text-red-600 border-red-200" :
              action?.toLowerCase().includes("create") ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
              "bg-blue-100 text-blue-700 border-blue-200"
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

export default function TechnicianDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { id }       = use(params)
  const activeTab    = searchParams.get("tab") || "details"

  const [user, setUser]     = useState<any>(null)
  const [technician, setTechnician] = useState<TechnicianFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [subcontractors, setSubcontractors] = useState<any[]>([])

  const { hasPermission } = usePermissions()
  const canUpdate = hasPermission("technician:update")

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    Name:               "",
    Location:           "",
    Email_Address:      "",
    Phone_Number:       "",
    Type_of_technician: "",
    ID_Subcontractor:   "none",
  })

  const setField = (k: string, v: string) => {
    setChangedFields(p => { const n = new Set(p); n.add(k); return n })
    setForm(p => ({ ...p, [k]: v }))
  }

  // ── Password state ─────────────────────────────────────────────────────────
  const [pwSection,  setPwSection]  = useState(false)
  const [pwSaving,   setPwSaving]   = useState(false)
  const [pwForm, setPwForm] = useState({ old: "", new: "", confirm: "" })

  // ── Roles & Permissions modal state ───────────────────────────────────────
  const [modalMode, setModalMode] = useState<"permission" | null>(null)
  const [allPerms,   setAllPerms]   = useState<Permission[]>([])
  const [rpLoading,  setRpLoading]  = useState(false)
  const [rpSearch,   setRpSearch]   = useState("")
  const [linkingId,  setLinkingId]  = useState<string | null>(null)
  const [unlinkingId,setUnlinkingId]= useState<string | null>(null)

  const [subModalOpen, setSubModalOpen] = useState(false)

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
    
    // Fetch subcontractors for dropdown
    apiFetch("/api/subcontractors_table?limit=1000")
      .then(res => res.json())
      .then(data => setSubcontractors(data.results || []))
      .catch(console.error)
  }, [router])

  const initForm = (t: TechnicianFull) => setForm({
    Name:               t.Name               ?? "",
    Location:           t.Location           ?? "",
    Email_Address:      t.Email_Address      ?? "",
    Phone_Number:       t.Phone_Number       ?? "",
    Type_of_technician: t.Type_of_technician ?? "Worker",
    ID_Subcontractor:   t.ID_Subcontractor   ?? "none",
  })

  // ── Fetch technician ───────────────────────────────────────────────────────────
  const fetchTechnician = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const res = await apiFetch(`/api/technician/${id}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: TechnicianFull = await res.json()
      setTechnician(data)
      initForm(data)
      setChangedFields(new Set())
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load technician")
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { if (user) fetchTechnician() }, [user, fetchTechnician])

  // ── Save details ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!technician) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      for (const k of Object.keys(form)) {
        if (!SKIP_PATCH.has(k)) {
          if (k === "ID_Subcontractor") {
            payload[k] = form[k] === "none" ? null : form[k]
          } else {
            payload[k] = (form as any)[k].trim() || null
          }
        }
      }
      const res = await apiFetch(`/api/technician/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? `Error ${res.status}`)
      }
      
      // refetch to get updated relations (e.g. subcontractor name)
      await fetchTechnician()
      setEditing(false); setChangedFields(new Set())
      toast({ title: "Saved", description: "Technician updated successfully." })
    } catch (e: any) {
      toast({ title: "Error saving", description: e?.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleCancel = () => {
    if (technician) initForm(technician)
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
      const res = await apiFetch(`/api/technician/${id}`, {
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
  const openModal = async (mode: "permission") => {
    setModalMode(mode); setRpSearch(""); setRpLoading(true)
    try {
      const res = await apiFetch("/api/permissions", { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const items = Array.isArray(data) ? data : (data.results ?? [])
      setAllPerms(items)
    } catch (e: any) {
      toast({ title: "Error loading", description: e?.message, variant: "destructive" })
    } finally { setRpLoading(false) }
  }

  const linkPermission = async (permId: string) => {
    setLinkingId(permId)
    try {
      const res = await apiFetch(`/api/technician/${id}/permissions/${permId}`, { method: "POST", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchTechnician()
      toast({ title: "Permission linked" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setLinkingId(null) }
  }

  const unlinkPermission = async (permId: string) => {
    setUnlinkingId(permId)
    try {
      const res = await apiFetch(`/api/technician/${id}/permissions/${permId}`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchTechnician()
      toast({ title: "Permission removed" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setUnlinkingId(null) }
  }

  // ── Filtered modal lists ───────────────────────────────────────────────────
  const filteredPerms = useMemo(() => {
    const q = rpSearch.toLowerCase()
    return allPerms.filter(p =>
      !q || asStr(p.Name).toLowerCase().includes(q) ||
      asStr(p.Action).toLowerCase().includes(q) ||
      asStr(p.Service_Associated).toLowerCase().includes(q)
    )
  }, [allPerms, rpSearch])

  const linkedPermIds = useMemo(() => new Set((technician?.permissions ?? []).map(p => p.ID_Permission)), [technician?.permissions])

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!user) return null
  if (loading) return <PageSkeleton user={user} />

  if (!technician) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 p-6">
          <button onClick={() => router.push("/subcontractors")} className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Subcontractors
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><h2 className="font-semibold text-red-800">Could not load technician</h2></div>
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
            <Button onClick={fetchTechnician} className="mt-4 gap-2" variant="outline"><RefreshCw className="h-4 w-4" /> Retry</Button>
          </div>
        </main>
      </div>
    </div>
  )

  const initials = (technician.Name ?? technician.ID_Technician).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "??"

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
                <button onClick={() => router.push("/subcontractors")}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm sm:h-10 sm:w-10">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-slate-900 leading-none sm:text-lg">{technician.Name ?? "Unnamed"}</h1>
                    <p className="mt-0.5 hidden font-mono text-xs text-slate-400 sm:block">{technician.ID_Technician}</p>
                  </div>
                </div>
                {technician.Type_of_technician && (
                  <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 md:inline-flex">
                    <Wrench className="h-3 w-3 text-slate-400" />{technician.Type_of_technician}
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
                <Tabs value={activeTab} onValueChange={v => router.push(`/technicians/${id}?tab=${v}`)}>

                  {/* Tab bar */}
                  <div className="mb-4 overflow-x-auto sm:mb-5">
                    <TabsList className="inline-flex h-auto gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                      {[
                        { value: "details",  labelFull: "Details",             labelShort: "Details",  count: null },
                        { value: "permissions", labelFull: "Permissions",      labelShort: "Permissions",    count: technician.permissions?.length ?? 0 },
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

                    <SectionCard icon={User} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="Technician Information">
                      <div className="grid min-w-0 gap-5 md:grid-cols-2">
                        <div className="min-w-0 md:col-span-2">
                          <FieldLabel>Full Name</FieldLabel>
                          {editing
                            ? <Input value={form.Name} onChange={e => setField("Name", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Name"))}`} placeholder="Full name" />
                            : <p className="text-sm text-slate-800">{technician.Name || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Email Address</FieldLabel>
                          {editing
                            ? <Input type="email" value={form.Email_Address} onChange={e => setField("Email_Address", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Email_Address"))}`} placeholder="email@example.com" />
                            : technician.Email_Address
                              ? <a href={`mailto:${technician.Email_Address}`} className="flex min-w-0 items-center gap-1.5 text-sm text-emerald-700 hover:underline"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{technician.Email_Address}</span></a>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Phone Number</FieldLabel>
                          {editing
                            ? <Input value={form.Phone_Number} onChange={e => setField("Phone_Number", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Phone_Number"))}`} placeholder="(555) 000-0000" />
                            : technician.Phone_Number
                              ? <a href={`tel:${technician.Phone_Number}`} className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"><Phone className="h-3.5 w-3.5 flex-shrink-0" />{technician.Phone_Number}</a>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Location</FieldLabel>
                          {editing
                            ? <Input value={form.Location} onChange={e => setField("Location", e.target.value)} className={`${inputCls} ${changedCls(changedFields.has("Location"))}`} placeholder="e.g. Orlando, FL" />
                            : technician.Location
                              ? <p className="flex items-start gap-1.5 text-sm text-slate-800"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{technician.Location}</p>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Role Type</FieldLabel>
                          {editing
                            ? (
                               <Select value={form.Type_of_technician} onValueChange={v => setField("Type_of_technician", v)}>
                                 <SelectTrigger className={`${inputCls} ${changedCls(changedFields.has("Type_of_technician"))}`}>
                                   <SelectValue placeholder="Select type" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="Worker">Worker</SelectItem>
                                   <SelectItem value="Leader">Leader</SelectItem>
                                 </SelectContent>
                               </Select>
                            )
                            : <p className="text-sm text-slate-800">{technician.Type_of_technician || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div className="min-w-0 md:col-span-2">
                          <FieldLabel>Subcontractor Association</FieldLabel>
                          {editing
                            ? (
                               <div className="flex items-center gap-3">
                                 <Button
                                   variant="outline"
                                   onClick={() => setSubModalOpen(true)}
                                   className={`flex-1 justify-between bg-slate-50 border-slate-200 hover:bg-slate-100 ${form.ID_Subcontractor !== "none" ? "text-slate-900" : "text-slate-400"}`}
                                 >
                                   <span className="truncate">
                                     {form.ID_Subcontractor !== "none" 
                                       ? (subcontractors.find(s => s.ID_Subcontractor === form.ID_Subcontractor)?.Name || technician.subcontractor?.Name || form.ID_Subcontractor)
                                       : "Select a Subcontractor"}
                                   </span>
                                   <Users className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                                 </Button>
                                 {form.ID_Subcontractor !== "none" && (
                                   <Button variant="ghost" onClick={() => setField("ID_Subcontractor", "none")} className="text-slate-400 hover:text-red-500">
                                     Clear
                                   </Button>
                                 )}
                               </div>
                            )
                            : technician.subcontractor
                              ? <p className="flex items-center gap-1.5 text-sm text-slate-800"><Users className="h-4 w-4 text-slate-400" />{technician.subcontractor.Name}</p>
                              : <p className="text-sm italic text-slate-400">Independent</p>
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

                  {/* ── PERMISSIONS tab ───────────────────────────── */}
                  <TabsContent value="permissions" className="space-y-4">
                    <SectionCard icon={CheckCircle} iconBg="bg-blue-50" iconColor="text-blue-600" title="Permissions"
                      action={
                        <Button size="sm" onClick={() => openModal("permission")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Link Permission</span>
                        </Button>
                      }>
                      {(technician.permissions ?? []).length > 0 ? (
                        <div className="space-y-2">
                          {[...(technician.permissions ?? [])].sort((a, b) => asStr(a.Name).localeCompare(asStr(b.Name))).map(perm => {
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
                      { label: "ID",      value: <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">{technician.ID_Technician}</span> },
                      { label: "Permissions",value: <span className="text-sm font-semibold text-slate-800">{technician.permissions?.length ?? 0}</span> },
                      { label: "Subcontractor",   value: technician.subcontractor
                          ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle className="h-3 w-3" />Linked</span>
                          : <span className="text-[11px] italic text-slate-400">Independent</span>
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
                    {technician.Email_Address
                      ? <a href={`mailto:${technician.Email_Address}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-emerald-700 transition-colors"><Mail className="h-3.5 w-3.5 text-slate-400" />{technician.Email_Address}</a>
                      : <p className="text-sm italic text-slate-400">No email</p>
                    }
                    {technician.Phone_Number
                      ? <a href={`tel:${technician.Phone_Number}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-emerald-700 transition-colors"><Phone className="h-3.5 w-3.5 text-slate-400" />{technician.Phone_Number}</a>
                      : null
                    }
                    {technician.Location && <p className="flex items-start gap-2 text-sm text-slate-700"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{technician.Location}</p>}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>

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

      <SelectSubcontractorModal
        open={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        onSelect={(sub) => {
          setField("ID_Subcontractor", sub.ID_Subcontractor)
          setSubModalOpen(false)
        }}
        selectedId={form.ID_Subcontractor !== "none" ? form.ID_Subcontractor : undefined}
      />
    </div>
  )
}
