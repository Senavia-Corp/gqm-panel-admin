"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimelineItem } from "@/components/molecules/TimelineItem"
import { TechnicianCard } from "@/components/organisms/TechnicianCard"
import { DeleteTechnicianDialog } from "@/components/organisms/DeleteTechnicianDialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import {
  ArrowLeft, Save, Search, Plus, ChevronLeft, ChevronRight,
  Wrench, Link2, Unlink, Loader2, MapPin, Map, X, Mail, Phone,
  Building2, Globe, Star, ShieldCheck, FileText, CheckCircle,
  AlertCircle, RefreshCw, Hash, Briefcase, ClipboardList, Calendar,
  DollarSign, Tag, ExternalLink, Clock, Sparkles,
} from "lucide-react"
import type { Subcontractor } from "@/lib/types"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

// ─── Types ────────────────────────────────────────────────────────────────────

type Skill = {
  ID_Skill: string
  Skill_name?: string | null
  Division_trade?: string | null
}

type SubcTechnician = {
  ID_Technician: string
  Name?: string | null
  Email_Address?: string | null
  Location?: string | null
  Phone_Number?: string | null
  Type_of_technician?: "Leader" | "Worker" | string | null
  ID_Subcontractor?: string | null
  tasks?: any[]
}

type SubcFull = Subcontractor & {
  technicians?: SubcTechnician[]
  attachments?: any[]
  opportunities?: any[]
  orders?: any[]
  jobs?: any[]
  skills?: Skill[]
  tlactivity?: any[]
  role?: any
  podio_item_id?: string | null
  Coverage_Area?: string[] | null
}

// Fields to never send in PATCH
const SKIP_ON_PATCH = new Set([
  "ID_Subcontractor", "podio_item_id",
  "technicians", "orders", "jobs", "attachments",
  "tlactivity", "skills", "opportunities", "role",
])

const COVERAGE_AREA_OPTIONS = [
  "Dade County", "Broward County", "Palm Beach County", "St. Lucie County",
  "Orange County", "Seminole County", "Pinellas County (St Pete)",
  "Hillsborough County (Tampa)", "Osceola County",
] as const

const ITEMS_PER_PAGE = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

const asStr = (v: unknown) => (v == null ? "" : String(v))

function normalizeOrg(raw: any): string {
  if (!raw) return ""
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean).join(", ")
  let s = String(raw).trim().replace(/\\"/g, '"')
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]")))
    s = s.slice(1, -1).trim()
  return s.replace(/^["']+|["']+$/g, "").trim()
}

function parseArrayField(raw: any): string[] {
  if (!raw) return []
  const s = (Array.isArray(raw) ? raw.join(",") : String(raw)).trim()
  if (!s) return []
  let inner = s
  if ((inner.startsWith("{") && inner.endsWith("}")) || (inner.startsWith("[") && inner.endsWith("]")))
    inner = inner.slice(1, -1)
  const parts: string[] = []
  let cur = "", inQ = false
  for (const ch of inner) {
    if (ch === '"') { inQ = !inQ; continue }
    if (ch === "," && !inQ) { parts.push(cur.trim()); cur = ""; continue }
    cur += ch
  }
  if (cur.trim()) parts.push(cur.trim())
  return [...new Set(parts.map((p) => p.replace(/^[{["']+|[}\]"']+$/g, "").trim()).filter(Boolean))]
}

function serializeArrayField(values: string[]): string | null {
  const clean = values.filter((v) => v.trim())
  if (!clean.length) return null
  if (clean.length === 1) return clean[0]
  return `{${clean.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",")}}`
}

function safeUrl(url?: string | null) {
  if (!url?.trim()) return null
  return url.startsWith("http") ? url : `https://${url}`
}

function normalizeSkillsResponse(data: any): Skill[] {
  if (Array.isArray(data)) return data as Skill[]
  if (Array.isArray(data?.results)) return data.results as Skill[]
  if (Array.isArray(data?.data)) return data.data as Skill[]
  return []
}

// ─── Mini components ──────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, iconBg, iconColor, title, action, children }: {
  icon: React.ElementType; iconBg: string; iconColor: string
  title: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs italic text-slate-400">No status</span>
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-100 text-slate-500 border-slate-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  }
  const cls = map[status.toLowerCase()] ?? "bg-blue-100 text-blue-700 border-blue-200"
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-xs italic text-slate-400">No score</span>
  const pct = Math.min(100, Math.max(0, score))
  const cls = pct >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : pct >= 50 ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-600 border-red-200"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Star className="h-2.5 w-2.5 fill-current" />
      {pct % 1 === 0 ? pct : pct.toFixed(1)}
    </span>
  )
}

function CertBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs italic text-slate-400">—</span>
  const good = ["yes", "active", "completed", "passed"].includes(value.toLowerCase())
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${good ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
      <CheckCircle className="h-3 w-3" />{value}
    </span>
  )
}

function ArrayEditField({ values, icon: Icon, placeholder, onChange }: {
  values: string[]; icon: React.ElementType; placeholder: string
  onChange: (v: string[]) => void
}) {
  const items = values.length ? values : [""]
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input type="text" value={item} placeholder={placeholder}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n) }}
            className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/30 transition-colors"
          />
          <button type="button"
            onClick={() => { if (items.length === 1) { onChange([""]); return } onChange(items.filter((_, i) => i !== idx)) }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
        <Plus className="h-3 w-3" /> Add another
      </button>
    </div>
  )
}

function ArrayDisplayChips({ values, icon: Icon, href, emptyLabel }: {
  values: string[]; icon: React.ElementType
  href?: (v: string) => string; emptyLabel: string
}) {
  if (!values.length) return <span className="text-sm italic text-slate-400">{emptyLabel}</span>
  return (
    <div className="flex flex-col gap-1">
      {values.map((v, i) => href
        ? <a key={i} href={href(v)} className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{v}
        </a>
        : <span key={i} className="flex items-center gap-1.5 text-sm text-slate-700">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{v}
        </span>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton({ user }: { user: any }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="h-16 animate-pulse rounded-2xl bg-white border border-slate-200" />
            <div className="h-10 animate-pulse rounded-xl bg-white border border-slate-200" />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {[1, 2, 3].map(i => <div key={i} className={`animate-pulse rounded-2xl border border-slate-200 bg-white`} style={{ height: `${120 + i * 20}px` }} />)}
              </div>
              <div className="space-y-4">
                <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubcontractorDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ id: string }>()
  const id = params.id as string
  const activeTab = searchParams.get("tab") || "details"

  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)

  // ── Data state ─────────────────────────────────────────────────────────────
  const [subc, setSubc] = useState<SubcFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncPodio, setSyncPodio] = useState(true)
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    Name: "",
    Organization: "",
    Organization_Website: "",
    Address: "",
    Specialty: "",
    Status: "",
    Score: "",
    Gqm_compliance: "",
    Gqm_best_service_training: "",
    Notes: "",
    Email_Address: [""] as string[],
    Phone_Number: [""] as string[],
    Coverage_Area: [] as string[],
  })

  const setField = (k: string, v: any) => {
    setChangedFields((p) => { const n = new Set(p); n.add(k); return n })
    setForm((p) => ({ ...p, [k]: v }))
  }

  // ── Technicians state ──────────────────────────────────────────────────────
  const [technicians, setTechnicians] = useState<SubcTechnician[]>([])
  const [techSearch, setTechSearch] = useState("")
  const [techTypeFilter, setTechTypeFilter] = useState<"all" | "Leader" | "Worker">("all")
  const [techPage, setTechPage] = useState(1)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; technician: SubcTechnician | null }>({ open: false, technician: null })

  // ── Skills state ───────────────────────────────────────────────────────────
  const [skillsSyncPodio, setSkillsSyncPodio] = useState(true)
  const [skillsModalOpen, setSkillsModalOpen] = useState(false)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [skillsSearch, setSkillsSearch] = useState("")
  const [skillsPage, setSkillsPage] = useState(1)
  const [linkingSkillId, setLinkingSkillId] = useState<string | null>(null)
  const [unlinkingSkillId, setUnlinkingSkillId] = useState<string | null>(null)

  // ── Coverage picker ────────────────────────────────────────────────────────
  const [coveragePick, setCoveragePick] = useState<string>("")

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  // ── Helpers to init form from subc ─────────────────────────────────────────
  const initForm = (s: SubcFull) => setForm({
    Name: s.Name ?? "",
    Organization: normalizeOrg(s.Organization),
    Organization_Website: s.Organization_Website ?? "",
    Address: s.Address ?? "",
    Specialty: s.Specialty ?? "",
    Status: s.Status ?? "",
    Score: s.Score != null ? String(s.Score) : "",
    Gqm_compliance: s.Gqm_compliance ?? "",
    Gqm_best_service_training: s.Gqm_best_service_training ?? "",
    Notes: s.Notes ?? "",
    Email_Address: parseArrayField(s.Email_Address),
    Phone_Number: parseArrayField(s.Phone_Number),
    Coverage_Area: Array.isArray(s.Coverage_Area) ? s.Coverage_Area : [],
  })

  // ── Fetch subcontractor ────────────────────────────────────────────────────
  const fetchSubc = async () => {
    if (!id) return
    setLoading(true); setLoadError(null)
    try {
      const res = await apiFetch(`/api/subcontractors/${id}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json() as SubcFull
      const normalized: SubcFull = {
        ...data,
        Organization: normalizeOrg(data.Organization),
        technicians: Array.isArray(data.technicians) ? data.technicians : [],
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
        orders: Array.isArray(data.orders) ? data.orders : [],
        jobs: Array.isArray(data.jobs) ? data.jobs : [],
        skills: Array.isArray(data.skills) ? data.skills : [],
        tlactivity: Array.isArray(data.tlactivity) ? data.tlactivity : [],
        Coverage_Area: Array.isArray(data.Coverage_Area) ? data.Coverage_Area : [],
      }
      setSubc(normalized)
      setTechnicians(normalized.technicians ?? [])
      initForm(normalized)
      setChangedFields(new Set())
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load subcontractor")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user && id) fetchSubc() }, [user, id]) // eslint-disable-line

  // ── Save changes ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!id || !subc) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      const allFields: Record<string, any> = {
        Name: form.Name.trim() || null,
        Organization: form.Organization.trim() || null,
        Organization_Website: form.Organization_Website.trim() || null,
        Address: form.Address.trim() || null,
        Specialty: form.Specialty.trim() || null,
        Status: form.Status || null,
        Score: form.Score !== "" ? parseFloat(form.Score) : null,
        Gqm_compliance: form.Gqm_compliance.trim() || null,
        Gqm_best_service_training: form.Gqm_best_service_training.trim() || null,
        Notes: form.Notes.trim() || null,
        Email_Address: serializeArrayField(form.Email_Address),
        Phone_Number: serializeArrayField(form.Phone_Number),
        Coverage_Area: form.Coverage_Area.length ? form.Coverage_Area : null,
      }
      for (const [k, v] of Object.entries(allFields)) {
        if (!SKIP_ON_PATCH.has(k)) payload[k] = v
      }
      const res = await apiFetch(`/api/subcontractors/${id}?sync_podio=${syncPodio}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? `Error ${res.status}`)
      }
      const updated = await res.json() as SubcFull
      const normalized: SubcFull = {
        ...updated,
        Organization: normalizeOrg(updated.Organization),
        technicians: Array.isArray(updated.technicians) ? (updated.technicians as any[]) : technicians,
        attachments: Array.isArray(updated.attachments) ? updated.attachments : subc.attachments ?? [],
        opportunities: Array.isArray(updated.opportunities) ? updated.opportunities : subc.opportunities ?? [],
        orders: Array.isArray(updated.orders) ? updated.orders : subc.orders ?? [],
        jobs: Array.isArray(updated.jobs) ? updated.jobs : subc.jobs ?? [],
        skills: Array.isArray(updated.skills) ? updated.skills : subc.skills ?? [],
        tlactivity: Array.isArray(updated.tlactivity) ? updated.tlactivity : subc.tlactivity ?? [],
        Coverage_Area: Array.isArray(updated.Coverage_Area) ? updated.Coverage_Area : [],
      }
      setSubc(normalized)
      initForm(normalized)
      setEditing(false)
      setChangedFields(new Set())
      toast({ title: "Saved", description: "Subcontractor updated successfully." })
    } catch (e: any) {
      toast({ title: "Error saving", description: e?.message ?? "Unknown error.", variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleCancel = () => {
    if (subc) initForm(subc)
    setChangedFields(new Set())
    setEditing(false)
  }

  // ── Coverage area helpers ──────────────────────────────────────────────────
  const addCoverageArea = (val?: string) => {
    const v = (val ?? coveragePick).trim()
    if (!v) return
    setField("Coverage_Area", [...new Set([...form.Coverage_Area, v])])
    setCoveragePick("")
  }
  const removeCoverageArea = (val: string) =>
    setField("Coverage_Area", form.Coverage_Area.filter((x) => x !== val))

  // ── Skills helpers ─────────────────────────────────────────────────────────
  const linkedSkillIds = useMemo(() => new Set((subc?.skills ?? []).map((s) => s.ID_Skill)), [subc?.skills])

  const fetchAllSkills = async () => {
    setSkillsLoading(true); setSkillsError(null)
    try {
      const res = await apiFetch("/api/skills", { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setAllSkills(normalizeSkillsResponse(await res.json()))
      setSkillsPage(1)
    } catch (e: any) {
      setSkillsError(e?.message ?? "Failed to load skills")
    } finally { setSkillsLoading(false) }
  }

  const openSkillsModal = async () => {
    setSkillsModalOpen(true)
    if (!allSkills.length) await fetchAllSkills()
  }

  const linkSkill = async (skillId: string) => {
    setLinkingSkillId(skillId)
    try {
      const res = await apiFetch(
        `/api/skills_subcontractors/skills/${encodeURIComponent(skillId)}/subcontractors/${encodeURIComponent(id)}?sync_podio=${skillsSyncPodio}`,
        { method: "POST", cache: "no-store" }
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchSubc()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to link skill.", variant: "destructive" })
    } finally { setLinkingSkillId(null) }
  }

  const unlinkSkill = async (skillId: string) => {
    setUnlinkingSkillId(skillId)
    try {
      const res = await apiFetch(
        `/api/skills_subcontractors/skills/${encodeURIComponent(skillId)}/subcontractors/${encodeURIComponent(id)}?sync_podio=${skillsSyncPodio}`,
        { method: "DELETE", cache: "no-store" }
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchSubc()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to unlink skill.", variant: "destructive" })
    } finally { setUnlinkingSkillId(null) }
  }

  const filteredSkillsDb = useMemo(() => {
    const q = skillsSearch.trim().toLowerCase()
    if (!q) return allSkills
    return allSkills.filter((s) =>
      asStr(s.Skill_name).toLowerCase().includes(q) ||
      asStr(s.Division_trade).toLowerCase().includes(q) ||
      asStr(s.ID_Skill).toLowerCase().includes(q)
    )
  }, [allSkills, skillsSearch])

  const SKILLS_PAGE_SIZE = 12
  const skillsTotalPages = Math.max(1, Math.ceil(filteredSkillsDb.length / SKILLS_PAGE_SIZE))
  const skillsStart = (skillsPage - 1) * SKILLS_PAGE_SIZE
  const paginatedSkillsDb = filteredSkillsDb.slice(skillsStart, skillsStart + SKILLS_PAGE_SIZE)
  useEffect(() => setSkillsPage(1), [skillsSearch])

  // ── Technicians helpers ────────────────────────────────────────────────────
  const filteredTechnicians = useMemo(() => {
    const q = techSearch.trim().toLowerCase()
    return technicians.filter((t) => {
      const ok = !q || asStr(t.Name).toLowerCase().includes(q) ||
        asStr(t.Email_Address).toLowerCase().includes(q) ||
        asStr(t.ID_Technician).toLowerCase().includes(q)
      const typeOk = techTypeFilter === "all" || t.Type_of_technician === techTypeFilter
      return ok && typeOk
    })
  }, [technicians, techSearch, techTypeFilter])

  const techTotalPages = Math.max(1, Math.ceil(filteredTechnicians.length / ITEMS_PER_PAGE))
  const techStart = (techPage - 1) * ITEMS_PER_PAGE
  const paginatedTechnicians = filteredTechnicians.slice(techStart, techStart + ITEMS_PER_PAGE)
  useEffect(() => setTechPage(1), [techSearch, techTypeFilter])

  const leaderTechnician = useMemo(
    () => technicians.find((t) => t.Type_of_technician === "Leader") ?? null,
    [technicians]
  )

  const confirmDeleteTechnician = async () => {
    if (!deleteDialog.technician?.ID_Technician) return
    await apiFetch(`/api/technicians/${deleteDialog.technician.ID_Technician}`, { method: "DELETE", cache: "no-store" }).catch(() => null)
    setTechnicians((p) => p.filter((t) => t.ID_Technician !== deleteDialog.technician?.ID_Technician))
    setDeleteDialog({ open: false, technician: null })
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!user) return null
  
  if (!hasPermission("subcontractor:read")) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6 group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-500 max-w-md mb-8">
              You do not have the required permissions (`subcontractor:read`) to view this subcontractor's details.
              Please contact your administrator if you believe this is an error.
            </p>
            <Button 
              onClick={() => router.push("/subcontractors")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95"
            >
              Return to Subcontractors
            </Button>
          </main>
        </div>
      </div>
    )
  }

  if (loading) return <PageSkeleton user={user} />

  if (!subc) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <button onClick={() => router.push("/subcontractors")}
            className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Subcontractors
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="font-semibold text-red-800">Could not load subcontractor</h2>
            </div>
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
            <Button onClick={fetchSubc} className="mt-4 gap-2" variant="outline">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        </main>
      </div>
    </div>
  )

  const displayEmails = parseArrayField(subc.Email_Address)
  const displayPhones = parseArrayField(subc.Phone_Number)
  const displayOrg = normalizeOrg(subc.Organization)
  const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"
  const changedCls = (field: string) => changedFields.has(field) ? "border-amber-400 ring-1 ring-amber-400/30" : ""

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/subcontractors")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm">
                    {(subc.Name ?? "??").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">{subc.Name ?? "Unnamed"}</h1>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">{subc.ID_Subcontractor}</p>
                  </div>
                </div>
                {subc.Specialty && (
                  <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 md:inline-flex">
                    <Wrench className="h-3 w-3 text-slate-400" />{subc.Specialty}
                  </span>
                )}
                <StatusBadge status={subc.Status} />
                <ScoreBadge score={subc.Score} />
              </div>

              <div className="flex items-center gap-2.5">
                {/* Podio toggle */}
                {hasPermission("subcontractor:update") && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-emerald-200 transition-colors">
                    <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${syncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                      onClick={() => setSyncPodio((v) => !v)}>
                      <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </div>
                    Sync Podio
                  </label>
                )}

                {editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}
                      className="gap-1.5 text-xs border-slate-200">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  hasPermission("subcontractor:update") && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}
                      className="gap-1.5 text-xs border-slate-200">
                      ✎ Edit
                    </Button>
                  )
                )}
              </div>
            </div>

            {syncPodio && (
              <div className="flex items-center gap-2 border-t border-emerald-100 bg-emerald-50 px-6 py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-medium text-emerald-700">Podio sync enabled — changes will be reflected in Podio</p>
              </div>
            )}
          </div>

          <div className="mx-auto max-w-7xl p-6">
            <div className="grid gap-6 lg:grid-cols-3">

              {/* ── LEFT: tabs (2/3) ─────────────────────────────────────── */}
              <div className="lg:col-span-2">
                <Tabs value={activeTab} onValueChange={(v) => router.push(`/subcontractors/${id}?tab=${v}`)}>

                  {/* Tab bar */}
                  <div className="mb-5 overflow-x-auto">
                    <TabsList className="inline-flex h-auto gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                      {[
                        { value: "details", label: "Details", count: null },
                        /* { value: "technicians", label: "Technicians", count: technicians.length }, */
                        { value: "orders", label: "Orders", count: subc.orders?.length ?? 0 },
                        { value: "jobs", label: "Jobs", count: subc.jobs?.length ?? 0 },
                        { value: "skills", label: "Skills", count: subc.skills?.length ?? 0 },
                        { value: "timeline", label: "Timeline", count: subc.tlactivity?.length ?? 0 },
                      ].map(({ value, label, count }) => (
                        <TabsTrigger key={value} value={value}
                          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 transition-colors data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
                          {label}
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

                    {/* Organization */}
                    <SectionCard icon={Building2} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="Organization Information">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <FieldLabel>Organization Name</FieldLabel>
                          {editing
                            ? <Input value={form.Organization} onChange={(e) => setField("Organization", e.target.value)} className={`${inputCls} ${changedCls("Organization")}`} placeholder="Organization name" />
                            : <p className="text-sm text-slate-800">{displayOrg || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div>
                          <FieldLabel>Specialty</FieldLabel>
                          {editing
                            ? <Input value={form.Specialty} onChange={(e) => setField("Specialty", e.target.value)} className={`${inputCls} ${changedCls("Specialty")}`} placeholder="e.g. Plumbing, HVAC…" />
                            : <p className="text-sm text-slate-800">{subc.Specialty || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div>
                          <FieldLabel>Website</FieldLabel>
                          {editing
                            ? <Input value={form.Organization_Website} onChange={(e) => setField("Organization_Website", e.target.value)} className={`${inputCls} ${changedCls("Organization_Website")}`} placeholder="https://…" />
                            : safeUrl(subc.Organization_Website)
                              ? <a href={safeUrl(subc.Organization_Website)!} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline">
                                <Globe className="h-3.5 w-3.5" />{subc.Organization_Website}
                              </a>
                              : <span className="text-sm italic text-slate-400">—</span>
                          }
                        </div>
                        <div>
                          <FieldLabel>Status</FieldLabel>
                          {editing
                            ? <Select value={form.Status || "Active"} onValueChange={(v) => setField("Status", v)}>
                              <SelectTrigger className={`${inputCls} ${changedCls("Status")}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Active", "Inactive", "Pending", "Banned"].map(s =>
                                  <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            : <StatusBadge status={subc.Status} />
                          }
                        </div>
                        <div className="md:col-span-2">
                          <FieldLabel>Address</FieldLabel>
                          {editing
                            ? <Textarea value={form.Address} onChange={(e) => setField("Address", e.target.value)} className={`${inputCls} resize-none ${changedCls("Address")}`} rows={2} placeholder="Full address" />
                            : <p className="flex items-start gap-1.5 text-sm text-slate-800">
                              {subc.Address ? <><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{subc.Address}</> : <span className="italic text-slate-400">—</span>}
                            </p>
                          }
                        </div>
                      </div>
                    </SectionCard>

                    {/* Contact */}
                    <SectionCard icon={Mail} iconBg="bg-blue-50" iconColor="text-blue-600" title="Contact Information">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <FieldLabel>Email Address</FieldLabel>
                          {editing
                            ? <ArrayEditField values={form.Email_Address} icon={Mail} placeholder="email@example.com" onChange={(v) => setField("Email_Address", v)} />
                            : <ArrayDisplayChips values={displayEmails} icon={Mail} href={(e) => `mailto:${e}`} emptyLabel="No email" />
                          }
                        </div>
                        <div>
                          <FieldLabel>Phone Number</FieldLabel>
                          {editing
                            ? <ArrayEditField values={form.Phone_Number} icon={Phone} placeholder="(555) 000-0000" onChange={(v) => setField("Phone_Number", v)} />
                            : <ArrayDisplayChips values={displayPhones} icon={Phone} href={(p) => `tel:${p}`} emptyLabel="No phone" />
                          }
                        </div>
                      </div>
                    </SectionCard>

                    {/* Coverage Area */}
                    <SectionCard icon={Map} iconBg="bg-orange-50" iconColor="text-orange-600" title="Coverage Area">
                      <div className="space-y-3">
                        {editing && (
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <Select value={coveragePick || undefined}
                                onValueChange={(v) => { setCoveragePick(v); addCoverageArea(v) }}>
                                <SelectTrigger className={`pl-9 ${inputCls}`}>
                                  <SelectValue placeholder="Select a county…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COVERAGE_AREA_OPTIONS.map((opt) => (
                                    <SelectItem key={opt} value={opt}
                                      disabled={form.Coverage_Area.some(x => x.toLowerCase() === opt.toLowerCase())}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        {form.Coverage_Area.length ? (
                          <div className="flex flex-wrap gap-2">
                            {form.Coverage_Area.map((area) => (
                              <span key={area} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                                <MapPin className="h-3 w-3 text-slate-400" />{area}
                                {editing && (
                                  <button type="button" onClick={() => removeCoverageArea(area)}
                                    className="ml-0.5 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm italic text-slate-400">No coverage areas added yet</p>
                        )}
                      </div>
                    </SectionCard>

                    {/* GQM */}
                    <SectionCard icon={ShieldCheck} iconBg="bg-violet-50" iconColor="text-violet-600" title="GQM Information">
                      <div className="grid gap-5 md:grid-cols-3">
                        <div>
                          <FieldLabel>Score</FieldLabel>
                          {editing
                            ? <Input type="number" min={0} max={100} value={form.Score} onChange={(e) => setField("Score", e.target.value)} className={`${inputCls} ${changedCls("Score")}`} placeholder="0–100" />
                            : <ScoreBadge score={subc.Score} />
                          }
                        </div>
                        <div>
                          <FieldLabel>GQM Compliance</FieldLabel>
                          {editing
                            ? <Select value={form.Gqm_compliance || "N/A"} onValueChange={(v) => setField("Gqm_compliance", v)}>
                              <SelectTrigger className={`${inputCls} ${changedCls("Gqm_compliance")}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Yes", "No", "N/A"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            : <CertBadge value={subc.Gqm_compliance} />
                          }
                        </div>
                        <div>
                          <FieldLabel>Best Service Training</FieldLabel>
                          {editing
                            ? <Select value={form.Gqm_best_service_training || "N/A"} onValueChange={(v) => setField("Gqm_best_service_training", v)}>
                              <SelectTrigger className={`${inputCls} ${changedCls("Gqm_best_service_training")}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Yes", "No", "N/A"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            : <CertBadge value={subc.Gqm_best_service_training} />
                          }
                        </div>
                        <div className="md:col-span-3">
                          <FieldLabel>Notes</FieldLabel>
                          {editing
                            ? <Textarea value={form.Notes} onChange={(e) => setField("Notes", e.target.value)} className={`${inputCls} resize-none ${changedCls("Notes")}`} rows={3} placeholder="Additional notes…" />
                            : <p className="whitespace-pre-wrap text-sm text-slate-700">{subc.Notes || <span className="italic text-slate-400">No notes</span>}</p>
                          }
                        </div>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* ── TECHNICIANS tab ──────────────────────────────────── */}
                  <TabsContent value="technicians">
                    <SectionCard icon={Wrench} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="Technicians"
                      action={
                        hasPermission("subcontractor:update") && (
                          <Button size="sm" onClick={() => router.push(`/subcontractors/${id}/technicians/create`)}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            <Plus className="h-3.5 w-3.5" /> Add Technician
                          </Button>
                        )
                      }>
                      {/* Search + filter */}
                      <div className="mb-5 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <Input placeholder="Search technicians…" value={techSearch} onChange={(e) => setTechSearch(e.target.value)}
                            className={`pl-9 ${inputCls}`} />
                        </div>
                        <Select value={techTypeFilter} onValueChange={(v: any) => setTechTypeFilter(v)}>
                          <SelectTrigger className={`w-36 ${inputCls}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Leader">Leader</SelectItem>
                            <SelectItem value="Worker">Worker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {paginatedTechnicians.length ? (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {paginatedTechnicians.map((t) => (
                              <TechnicianCard key={t.ID_Technician}
                                technician={{
                                  ID_Technician: t.ID_Technician, Name: t.Name ?? "",
                                  Email: t.Email_Address ?? "", Location: t.Location ?? "",
                                  Phone_number: t.Phone_Number ?? "",
                                  Type: (t.Type_of_technician as any) ?? "Worker",
                                  ID_Subcontractor: t.ID_Subcontractor ?? subc.ID_Subcontractor,
                                } as any}
                                onView={(tid) => router.push(`/subcontractors/${id}/technicians/${tid}`)}
                                onDelete={(tid) => {
                                  if (!hasPermission("subcontractor:update")) {
                                    toast({ title: "Denied", description: "You do not have permission to delete technicians.", variant: "destructive" })
                                    return
                                  }
                                  const tech = technicians.find(x => x.ID_Technician === tid) ?? null
                                  if (tech) setDeleteDialog({ open: true, technician: tech })
                                }}
                              />
                            ))}
                          </div>
                          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                            <p className="text-xs text-slate-500">
                              {filteredTechnicians.length ? techStart + 1 : 0}–{Math.min(techStart + ITEMS_PER_PAGE, filteredTechnicians.length)} of {filteredTechnicians.length}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs border-slate-200"
                                onClick={() => setTechPage(p => Math.max(1, p - 1))} disabled={techPage === 1}>
                                <ChevronLeft className="h-3.5 w-3.5" /> Prev
                              </Button>
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{techPage}/{techTotalPages}</span>
                              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs border-slate-200"
                                onClick={() => setTechPage(p => Math.min(techTotalPages, p + 1))} disabled={techPage >= techTotalPages}>
                                Next <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-12">
                          <Wrench className="h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-500">No technicians found</p>
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* ── SKILLS tab ───────────────────────────────────────── */}
                  <TabsContent value="skills">
                    <SectionCard icon={Wrench} iconBg="bg-amber-50" iconColor="text-amber-600" title="Skills"
                      action={
                        <div className="flex items-center gap-2">
                          {hasPermission("subcontractor:update") && (
                            <>
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-200 transition-colors">
                                <div className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${skillsSyncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                                  onClick={() => setSkillsSyncPodio(v => !v)}>
                                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${skillsSyncPodio ? "translate-x-3" : "translate-x-0.5"}`} />
                                </div>
                                Podio
                              </label>
                              <Button size="sm" onClick={openSkillsModal}
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                                <Plus className="h-3.5 w-3.5" /> Link Skill
                              </Button>
                            </>
                          )}
                        </div>
                      }>
                      {subc.skills?.length ? (
                        <div className="space-y-2">
                          {[...(subc.skills)].sort((a, b) => asStr(a.Skill_name).localeCompare(asStr(b.Skill_name))).map((s) => {
                            const busy = unlinkingSkillId === s.ID_Skill
                            return (
                              <div key={s.ID_Skill} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                      {asStr(s.Division_trade) || "No division"}
                                    </span>
                                    <span className="text-sm font-medium text-slate-800">{asStr(s.Skill_name) || "Unnamed"}</span>
                                  </div>
                                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{s.ID_Skill}</p>
                                </div>
                                {hasPermission("subcontractor:update") && (
                                  <Button variant="outline" size="sm" onClick={() => unlinkSkill(s.ID_Skill)} disabled={busy}
                                    className="gap-1.5 border-slate-200 text-xs text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                                    Unlink
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                          <Wrench className="h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-500">No skills linked yet</p>
                          {hasPermission("subcontractor:update") && (
                            <Button size="sm" onClick={openSkillsModal} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                              <Plus className="h-3.5 w-3.5" /> Link first skill
                            </Button>
                          )}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* ── JOBS tab ─────────────────────────────────────────── */}
                  <TabsContent value="jobs">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800">Jobs</h3>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {subc.jobs?.length ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        {(subc.jobs ?? []).length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-12">
                            <Briefcase className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">No jobs associated with this subcontractor</p>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(subc.jobs ?? []).map((job: any) => {
                              const jobId = job.ID_Jobs ?? ""
                              const typeMap: Record<string, { cls: string; label: string }> = {
                                QID: { cls: "bg-violet-100 text-violet-700 border-violet-200", label: "QID" },
                                WO: { cls: "bg-amber-100  text-amber-700  border-amber-200", label: "WO" },
                                BID: { cls: "bg-cyan-100   text-cyan-700   border-cyan-200", label: "BID" },
                                PAR: { cls: "bg-indigo-100 text-indigo-700 border-indigo-200", label: "PAR" },
                              }
                              const typeBadge = typeMap[job.Job_type ?? ""] ?? { cls: "bg-slate-100 text-slate-600 border-slate-200", label: job.Job_type ?? "—" }

                              const statusMap: Record<string, string> = {
                                PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
                                COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
                                ACTIVE: "bg-blue-100    text-blue-700    border-blue-200",
                                PENDING: "bg-yellow-100  text-yellow-700  border-yellow-200",
                                CANCELLED: "bg-red-100     text-red-600     border-red-200",
                              }
                              const statusCls = statusMap[(job.Job_status ?? "").toUpperCase()] ?? "bg-slate-100 text-slate-500 border-slate-200"

                              const sold = job.Gqm_final_sold_pricing != null ? Number(job.Gqm_final_sold_pricing) : null
                              const formula = job.Gqm_formula_pricing != null ? Number(job.Gqm_formula_pricing) : null
                              const cos = job.Gqm_total_change_orders != null ? Number(job.Gqm_total_change_orders) : null

                              const fmtDate = (raw: string | null) => {
                                if (!raw) return null
                                const d = new Date(raw)
                                return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              }

                              return (
                                <div key={jobId}
                                  className="group flex flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">

                                  {/* Header row */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-800 leading-none">
                                        {job.Project_name ?? job.Job_Description ?? jobId}
                                      </p>
                                      <p className="mt-1 font-mono text-[11px] text-slate-400">{jobId}</p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-1.5">
                                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${typeBadge.cls}`}>
                                        {typeBadge.label}
                                      </span>
                                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}>
                                        {job.Job_status ?? "—"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Meta */}
                                  <div className="space-y-1.5">
                                    {job.Project_location && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                                        <span className="truncate">{job.Project_location}</span>
                                      </div>
                                    )}
                                    {job.Service_type && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Wrench className="h-3 w-3 flex-shrink-0 text-slate-400" />
                                        <span>{job.Service_type}</span>
                                      </div>
                                    )}
                                    {fmtDate(job.Date_assigned) && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Calendar className="h-3 w-3 flex-shrink-0 text-slate-400" />
                                        <span>Assigned {fmtDate(job.Date_assigned)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Pricing row */}
                                  {(sold != null || formula != null || cos != null) && (
                                    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                      {sold != null && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                          <DollarSign className="h-3 w-3" />${sold.toLocaleString()}
                                          <span className="font-normal text-slate-400">sold</span>
                                        </div>
                                      )}
                                      {formula != null && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                                          <DollarSign className="h-3 w-3" />${formula.toLocaleString()}
                                          <span className="font-normal text-slate-400">formula</span>
                                        </div>
                                      )}
                                      {cos != null && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-orange-600">
                                          <Tag className="h-3 w-3" />${cos.toLocaleString()}
                                          <span className="font-normal text-slate-400">COs</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Permit + CTA */}
                                  <div className="flex items-center justify-between">
                                    {job.Permit && job.Permit !== "No" && job.Permit !== "N/A" ? (
                                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                        Permit: {job.Permit}
                                      </span>
                                    ) : <div />}
                                    <button
                                      onClick={() => router.push(`/jobs/${jobId}`)}
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

                  {/* ── ORDERS tab ────────────────────────────────────────── */}
                  <TabsContent value="orders">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                            <ClipboardList className="h-4 w-4 text-amber-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800">Orders</h3>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {subc.orders?.length ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        {(subc.orders ?? []).length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-12">
                            <ClipboardList className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">No orders associated with this subcontractor</p>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(subc.orders ?? []).map((order: any) => {
                              const formula = order.Formula != null ? Number(order.Formula) : null
                              const adjFormula = order.Adj_formula != null ? Number(order.Adj_formula) : null
                              const delta = formula != null && adjFormula != null ? adjFormula - formula : null

                              const techFieldMap: Record<string, string> = {
                                "tech-1-ptl-original-pricing": "PTL Original",
                                "tech-2-ptl-revised-pricing": "PTL Revised",
                                "tech-3-bid-pricing": "BID Pricing",
                                "tech-4-wo-pricing": "WO Pricing",
                              }
                              const techLabel = techFieldMap[order.tech_field ?? ""] ?? order.tech_field ?? null

                              return (
                                <div key={order.ID_Order}
                                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">

                                  {/* Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-800 leading-none">
                                        {order.Title ?? "Untitled Order"}
                                      </p>
                                      <p className="mt-1 font-mono text-[11px] text-slate-400">{order.ID_Order}</p>
                                    </div>
                                    {techLabel && (
                                      <span className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                        {techLabel}
                                      </span>
                                    )}
                                  </div>

                                  {/* Pricing grid */}
                                  <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-lg border border-slate-100 bg-slate-50">
                                    <div className="px-3 py-2.5">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Formula</p>
                                      <p className="mt-0.5 text-sm font-bold text-slate-800">
                                        {formula != null ? `$${formula.toLocaleString()}` : <span className="italic text-slate-400">—</span>}
                                      </p>
                                    </div>
                                    <div className="px-3 py-2.5">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Adj. Formula</p>
                                      <p className="mt-0.5 text-sm font-bold text-emerald-700">
                                        {adjFormula != null ? `$${adjFormula.toLocaleString()}` : <span className="italic text-slate-400">—</span>}
                                      </p>
                                    </div>
                                    <div className="px-3 py-2.5">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Delta</p>
                                      {delta != null ? (
                                        <p className={`mt-0.5 text-sm font-bold ${delta > 0 ? "text-orange-600" : delta < 0 ? "text-red-600" : "text-slate-500"}`}>
                                          {delta > 0 ? "+" : ""}{delta.toLocaleString()}
                                        </p>
                                      ) : <span className="mt-0.5 text-sm italic text-slate-400">—</span>}
                                    </div>
                                  </div>

                                  {/* Extra info */}
                                  <div className="space-y-1.5">
                                    {order.Ptl_hd_materials != null && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-medium">HD Materials</span>
                                        <span className="font-semibold text-slate-700">${Number(order.Ptl_hd_materials).toLocaleString()}</span>
                                      </div>
                                    )}
                                    {order.job_podio_id && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-medium">Job Podio ID</span>
                                        <span className="font-mono text-slate-500">{order.job_podio_id}</span>
                                      </div>
                                    )}
                                    {order.Notes && (
                                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notes</p>
                                        <p className="mt-0.5 text-xs text-slate-600">{order.Notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── TIMELINE tab ─────────────────────────────────────── */}
                  <TabsContent value="timeline">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                          <Clock className="h-4 w-4 text-slate-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800">Timeline</h3>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                          <Sparkles className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Coming Soon</p>
                          <p className="mt-1 max-w-xs text-xs text-slate-400">
                            The activity timeline will be available in a future update. It will display all actions and changes related to this subcontractor.
                          </p>
                        </div>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600">
                          In development
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                </Tabs>
              </div>

              {/* ── RIGHT: sidebar (1/3) ────────────────────────────────── */}
              <div className="space-y-4">

                {/* Leader card */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Team Leader</p>
                  </div>
                  <div className="p-5">
                    {leaderTechnician ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xs font-black text-white">
                            {(asStr(leaderTechnician.Name)).split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase() || "LT"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{leaderTechnician.Name ?? "—"}</p>
                            <p className="font-mono text-[11px] text-slate-400">{leaderTechnician.ID_Technician}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-slate-600">
                          {[
                            { label: "Phone", value: leaderTechnician.Phone_Number },
                            { label: "Location", value: leaderTechnician.Location },
                            { label: "Email", value: leaderTechnician.Email_Address },
                            { label: "Type", value: leaderTechnician.Type_of_technician },
                          ].map(({ label, value }) => value ? (
                            <div key={label} className="flex items-start gap-1.5">
                              <span className="w-14 flex-shrink-0 font-semibold text-slate-400">{label}</span>
                              <span className="text-slate-700 break-all">{value}</span>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm italic text-slate-400">No leader assigned</p>
                    )}
                  </div>
                </div>

                {/* Quick Summary */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quick Summary</p>
                  </div>
                  <div className="divide-y divide-slate-50 px-5">
                    {[
                      { label: "ID", value: <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">{subc.ID_Subcontractor}</span> },
                      { label: "Status", value: <StatusBadge status={subc.Status} /> },
                      { label: "Score", value: <ScoreBadge score={subc.Score} /> },
                      { label: "Compliance", value: <CertBadge value={subc.Gqm_compliance} /> },
                      { label: "BST", value: <CertBadge value={subc.Gqm_best_service_training} /> },
                      { label: "Technicians", value: <span className="text-sm font-semibold text-slate-800">{technicians.length}</span> },
                      { label: "Skills", value: <span className="text-sm font-semibold text-slate-800">{subc.skills?.length ?? 0}</span> },
                      { label: "Orders", value: <span className="text-sm font-semibold text-slate-800">{subc.orders?.length ?? 0}</span> },
                      { label: "Jobs", value: <span className="text-sm font-semibold text-slate-800">{subc.jobs?.length ?? 0}</span> },
                      { label: "Attachments", value: <span className="text-sm font-semibold text-slate-800">{subc.attachments?.length ?? 0}</span> },
                      { label: "Opportunities", value: <span className="text-sm font-semibold text-slate-800">{subc.opportunities?.length ?? 0}</span> },
                      {
                        label: "Podio", value: subc.podio_item_id
                          ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            <CheckCircle className="h-3 w-3" /> Linked
                          </span>
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

                {/* Coverage area summary */}
                {(subc.Coverage_Area ?? []).length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Coverage Areas</p>
                    </div>
                    <div className="flex flex-wrap gap-2 p-5">
                      {(subc.Coverage_Area ?? []).map((area) => (
                        <span key={area} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          <MapPin className="h-2.5 w-2.5 text-slate-400" />{area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Skills modal ───────────────────────────────────────────────────── */}
      <Dialog open={skillsModalOpen} onOpenChange={setSkillsModalOpen}>
        <DialogContent className="flex h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0">

          {/* ── Header fijo ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-b border-slate-100 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Link2 className="h-4 w-4 text-emerald-600" /> Link a Skill
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-slate-500">
              Search and link skills. Already linked ones are marked as Linked.
            </DialogDescription>

            {/* Search + refresh — parte del header para que nunca se oculten */}
            <div className="mt-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={skillsSearch}
                  onChange={(e) => setSkillsSearch(e.target.value)}
                  placeholder="Search by name, division, or ID…"
                  className={`pl-9 ${inputCls}`}
                />
              </div>
              <Button
                variant="outline" size="sm"
                onClick={fetchAllSkills} disabled={skillsLoading}
                className="flex-shrink-0 gap-1.5 text-xs border-slate-200"
              >
                {skillsLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5" />
                }
                Refresh
              </Button>
            </div>

            {skillsError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600">
                {skillsError}
              </div>
            )}
          </div>

          {/* ── Tabla scrolleable ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-32">ID</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Skill Name</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-44">Division / Trade</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skillsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-sm italic text-slate-400">
                      Loading skills…
                    </TableCell>
                  </TableRow>
                ) : paginatedSkillsDb.length ? (
                  paginatedSkillsDb.map((s) => {
                    const already = linkedSkillIds.has(s.ID_Skill)
                    const busy = linkingSkillId === s.ID_Skill
                    return (
                      <TableRow key={s.ID_Skill} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs text-slate-500">{s.ID_Skill}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-800">{asStr(s.Skill_name) || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{asStr(s.Division_trade) || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => linkSkill(s.ID_Skill)}
                            disabled={already || busy}
                            variant={already ? "outline" : "default"}
                            className={`gap-1.5 text-xs ${!already ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                          >
                            {busy
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Link2 className="h-3.5 w-3.5" />
                            }
                            {already ? "Linked" : "Link"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-sm italic text-slate-400">
                      No skills found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Footer fijo: paginación + Close ─────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
            <p className="text-xs text-slate-500">
              {filteredSkillsDb.length
                ? `${skillsStart + 1}–${Math.min(skillsStart + SKILLS_PAGE_SIZE, filteredSkillsDb.length)} of ${filteredSkillsDb.length} skills`
                : "No results"
              }
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                className="h-7 gap-1 text-xs border-slate-200"
                onClick={() => setSkillsPage((p) => Math.max(1, p - 1))}
                disabled={skillsPage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {skillsPage}/{skillsTotalPages}
              </span>
              <Button
                variant="outline" size="sm"
                className="h-7 gap-1 text-xs border-slate-200"
                onClick={() => setSkillsPage((p) => Math.min(skillsTotalPages, p + 1))}
                disabled={skillsPage >= skillsTotalPages}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <div className="ml-2 h-4 w-px bg-slate-200" />
              <Button
                variant="outline" size="sm"
                onClick={() => setSkillsModalOpen(false)}
                className="text-xs border-slate-200"
              >
                Close
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* ── Delete technician dialog ──────────────────────────────────────── */}
      <DeleteTechnicianDialog
        open={deleteDialog.open}
        onOpenChange={(o) => !o && setDeleteDialog({ open: false, technician: null })}
        technicianName={deleteDialog.technician?.Name || ""}
        onConfirm={confirmDeleteTechnician}
      />
    </div>
  )
}