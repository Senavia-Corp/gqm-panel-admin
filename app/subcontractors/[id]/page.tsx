"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { UserAvatar } from "@/components/atoms/UserAvatar"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { isPortalRole, roleSlugFromCookie, uidFromCookie, type RoleSlug } from "@/lib/role-map"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubcontractorTimelineTab } from "@/components/organisms/subcontractor-detail/tabs/SubcontractorTimelineTab"
import { SubcontractorCertificatesTab } from "@/components/organisms/subcontractor-detail/tabs/SubcontractorCertificatesTab"
import { TechnicianCard } from "@/components/organisms/TechnicianCard"
import { DeleteTechnicianDialog } from "@/components/organisms/DeleteTechnicianDialog"
import { CreateTaskDialog } from "@/components/organisms/CreateTaskDialog"
import { TaskDetailsDialog } from "@/components/organisms/TaskDetailsDialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import {
  ArrowLeft, Save, Search, Plus, ChevronLeft, ChevronRight,
  Wrench, Link2, Unlink, Loader2, MapPin, Map, X, Mail, Phone,
  Building2, Globe, Star, ShieldCheck, FileText, CheckCircle,
  AlertCircle, RefreshCw, Hash, Briefcase, ClipboardList, Calendar,
  DollarSign, Tag, ExternalLink, Clock, Sparkles, ShoppingBag, Activity,
  Zap, Edit3, Info, Users, Award
} from "lucide-react"
import type { Subcontractor } from "@/lib/types"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
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
  ID_Role?: string | null
  technicians?: SubcTechnician[]
  tasks?: any[]
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
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className={`flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${iconBg}`}>
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${iconColor}`} />
          </div>
          <h3 className="truncate text-sm font-semibold text-slate-800 leading-tight">{title}</h3>
        </div>
        {action && <div className="ml-2 flex-shrink-0">{action}</div>}
      </div>
      <div className="p-3 sm:p-6">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>
}

function StatusBadge({ status }: { status?: string | null }) {
  const t = useTranslations("subcontractors")
  if (!status) return <span className="text-xs italic text-slate-400">{t("noStatus")}</span>
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-100 text-slate-500 border-slate-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  }
  const cls = map[status.toLowerCase()] ?? "bg-blue-100 text-blue-700 border-blue-200"
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{t(status.toLowerCase())}</span>
}

function ScoreBadge({ score }: { score?: number | null }) {
  const t = useTranslations("subcontractors")
  if (score == null) return <span className="text-xs italic text-slate-400">{t("noScore")}</span>
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
  const t = useTranslations("subcontractors")
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
        <Plus className="h-3 w-3" /> {t("addAnother")}
      </button>
    </div>
  )
}

function ArrayDisplayChips({ values, icon: Icon, href, emptyLabel }: {
  values: string[]; icon: React.ElementType
  href?: (v: string) => string; emptyLabel: string
}) {
  const t = useTranslations("subcontractors")
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
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ id: string }>()
  const id = params.id as string
  const activeTab = searchParams.get("tab") || "details"

  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)
  // Rol e id de la SESIÓN (cookies gqm_role/gqm_uid): es el vocabulario que
  // evalúa el middleware. `localStorage.user_data.role` se reescribe desde
  // devtools y su valor LEAD_TECHNICIAN ni siquiera existe en el backend (D6).
  const [roleSlug, setRoleSlug] = useState<RoleSlug | null>(null)
  const [sessionUid, setSessionUid] = useState<string | null>(null)
  const isPortal = isPortalRole(roleSlug)

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
    ID_Role: "",
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

  const confirmDeleteTechnician = async () => {
    if (!deleteDialog.technician) return
    const tid = deleteDialog.technician.ID_Technician
    try {
      const res = await apiFetch(`/api/technician/${tid}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete technician")
      setTechnicians(prev => prev.filter(t => t.ID_Technician !== tid))
      toast({ title: "Deleted", description: `Technician ${tid} removed.` })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setDeleteDialog({ open: false, technician: null })
    }
  }

  // ── Skills state ───────────────────────────────────────────────────────────
  const [skillsSyncPodio, setSkillsSyncPodio] = useState(true)
  const [skillsModalOpen, setSkillsModalOpen] = useState(false)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [skillsSearch, setSkillsSearch] = useState("")
  const [skillsPage, setSkillsPage] = useState(1)
  const [ordersSearch, setOrdersSearch] = useState("")
  const [ordersPayFilter, setOrdersPayFilter] = useState<"all" | "paid" | "pending" | "unlinked">("all")
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<any | null>(null)
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false)
  const [subcTaskSearch, setSubcTaskSearch] = useState("")
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | "Not started" | "Work-in-progress" | "Completed">("all")
  const [linkingSkillId, setLinkingSkillId] = useState<string | null>(null)
  const [unlinkingSkillId, setUnlinkingSkillId] = useState<string | null>(null)
  const [roles, setRoles] = useState<any[]>([])

  useEffect(() => {
    // U-17: mismo defecto que U-06 arregló en el diálogo de tarea. Esta es la
    // pantalla de ATERRIZAJE del subcontratista, y pedía el catálogo de roles
    // en cada carga: medido con sub-dev en /subcontractors/SUBC60001,
    // `GET /api/roles?limit=100` responde 403 y el `if (res.ok)` lo deja pasar
    // en silencio. Ni lo necesita —los roles sólo se pintan en la parte de
    // administración— ni le toca leer el catálogo de roles del sistema.
    if (isPortal) return
    async function fetchRoles() {
      try {
        const res = await apiFetch("/api/roles?limit=100")
        if (res.ok) {
          const data = await res.json()
          setRoles(data.results || [])
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchRoles()
  }, [isPortal])

  // ── Manage Skills state ────────────────────────────────────────────────────
  const [manageSkillsOpen, setManageSkillsOpen] = useState(false)
  const [createSkillName, setCreateSkillName] = useState("")
  const [createSkillLoading, setCreateSkillLoading] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editSkillName, setEditSkillName] = useState("")
  const [editSkillLoading, setEditSkillLoading] = useState(false)
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null)
  const [deleteSkillLoading, setDeleteSkillLoading] = useState(false)

  // ── Coverage picker ────────────────────────────────────────────────────────
  const [coveragePick, setCoveragePick] = useState<string>("")

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setRoleSlug(roleSlugFromCookie())
    setSessionUid(uidFromCookie())
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
    ID_Role: s.ID_Role ?? s.role?.ID_Role ?? "",
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
      setLoadError(e?.message ?? t("loadError"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && id) {
      // U-03 · Pertenencia. La única guarda que había estaba escrita para
      // LEAD_TECHNICIAN, un rol que el backend NO emite (cero coincidencias en
      // todo gqm-api): no protegía a nadie, y `/subcontractors/<ajeno>` pintaba
      // la ficha del otro sub. Se escribe contra el rol real de la sesión.
      // El middleware ya rebota este caso y la API responderá 404 tras P-05;
      // esta comprobación es la tercera capa, no la única.
      if (roleSlug === "subcontractor") {
        if (sessionUid && String(sessionUid) !== String(id)) {
          router.replace(`/subcontractors/${sessionUid}`)
        } else {
          fetchSubc()
        }
        return
      }
      const isTech = user.role === "LEAD_TECHNICIAN"
      if (isTech) {
        apiFetch(`/api/technician/${user.id}`)
          .then(res => res.ok ? res.json() : Promise.reject("Failed to verify access"))
          .then(data => {
            const mySubId = data?.subcontractor?.ID_Subcontractor
            if (mySubId && String(mySubId) !== String(id)) {
              router.replace(`/subcontractors/${mySubId}`)
            } else {
              fetchSubc()
            }
          })
          .catch(err => {
            setLoadError(err.message || "Access denied")
            setLoading(false)
          })
      } else {
        fetchSubc()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id, roleSlug, sessionUid])

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
        ID_Role: form.ID_Role || null,
      }
      for (const [k, v] of Object.entries(allFields)) {
        if (!SKIP_ON_PATCH.has(k) && changedFields.has(k)) payload[k] = v
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
      toast({ title: t("toastSaved"), description: t("toastSavedDesc") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message ?? "Unknown error.", variant: "destructive" })
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

  const openManageSkills = async () => {
    setManageSkillsOpen(true)
    if (!allSkills.length) await fetchAllSkills()
  }

  const createSkill = async () => {
    const name = createSkillName.trim()
    if (!name) return
    setCreateSkillLoading(true)
    try {
      const res = await apiFetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Skill_name: name, Division_trade: name }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setCreateSkillName("")
      await fetchAllSkills()
      toast({ title: t("skillCreated"), description: t("skillCreatedDesc") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message ?? "Failed to create skill.", variant: "destructive" })
    } finally { setCreateSkillLoading(false) }
  }

  const saveSkill = async (skillId: string) => {
    const name = editSkillName.trim()
    if (!name) return
    setEditSkillLoading(true)
    try {
      const res = await apiFetch(`/api/skills/${encodeURIComponent(skillId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Skill_name: name, Division_trade: name }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setEditingSkillId(null)
      await fetchAllSkills()
      toast({ title: t("skillUpdated"), description: t("skillUpdatedDesc") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message ?? "Failed to update skill.", variant: "destructive" })
    } finally { setEditSkillLoading(false) }
  }

  const deleteSkill = async (skillId: string) => {
    setDeleteSkillLoading(true)
    try {
      const res = await apiFetch(`/api/skills/${encodeURIComponent(skillId)}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setDeleteSkillId(null)
      await fetchAllSkills()
      await fetchSubc()
      toast({ title: t("skillDeleted"), description: t("skillDeletedDesc") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message ?? "Failed to delete skill.", variant: "destructive" })
    } finally { setDeleteSkillLoading(false) }
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

  const subcDashboard = useMemo(() => {
    if (!subc) return null

    const COMPLETED_STATUSES = new Set([
      "Completed P. INV / POs", "Completed PVI / POs", "Completed PVI",
      "Invoiced", "Paid", "PAID",
    ])
    const IN_PROGRESS_STATUSES = new Set([
      "Scheduled / Work in Progress", "Assigned-In progress", "In Progress",
    ])

    const jobs: any[] = subc.jobs ?? []
    const orders: any[] = subc.orders ?? []

    let completedCount = 0, inProgressCount = 0, otherCount = 0
    for (const j of jobs) {
      const s = j.Job_status ?? ""
      if (COMPLETED_STATUSES.has(s)) completedCount++
      else if (IN_PROGRESS_STATUSES.has(s)) inProgressCount++
      else otherCount++
    }

    let pendingTasksCount = 0, totalTasksCount = 0
    for (const tech of technicians) {
      for (const task of ((tech as any).tasks ?? [])) {
        totalTasksCount++
        if (task.Task_status !== "Completed") pendingTasksCount++
      }
    }

    const jobPaymentMap: Record<string, { allPaid: boolean; hasPending: boolean }> = {}
    let unlinkedOrdersCount = 0
    for (const order of orders) {
      const bills = ((order.financial_docs ?? []) as any[]).filter(
        (d) => d.Type_of_document === "Bill" && !d.is_voided
      )
      const jobIds: string[] = [
        ...new Set(((order.estimate_costs ?? []) as any[]).map((ec) => ec.ID_Jobs).filter(Boolean)),
      ] as string[]

      if (bills.length === 0) { unlinkedOrdersCount++; continue }

      const allPaid = bills.every((b: any) => (b.Percentage_Paid ?? 0) >= 100)
      const hasPending = bills.some((b: any) => (b.Percentage_Paid ?? 0) < 100)

      for (const jid of jobIds) {
        if (!jobPaymentMap[jid]) jobPaymentMap[jid] = { allPaid: true, hasPending: false }
        if (!allPaid) jobPaymentMap[jid].allPaid = false
        if (hasPending) jobPaymentMap[jid].hasPending = true
      }
    }

    let settledJobsCount = 0, pendingPaymentJobsCount = 0
    for (const v of Object.values(jobPaymentMap)) {
      if (v.hasPending) pendingPaymentJobsCount++
      else if (v.allPaid) settledJobsCount++
    }

    return {
      jobs: { completed: completedCount, inProgress: inProgressCount, other: otherCount },
      tasks: { pending: pendingTasksCount, total: totalTasksCount },
      payments: { settled: settledJobsCount, pending: pendingPaymentJobsCount, unlinked: unlinkedOrdersCount },
    }
  }, [subc, technicians])

  // ── Subcontractor tasks (direct + via technicians, deduplicated) ──────────
  const allSubcTasks = useMemo(() => {
    const seen = new Set<string>()
    const result: any[] = []

    // 1. Direct tasks (ID_Subcontractor set, any ID_Technician value)
    for (const task of (subc?.tasks ?? [])) {
      if (!seen.has(task.ID_Tasks)) {
        seen.add(task.ID_Tasks)
        const tech = technicians.find((t) => t.ID_Technician === task.ID_Technician)
        result.push({
          ...task,
          _techName: tech?.Name ?? task.ID_Technician ?? null,
          _techId:   task.ID_Technician ?? null,
        })
      }
    }

    // 2. Tasks from technicians (catches any not already included above)
    for (const tech of technicians) {
      for (const task of (tech.tasks ?? [])) {
        if (!seen.has(task.ID_Tasks)) {
          seen.add(task.ID_Tasks)
          result.push({
            ...task,
            _techName: tech.Name ?? tech.ID_Technician,
            _techId:   tech.ID_Technician,
          })
        }
      }
    }

    return result
  }, [subc, technicians])

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
              {t("backToSubs")}
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
            <ArrowLeft className="h-4 w-4" /> {t("backToSubs")}
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="font-semibold text-red-800">{t("loadError")}</h2>
            </div>
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
            <Button onClick={fetchSubc} className="mt-4 gap-2" variant="outline">
              <RefreshCw className="h-4 w-4" /> {t("retry")}
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="px-4 pt-3 pb-0 sm:px-6 sm:pt-4">

              {/* Breadcrumb */}
              <div className="mb-2 hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                <button onClick={() => router.push("/subcontractors")} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />{t("backToSubs")}
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>{t("subcDetail")}</span>
              </div>

              {/* Title + Actions */}
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 pb-3">
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{displayOrg || subc.Name || subc.ID_Subcontractor}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{subc.ID_Subcontractor}</span>
                    <StatusBadge status={subc.Status} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* U-04 · Sincronizar con Podio no es una acción de portal:
                      el interruptor solo se ofrece a roles internos. */}
                  {!isPortal && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 sm:px-3">
                    <div className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${syncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                      onClick={() => setSyncPodio(v => !v)}>
                      <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="hidden sm:inline">{t("syncPodio")}</span>
                  </label>
                  )}

                  {hasPermission("subcontractor:update") && (
                    !editing
                      ? <Button variant="outline" size="sm" onClick={() => setEditing(true)}
                          className="h-8 gap-1.5 text-xs border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
                          <Edit3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("edit")}</span>
                        </Button>
                      : <>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                            onClick={handleCancel}>
                            <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("cancel")}</span>
                          </Button>
                          {changedFields.size > 0 && (
                            <Button size="sm" disabled={saving} onClick={handleSave}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs text-white">
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">{saving ? t("saving") : t("save")}</span>
                            </Button>
                          )}
                        </>
                  )}
                </div>
              </div>
            </div>

            {/* Tab bar — underline style */}
            <div className="flex overflow-x-auto">
              {[
                { value: "details",      label: t("tabDetails"),      icon: FileText   },
                { value: "certificates", label: t("tabCertificates"), icon: Award      },
                { value: "technicians",  label: t("tabTechnicians"),  icon: Users,     count: technicians.length },
                { value: "orders",       label: t("purchaseOrders"),  icon: ShoppingBag, count: subc.orders?.length ?? 0 },
                { value: "jobs",         label: t("tabJobs"),         icon: Briefcase, count: subc.jobs?.length ?? 0 },
                { value: "tasks",        label: t("tabTasks"),        icon: ClipboardList, count: allSubcTasks.length },
                { value: "skills",       label: t("tabSkills"),       icon: Wrench,    count: subc.skills?.length ?? 0 },
                { value: "timeline",     label: t("tabTimeline"),     icon: Activity,  count: subc.tlactivity?.length ?? 0 },
              ].map(({ value, label, icon: Icon, count }) => {
                const on = activeTab === value
                return (
                  <button key={value}
                    onClick={() => router.push(`/subcontractors/${id}?tab=${value}`)}
                    className={cn(
                      "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors sm:gap-2 sm:px-5 sm:py-3 sm:text-sm",
                      on
                        ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600"
                        : "text-slate-500 hover:text-slate-700"
                    )}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                    {count !== undefined && (
                      <span className={cn("ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                        on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Tabs value={activeTab} onValueChange={(v) => router.push(`/subcontractors/${id}?tab=${v}`)}>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* ── LEFT: tabs (2/3) ─────────────────────────────────────── */}
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <TabsContent value="details" className="mt-0 w-full space-y-6">

                    {/* Organization */}
                    <SectionCard icon={Building2} iconBg="bg-emerald-50" iconColor="text-emerald-600" title={t("orgInfo")}>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <FieldLabel>{t("organization")}</FieldLabel>
                          {editing
                            ? <Input value={form.Organization} onChange={(e) => setField("Organization", e.target.value)} className={`${inputCls} ${changedCls("Organization")}`} placeholder={t("orgName")} />
                            : <p className="text-sm text-slate-800">{displayOrg || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div>
                          <FieldLabel>{t("specialty")}</FieldLabel>
                          {editing
                            ? <Input value={form.Specialty} onChange={(e) => setField("Specialty", e.target.value)} className={`${inputCls} ${changedCls("Specialty")}`} placeholder="e.g. Plumbing, HVAC…" />
                            : <p className="text-sm text-slate-800">{subc.Specialty || <span className="italic text-slate-400">—</span>}</p>
                          }
                        </div>
                        <div>
                          <FieldLabel>{t("website")}</FieldLabel>
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
                          <FieldLabel>{t("status")}</FieldLabel>
                          {editing
                            ? <Select value={form.Status || "Active"} onValueChange={(v) => setField("Status", v)}>
                              <SelectTrigger className={`${inputCls} ${changedCls("Status")}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Active", "Inactive", "Pending", "Banned"].map(s =>
                                  <SelectItem key={s} value={s}>{t(s.toLowerCase() as any)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            : <StatusBadge status={subc.Status} />
                          }
                        </div>
                        <div className="md:col-span-2">
                          <FieldLabel>{t("address")}</FieldLabel>
                          {editing
                            ? <Textarea value={form.Address} onChange={(e) => setField("Address", e.target.value)} className={`${inputCls} resize-none ${changedCls("Address")}`} rows={2} placeholder={t("address")} />
                            : <p className="flex items-start gap-1.5 text-sm text-slate-800">
                              {subc.Address ? <><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{subc.Address}</> : <span className="italic text-slate-400">—</span>}
                            </p>
                          }
                        </div>
                      </div>
                    </SectionCard>

                    {/* Contact */}
                    <SectionCard icon={Mail} iconBg="bg-blue-50" iconColor="text-blue-600" title={t("contactInfo")}>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <FieldLabel>{t("email")}</FieldLabel>
                          {editing
                            ? <ArrayEditField values={form.Email_Address} icon={Mail} placeholder="email@example.com" onChange={(v) => setField("Email_Address", v)} />
                            : <ArrayDisplayChips values={displayEmails} icon={Mail} href={(e) => `mailto:${e}`} emptyLabel={t("noEmail")} />
                          }
                        </div>
                        <div>
                          <FieldLabel>{t("phone")}</FieldLabel>
                          {editing
                            ? <ArrayEditField values={form.Phone_Number} icon={Phone} placeholder="(555) 000-0000" onChange={(v) => setField("Phone_Number", v)} />
                            : <ArrayDisplayChips values={displayPhones} icon={Phone} href={(p) => `tel:${p}`} emptyLabel={t("noPhone")} />
                          }
                        </div>
                      </div>
                    </SectionCard>

                    {/* Coverage Area */}
                    <SectionCard icon={Map} iconBg="bg-orange-50" iconColor="text-orange-600" title={t("coverageArea")}>
                      <div className="space-y-3">
                        {editing && (
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <Select value={coveragePick || undefined}
                                onValueChange={(v) => { setCoveragePick(v); addCoverageArea(v) }}>
                                <SelectTrigger className={`pl-9 ${inputCls}`}>
                                  <SelectValue placeholder={t("selectCounty")} />
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
                          <p className="text-sm italic text-slate-400">{t("noCoverageAreas")}</p>
                        )}
                      </div>
                    </SectionCard>

                    {/* GQM */}
                    <SectionCard icon={ShieldCheck} iconBg="bg-violet-50" iconColor="text-violet-600" title={t("certsCompliance")}>
                      <div className="grid gap-5 md:grid-cols-3">
                        <div>
                          <FieldLabel>{t("score")}</FieldLabel>
                          {editing
                            ? <Input type="number" min={0} max={100} value={form.Score} onChange={(e) => setField("Score", e.target.value)} className={`${inputCls} ${changedCls("Score")}`} placeholder="0–100" />
                            : <ScoreBadge score={subc.Score} />
                          }
                        </div>
                        <div>
                          <FieldLabel>{t("gqmCompliance")}</FieldLabel>
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
                          <FieldLabel>{t("gqmTraining")}</FieldLabel>
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
                          <FieldLabel>{t("notes")}</FieldLabel>
                          {editing
                            ? <Textarea value={form.Notes} onChange={(e) => setField("Notes", e.target.value)} className={`${inputCls} resize-none ${changedCls("Notes")}`} rows={3} placeholder={t("notesPlaceholder")} />
                            : <p className="whitespace-pre-wrap text-sm text-slate-700">{subc.Notes || <span className="italic text-slate-400">No notes</span>}</p>
                          }
                        </div>
                      </div>
                    </SectionCard>

                    {/* ── Roles / Permissions ── */}
                    <SectionCard icon={ShieldCheck} iconBg="bg-blue-50" iconColor="text-blue-600" title={t("permissions", { defaultValue: "Permissions & Roles" })}>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <FieldLabel>{t("role", { defaultValue: "Assigned Role" })}</FieldLabel>
                          {editing
                            ? <Select value={form.ID_Role || ""} onValueChange={(v) => setField("ID_Role", v)}>
                                <SelectTrigger className={`${inputCls} ${changedCls("ID_Role")}`}>
                                  <SelectValue placeholder={t("noRole", { defaultValue: "-- Select a role --" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((r: any) => (
                                    <SelectItem key={r.ID_Role} value={r.ID_Role}>{r.Name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            : <p className="text-sm text-slate-700">{subc.role?.Name || <span className="italic text-slate-400">{t("noRole", { defaultValue: "-- Select a role --" })}</span>}</p>
                          }
                        </div>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* ── CERTIFICATES tab ─────────────────────────────────── */}
                  <TabsContent value="certificates" className="mt-0 w-full">
                    <SubcontractorCertificatesTab
                      subcId={id}
                      subcName={subc.Organization || subc.Name || id}
                    />
                  </TabsContent>

                  {/* ── TECHNICIANS tab ──────────────────────────────────── */}
                  <TabsContent value="technicians">
                    <SectionCard icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-600" title={t("tabTechnicians")}
                      action={
                        hasPermission("subcontractor:update") && (
                          <Button size="sm" onClick={() => router.push(`/technicians/create?subcontractorId=${id}`)}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            <Plus className="h-3.5 w-3.5" /> {t("addTechnician")}
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
                            <SelectItem value="all">{t("allTypes")}</SelectItem>
                            <SelectItem value="Leader">{t("leader")}</SelectItem>
                            <SelectItem value="Worker">{t("worker")}</SelectItem>
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
                                onView={(tid) => router.push(`/technicians/${tid}`)}
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
                                <ChevronLeft className="h-3.5 w-3.5" /> {t("prev")}
                              </Button>
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{techPage}/{techTotalPages}</span>
                              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs border-slate-200"
                                onClick={() => setTechPage(p => Math.min(techTotalPages, p + 1))} disabled={techPage >= techTotalPages}>
                                {t("next")} <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-12">
                          <Wrench className="h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-500">{t("noTechniciansFound")}</p>
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* ── TASKS tab ────────────────────────────────────────── */}
                  <TabsContent value="tasks">
                    {(() => {
                      const STATUS_STYLE: Record<string, string> = {
                        "Not started":      "text-slate-500 bg-slate-100 border-slate-200",
                        "Work-in-progress": "text-amber-700 bg-amber-50 border-amber-200",
                        "Completed":        "text-emerald-700 bg-emerald-50 border-emerald-200",
                      }
                      const STATUS_LABEL: Record<string, string> = {
                        "Not started":      "Not Started",
                        "Work-in-progress": "In Progress",
                        "Completed":        "Completed",
                      }
                      const PRIORITY_STYLE: Record<string, string> = {
                        High:   "text-red-600 bg-red-50 border-red-200",
                        Medium: "text-amber-600 bg-amber-50 border-amber-200",
                        Low:    "text-blue-600 bg-blue-50 border-blue-200",
                      }
                      const checkOverdue = (delivery: any, status: any) => {
                        if (!delivery || status === "Completed") return false
                        const d = new Date(delivery)
                        return !isNaN(d.getTime()) && d < new Date()
                      }
                      const fmtDate = (raw: any) => {
                        if (!raw) return null
                        const d = new Date(raw)
                        return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      }

                      // Derived job data for dialogs (shapes subc as the single linked subcontractor)
                      const subcJobData = {
                        subcontractors: [{
                          ID_Subcontractor: subc.ID_Subcontractor,
                          Name:             subc.Name,
                          Organization:     subc.Organization,
                          technicians:      technicians.map((tech) => ({
                            ID_Technician: tech.ID_Technician,
                            Name:          tech.Name,
                          })),
                        }],
                      }
                      const subcTechList = technicians.map((tech) => ({
                        id:   tech.ID_Technician,
                        name: tech.Name ?? tech.ID_Technician,
                        type: tech.Type_of_technician ?? "",
                      }))

                      // Filter + search
                      const tq = subcTaskSearch.trim().toLowerCase()
                      const filteredTasks = allSubcTasks.filter((task) => {
                        if (taskStatusFilter !== "all" && task.Task_status !== taskStatusFilter) return false
                        if (!tq) return true
                        return (
                          (task.Name ?? "").toLowerCase().includes(tq) ||
                          (task.Task_description ?? "").toLowerCase().includes(tq) ||
                          (task._techName ?? "").toLowerCase().includes(tq) ||
                          (task.ID_Tasks ?? "").toLowerCase().includes(tq)
                        )
                      })

                      const statusCounts = {
                        all:              allSubcTasks.length,
                        "Not started":    allSubcTasks.filter(t => t.Task_status === "Not started").length,
                        "Work-in-progress": allSubcTasks.filter(t => t.Task_status === "Work-in-progress").length,
                        "Completed":      allSubcTasks.filter(t => t.Task_status === "Completed").length,
                      }

                      return (
                        <>
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {/* Header */}
                            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                                <ClipboardList className="h-4 w-4 text-emerald-600" />
                              </div>
                              <h3 className="text-sm font-semibold text-slate-800">{t("tabTasks")}</h3>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                {filteredTasks.length}/{allSubcTasks.length}
                              </span>
                              {/* U-02 · El permiso que rige de verdad crear una
                                  tarea es `tasks:create` (lo comprueba la API en
                                  POST /tasks/). Condicionarlo a
                                  `subcontractor:update` dejaba al subcontratista
                                  —que tiene `tasks:create` y no el otro— sin
                                  ningún camino para ejercer la regla R3. */}
                              {hasPermission("tasks:create") && (
                                <Button
                                  size="sm"
                                  onClick={() => setCreateTaskOpen(true)}
                                  className="ml-auto h-8 gap-1.5 bg-emerald-700 text-xs hover:bg-emerald-800"
                                >
                                  <Plus className="h-3.5 w-3.5" /> {t("newTask")}
                                </Button>
                              )}
                            </div>

                            {/* Search + Status filter */}
                            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative flex-1">
                                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    value={subcTaskSearch}
                                    onChange={(e) => setSubcTaskSearch(e.target.value)}
                                    placeholder={t("searchTasks")}
                                    className="h-8 pl-8 text-xs"
                                  />
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-1.5">
                                  {([
                                    { key: "all" as const,              label: t("filterAll"),      cls: "bg-slate-800 text-white border-slate-800" },
                                    { key: "Not started" as const,      label: t("taskNotStarted"), cls: "bg-slate-500 text-white border-slate-500" },
                                    { key: "Work-in-progress" as const,  label: t("taskInProgress"), cls: "bg-amber-600 text-white border-amber-600" },
                                    { key: "Completed" as const,        label: t("taskCompleted"),  cls: "bg-emerald-600 text-white border-emerald-600" },
                                  ]).map(({ key, label, cls }) => {
                                    const on = taskStatusFilter === key
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => setTaskStatusFilter(key)}
                                        className={cn(
                                          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                                          on ? cls : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                        )}
                                      >
                                        {label}
                                        <span className={cn("rounded-full px-1 py-0.5 text-[9px] leading-none font-bold", on ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                                          {key === "all" ? statusCounts.all : statusCounts[key] ?? 0}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Task list */}
                            <div className="p-4 sm:p-6">
                              {allSubcTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-12">
                                  <ClipboardList className="h-8 w-8 text-slate-300" />
                                  <p className="text-sm text-slate-500">{t("noTasks")}</p>
                                  {hasPermission("tasks:create") && (
                                    <Button size="sm" variant="outline" onClick={() => setCreateTaskOpen(true)} className="mt-1 gap-1.5 text-xs">
                                      <Plus className="h-3.5 w-3.5" /> {t("newTask")}
                                    </Button>
                                  )}
                                </div>
                              ) : filteredTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-10">
                                  <Search className="h-7 w-7 text-slate-300" />
                                  <p className="text-sm text-slate-500">{t("noTasksMatch")}</p>
                                </div>
                              ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {filteredTasks.map((task: any) => {
                                    const overdue   = checkOverdue(task.Delivery_date, task.Task_status)
                                    const sCls      = STATUS_STYLE[task.Task_status ?? "Not started"] ?? STATUS_STYLE["Not started"]
                                    const sLabel    = STATUS_LABEL[task.Task_status ?? "Not started"] ?? task.Task_status
                                    const pCls      = task.Priority ? PRIORITY_STYLE[task.Priority] : null
                                    const startDate = fmtDate(task.Designation_date)
                                    const dueDate   = fmtDate(task.Delivery_date)

                                    return (
                                      <button
                                        key={task.ID_Tasks}
                                        onClick={() => { setDetailTask(task); setTaskDetailsOpen(true) }}
                                        className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-emerald-300 hover:shadow-sm"
                                      >
                                        {/* Top row: status + priority */}
                                        <div className="flex items-center gap-2">
                                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", sCls)}>
                                            {sLabel}
                                          </span>
                                          {pCls && (
                                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", pCls)}>
                                              {task.Priority}
                                            </span>
                                          )}
                                          {overdue && (
                                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                              Overdue
                                            </span>
                                          )}
                                        </div>

                                        {/* Task name */}
                                        <p className="text-sm font-semibold leading-snug text-slate-800 group-hover:text-emerald-800">
                                          {task.Name ?? "—"}
                                        </p>

                                        {/* Description snippet */}
                                        {task.Task_description && (
                                          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                                            {task.Task_description}
                                          </p>
                                        )}

                                        {/* Footer: dates + technician */}
                                        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[10px] text-slate-400">
                                          {startDate && (
                                            <span className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" /> {startDate}
                                            </span>
                                          )}
                                          {dueDate && (
                                            <span className={cn("flex items-center gap-1", overdue && "text-red-500")}>
                                              <Clock className="h-3 w-3" /> {dueDate}
                                            </span>
                                          )}
                                          {task._techName && (
                                            <span className="flex items-center gap-1 ml-auto">
                                              <Wrench className="h-3 w-3" /> {task._techName}
                                            </span>
                                          )}
                                        </div>

                                        {/* Task ID */}
                                        <p className="font-mono text-[9px] text-slate-300">{task.ID_Tasks}</p>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Dialogs ── */}
                          {/* Sin userRole el diálogo evaluaba
                              `undefined !== "SUBCONTRACTOR"` → true y le
                              desplegaba al sub las pestañas de asignación
                              (Unassigned / GQM Member / Subcontractor) además de
                              pedir el roster interno de /api/members. Se pasa el
                              rol de la SESIÓN, no el de localStorage. */}
                          <CreateTaskDialog
                            open={createTaskOpen}
                            onOpenChange={setCreateTaskOpen}
                            jobId=""
                            jobData={subcJobData}
                            defaultSubcId={subc.ID_Subcontractor}
                            userRole={roleSlug === "subcontractor" ? "SUBCONTRACTOR" : user?.role}
                            userSubId={roleSlug === "subcontractor" ? (sessionUid ?? subc.ID_Subcontractor) : null}
                            onTaskCreated={() => { setCreateTaskOpen(false); fetchSubc() }}
                          />
                          <TaskDetailsDialog
                            task={detailTask}
                            open={taskDetailsOpen}
                            onOpenChange={setTaskDetailsOpen}
                            technicians={subcTechList}
                            jobData={subcJobData}
                            onDelete={() => fetchSubc()}
                            onSave={() => fetchSubc()}
                          />
                        </>
                      )
                    })()}
                  </TabsContent>

                  {/* ── SKILLS tab ───────────────────────────────────────── */}
                  <TabsContent value="skills">
                    <SectionCard icon={Wrench} iconBg="bg-amber-50" iconColor="text-amber-600" title={t("tabSkills")}
                      action={
                        <div className="flex items-center gap-2">
                          {hasPermission("subcontractor:update") && (
                            <>
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-200 transition-colors">
                                <div className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${skillsSyncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                                  onClick={() => setSkillsSyncPodio(v => !v)}>
                                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${skillsSyncPodio ? "translate-x-3" : "translate-x-0.5"}`} />
                                </div>
                                {t("syncPodio")}
                              </label>
                              <Button size="sm" variant="outline" onClick={openManageSkills}
                                className="gap-1.5 border-slate-200 text-xs text-slate-700 hover:border-amber-300 hover:bg-amber-50">
                                <Wrench className="h-3.5 w-3.5" /> {t("manageSkills")}
                              </Button>
                              <Button size="sm" onClick={openSkillsModal}
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                                <Plus className="h-3.5 w-3.5" /> {t("linkSkill")}
                              </Button>
                            </>
                          )}
                        </div>
                      }>
                      {subc.skills?.length ? (
                        <div className="space-y-2">
                          {[...(subc.skills)].sort((a, b) => {
                            const nameA = asStr(a.Skill_name) || asStr(a.Division_trade)
                            const nameB = asStr(b.Skill_name) || asStr(b.Division_trade)
                            return nameA.localeCompare(nameB)
                          }).map((s) => {
                            const busy = unlinkingSkillId === s.ID_Skill
                            const divTrade = asStr(s.Division_trade)
                            const skillName = asStr(s.Skill_name)
                            const displayName = skillName || divTrade
                            const showBadge = divTrade && skillName && divTrade !== skillName
                            return (
                              <div key={s.ID_Skill} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {showBadge && (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                        {divTrade}
                                      </span>
                                    )}
                                    <span className="text-sm font-medium text-slate-800">
                                      {displayName || <span className="italic text-slate-400">{t("noDivision")}</span>}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{s.ID_Skill}</p>
                                </div>
                                {hasPermission("subcontractor:update") && (
                                  <Button variant="outline" size="sm" onClick={() => unlinkSkill(s.ID_Skill)} disabled={busy}
                                    className="gap-1.5 border-slate-200 text-xs text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                                    {t("unlink")}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                          <Wrench className="h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-500">{t("noSkillsLinked")}</p>
                          {hasPermission("subcontractor:update") && (
                            <Button size="sm" onClick={openSkillsModal} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                              <Plus className="h-3.5 w-3.5" /> {t("linkFirstSkill")}
                            </Button>
                          )}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* ── JOBS tab ─────────────────────────────────────────── */}
                  <TabsContent value="jobs">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800">{t("tabJobs")}</h3>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {subc.jobs?.length ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 sm:p-6">
                        {(subc.jobs ?? []).length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-12">
                            <Briefcase className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">{t("noJobs")}</p>
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
                                        <span>{t("assigned")} {fmtDate(job.Date_assigned)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Pricing row */}
                                  {(sold != null || formula != null || cos != null) && (
                                    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                      {sold != null && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                          <DollarSign className="h-3 w-3" />${sold.toLocaleString()}
                                          <span className="font-normal text-slate-400">{t("sold")}</span>
                                        </div>
                                      )}
                                      {formula != null && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                                          <DollarSign className="h-3 w-3" />${formula.toLocaleString()}
                                          <span className="font-normal text-slate-400">{t("formula")}</span>
                                        </div>
                                      )}
                                      {cos != null && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-orange-600">
                                          <Tag className="h-3 w-3" />${cos.toLocaleString()}
                                          <span className="font-normal text-slate-400">{t("cos")}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Permit + CTA */}
                                  <div className="flex items-center justify-between">
                                    {job.Permit && job.Permit !== "No" && job.Permit !== "N/A" ? (
                                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                        {t("permit")}: {job.Permit}
                                      </span>
                                    ) : <div />}
                                    {/* U-09: para el subcontratista este botón
                                        no lleva a ninguna parte. `/jobs` no
                                        está en `PORTAL_PREFIXES.subcontractor`
                                        y `middleware.ts` lo rebota. Medido:
                                        desde ?tab=jobs se acaba en
                                        /subcontractors/<id> — y encima se
                                        pierde la pestaña. Su ficha ya muestra
                                        el job; la página interna añade lo que
                                        no debe ver (precios, márgenes). */}
                                    {!isPortal && (
                                    <button
                                      onClick={() => router.push(`/jobs/${jobId}`)}
                                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700">
                                      View Job <ExternalLink className="h-3 w-3" />
                                    </button>
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

                  {/* ── PURCHASE ORDERS tab ──────────────────────────────── */}
                  <TabsContent value="orders">
                    {(() => {
                      const jobMap = Object.fromEntries((subc.jobs ?? []).map((j: any) => [j.ID_Jobs, j]))
                      const fmtMoney = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      const fmtDate = (raw: string | null) => {
                        if (!raw) return null
                        const d = new Date(raw)
                        return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      }
                      const techFieldMap: Record<string, string> = {
                        "tech-1-ptl-original-pricing": "PTL Original",
                        "tech-2-ptl-revised-pricing": "PTL Revised",
                        "tech-3-bid-pricing": "BID Pricing",
                        "tech-4-wo-pricing": "WO Pricing",
                      }
                      const jobTypeCls: Record<string, string> = {
                        QID: "bg-violet-100 text-violet-700 border-violet-200",
                        WO:  "bg-amber-100 text-amber-700 border-amber-200",
                        BID: "bg-cyan-100 text-cyan-700 border-cyan-200",
                        PAR: "bg-indigo-100 text-indigo-700 border-indigo-200",
                      }
                      const coStateCls: Record<string, string> = {
                        approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
                        pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
                        rejected: "bg-red-100 text-red-600 border-red-200",
                      }

                      const allOrders: any[] = subc.orders ?? []

                      // ── Payment-status classifier ──────────────────────────
                      const getOrderPayStatus = (order: any): "paid" | "pending" | "unlinked" => {
                        const bills = ((order.financial_docs ?? []) as any[]).filter(
                          (d) => d.Type_of_document === "Bill" && !d.is_voided
                        )
                        if (bills.length === 0) return "unlinked"
                        return bills.every((b: any) => (b.Percentage_Paid ?? 0) >= 100) ? "paid" : "pending"
                      }

                      // ── Filter + search ────────────────────────────────────
                      const oq = ordersSearch.trim().toLowerCase()
                      const orders = allOrders.filter((order: any) => {
                        if (ordersPayFilter !== "all" && getOrderPayStatus(order) !== ordersPayFilter) return false
                        if (!oq) return true
                        const jobIds = ((order.estimate_costs ?? []) as any[]).map((ec: any) => ec.ID_Jobs).filter(Boolean)
                        const linkedJobNames = jobIds.map((jid: string) => {
                          const j = jobMap[jid]
                          return j ? `${j.Project_name ?? ""} ${j.ID_Jobs ?? ""}`.toLowerCase() : ""
                        }).join(" ")
                        return (
                          (order.Title ?? "").toLowerCase().includes(oq) ||
                          (order.ID_Order ?? "").toLowerCase().includes(oq) ||
                          (order.Notes ?? "").toLowerCase().includes(oq) ||
                          linkedJobNames.includes(oq)
                        )
                      })

                      const payFilterCounts = {
                        all:      allOrders.length,
                        paid:     allOrders.filter(o => getOrderPayStatus(o) === "paid").length,
                        pending:  allOrders.filter(o => getOrderPayStatus(o) === "pending").length,
                        unlinked: allOrders.filter(o => getOrderPayStatus(o) === "unlinked").length,
                      }

                      return (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          {/* Header */}
                          <div className="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                                <ClipboardList className="h-4 w-4 text-amber-600" />
                              </div>
                              <h3 className="text-sm font-semibold text-slate-800">{t("purchaseOrders")}</h3>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                {orders.length}/{allOrders.length}
                              </span>
                            </div>

                            {/* Search + filter */}
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <Input
                                  value={ordersSearch}
                                  onChange={(e) => setOrdersSearch(e.target.value)}
                                  placeholder={t("searchOrders")}
                                  className="h-8 pl-8 text-xs"
                                />
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-1.5">
                                {(["all", "paid", "pending", "unlinked"] as const).map((f) => {
                                  const on = ordersPayFilter === f
                                  const colorCls = {
                                    all:      on ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
                                    paid:     on ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400",
                                    pending:  on ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:border-rose-400",
                                    unlinked: on ? "bg-slate-500 text-white border-slate-500" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
                                  }[f]
                                  const label = {
                                    all:      t("filterAll"),
                                    paid:     t("filterPaid"),
                                    pending:  t("filterPending"),
                                    unlinked: t("filterUnlinked"),
                                  }[f]
                                  return (
                                    <button
                                      key={f}
                                      onClick={() => setOrdersPayFilter(f)}
                                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${colorCls}`}
                                    >
                                      {label}
                                      <span className={`rounded-full px-1 py-0.5 text-[9px] leading-none font-bold ${on ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                                        {payFilterCounts[f]}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="p-4 sm:p-6">
                            {allOrders.length === 0 ? (
                              <div className="flex flex-col items-center justify-center gap-2 py-12">
                                <ClipboardList className="h-8 w-8 text-slate-300" />
                                <p className="text-sm text-slate-500">{t("noOrders")}</p>
                              </div>
                            ) : orders.length === 0 ? (
                              <div className="flex flex-col items-center justify-center gap-2 py-10">
                                <Search className="h-7 w-7 text-slate-300" />
                                <p className="text-sm text-slate-500">{t("noOrdersMatch")}</p>
                              </div>
                            ) : (
                              <div className="grid gap-4 sm:grid-cols-2">
                                {orders.map((order: any) => {
                                  const formula    = order.Formula    != null ? Number(order.Formula)    : null
                                  const adjFormula = order.Adj_formula != null ? Number(order.Adj_formula) : null
                                  const techLabel  = techFieldMap[order.tech_field ?? ""] ?? order.tech_field ?? null

                                  // Linked jobs via estimate_costs
                                  const estimateCosts: any[] = order.estimate_costs ?? []
                                  const linkedJobIds = [...new Set(estimateCosts.map((ec: any) => ec.ID_Jobs).filter(Boolean))]
                                  const linkedJobs   = linkedJobIds.map((jid: string) => jobMap[jid]).filter(Boolean)

                                  // Change orders & bills
                                  const changeOrders: any[] = order.change_orders ?? []
                                  const bills: any[] = (order.financial_docs ?? []).filter((d: any) => d.Type_of_document === "Bill")

                                  return (
                                    <div key={order.ID_Order}
                                      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">

                                      {/* ── Card header ── */}
                                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-slate-800 leading-snug">
                                            {order.Title ?? t("untitledOrder")}
                                          </p>
                                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{order.ID_Order}</p>
                                        </div>
                                        {techLabel && (
                                          <span className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                            {techLabel}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-col gap-0 divide-y divide-slate-100">

                                        {/* ── Pricing ── */}
                                        <div className="grid grid-cols-2 divide-x divide-slate-100">
                                          <div className="px-4 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("formula")}</p>
                                            <p className="mt-0.5 text-sm font-bold text-slate-800">
                                              {formula != null ? fmtMoney(formula) : <span className="italic text-slate-400">—</span>}
                                            </p>
                                          </div>
                                          <div className="px-4 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("adjFormula")}</p>
                                            <p className="mt-0.5 text-sm font-bold text-emerald-700">
                                              {adjFormula != null ? fmtMoney(adjFormula) : <span className="italic text-slate-400">—</span>}
                                            </p>
                                          </div>
                                        </div>

                                        {/* ── Linked Job(s) ── */}
                                        {linkedJobs.length > 0 && (
                                          <div className="px-4 py-3">
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                                              <Briefcase className="h-3 w-3" /> {t("linkedJob")}
                                            </p>
                                            <div className="space-y-2">
                                              {linkedJobs.map((job: any) => (
                                                <div key={job.ID_Jobs} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-slate-800">
                                                      {job.Project_name ?? job.Job_Description ?? job.ID_Jobs}
                                                    </p>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                                      <span className="font-mono text-[10px] text-slate-400">{job.ID_Jobs}</span>
                                                      {job.Job_type && (
                                                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${jobTypeCls[job.Job_type] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                                          {job.Job_type}
                                                        </span>
                                                      )}
                                                      {job.Job_status && (
                                                        <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                          {job.Job_status}
                                                        </span>
                                                      )}
                                                    </div>
                                                    {job.Project_location && (
                                                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                                                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />{job.Project_location}
                                                      </p>
                                                    )}
                                                  </div>
                                                  {/* U-09: mismo rebote que el
                                                      botón «View Job» de arriba. */}
                                                  {!isPortal && (
                                                  <button
                                                    onClick={() => router.push(`/jobs/${job.ID_Jobs}`)}
                                                    className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                                                    <ExternalLink className="h-3 w-3" />
                                                  </button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* ── Change Orders ── */}
                                        {changeOrders.length > 0 && (
                                          <div className="px-4 py-3">
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                                              <Tag className="h-3 w-3" /> {t("changeOrders")} ({changeOrders.length})
                                            </p>
                                            <div className="space-y-1.5">
                                              {changeOrders.map((co: any) => (
                                                <div key={co.ID_ChangeOrder} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-medium text-slate-700">{co.Name ?? co.ID_ChangeOrder}</p>
                                                    {co.Description && (
                                                      <p className="truncate text-[10px] text-slate-400">{co.Description}</p>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-shrink-0 items-center gap-1.5">
                                                    {co.ChangeOrderFormula != null && (
                                                      <span className="text-xs font-bold text-orange-600">
                                                        {co.ChangeOrderFormula >= 0 ? "+" : ""}{fmtMoney(Number(co.ChangeOrderFormula))}
                                                      </span>
                                                    )}
                                                    {co.State && (
                                                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${coStateCls[co.State.toLowerCase()] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                                        {co.State}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* ── Bills ── */}
                                        {bills.length > 0 && (
                                          <div className="px-4 py-3">
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                                              <FileText className="h-3 w-3" /> {t("linkedBill")} ({bills.length})
                                            </p>
                                            <div className="space-y-2">
                                              {bills.map((bill: any) => {
                                                const pct = bill.Percentage_Paid != null ? Math.min(100, Number(bill.Percentage_Paid)) : null
                                                return (
                                                  <div key={bill.ID_FinancialDoc ?? bill.qbo_id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-semibold text-slate-700">
                                                          {bill.Vendor_Customer ?? bill.Job_Ref_QBO ?? bill.ID_FinancialDoc}
                                                        </p>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                                          {bill.Total_Amount != null && (
                                                            <span className="font-bold text-slate-800">{fmtMoney(Number(bill.Total_Amount))}</span>
                                                          )}
                                                          {bill.Balance_Amount != null && (
                                                            <span className="text-orange-600">Balance: {fmtMoney(Number(bill.Balance_Amount))}</span>
                                                          )}
                                                          {fmtDate(bill.Due_Date) && (
                                                            <span className="flex items-center gap-0.5">
                                                              <Calendar className="h-2.5 w-2.5" />{fmtDate(bill.Due_Date)}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      {bill.is_voided && (
                                                        <span className="flex-shrink-0 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                                                          Voided
                                                        </span>
                                                      )}
                                                    </div>
                                                    {pct != null && (
                                                      <div className="mt-2">
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                                                          <span>{t("paid")}</span>
                                                          <span className="font-semibold text-slate-600">{pct.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
                                                          <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                                                            style={{ width: `${pct}%` }} />
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {/* ── Notes / HD Materials ── */}
                                        {(order.Notes || order.Ptl_hd_materials != null) && (
                                          <div className="px-4 py-3 space-y-1.5">
                                            {order.Ptl_hd_materials != null && (
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400">HD Materials</span>
                                                <span className="font-semibold text-slate-700">{fmtMoney(Number(order.Ptl_hd_materials))}</span>
                                              </div>
                                            )}
                                            {order.Notes && (
                                              <p className="text-[11px] text-slate-500 italic">{order.Notes}</p>
                                            )}
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
                      )
                    })()}
                  </TabsContent>

                  {/* ── TIMELINE tab ─────────────────────────────────────── */}
                  <TabsContent value="timeline">
                    <SubcontractorTimelineTab subcId={id} />
                  </TabsContent>

              </div>

              {/* ── RIGHT: sidebar (1/3) ────────────────────────────────── */}
              <div className="space-y-4">

                {/* Leader card */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("teamLeader")}</p>
                  </div>
                  <div className="p-4 sm:p-5">
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
                            { label: t("phone"), value: leaderTechnician.Phone_Number },
                            { label: t("location"), value: leaderTechnician.Location },
                            { label: t("email"), value: leaderTechnician.Email_Address },
                            { label: t("type"), value: leaderTechnician.Type_of_technician },
                          ].map(({ label, value }) => value ? (
                            <div key={label} className="flex items-start gap-1.5">
                              <span className="w-14 flex-shrink-0 font-semibold text-slate-400">{label}</span>
                              <span className="text-slate-700 break-all">{value}</span>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm italic text-slate-400">{t("noLeaderAssigned")}</p>
                    )}
                  </div>
                </div>

                {/* Quick Summary Dashboard */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("quickSummary")}</p>
                  </div>

                  {/* Identity strip */}
                  <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">{subc.ID_Subcontractor}</span>
                      <StatusBadge status={subc.Status} />
                      <ScoreBadge score={subc.Score} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400">{t("compliance")}:</span>
                        <CertBadge value={subc.Gqm_compliance} />
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400">{t("bst")}:</span>
                        <CertBadge value={subc.Gqm_best_service_training} />
                      </span>
                    </div>
                  </div>

                  {subcDashboard && (
                    <TooltipProvider delayDuration={200}>

                      {/* ── Jobs ─────────────────────────────────────── */}
                      <div className="px-4 py-3 sm:px-5">
                        <div className="mb-2.5 flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("tabJobs")}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-default flex-col items-center rounded-xl border border-emerald-100 bg-emerald-50 px-1.5 py-2.5 text-center">
                                <CheckCircle className="mb-1 h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-base font-bold leading-none text-emerald-700">{subcDashboard.jobs.completed}</span>
                                <span className="mt-1 line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-emerald-600">{t("dashCompleted")}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px] text-xs">{t("tooltipCompleted")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-default flex-col items-center rounded-xl border border-amber-100 bg-amber-50 px-1.5 py-2.5 text-center">
                                <Clock className="mb-1 h-3.5 w-3.5 text-amber-500" />
                                <span className="text-base font-bold leading-none text-amber-700">{subcDashboard.jobs.inProgress}</span>
                                <span className="mt-1 line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-amber-600">{t("dashInProgress")}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[220px] text-xs">{t("tooltipInProgress")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-default flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2.5 text-center">
                                <Activity className="mb-1 h-3.5 w-3.5 text-slate-400" />
                                <span className="text-base font-bold leading-none text-slate-600">{subcDashboard.jobs.other}</span>
                                <span className="mt-1 line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-400">{t("dashOther")}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[220px] text-xs">{t("tooltipOther")}</TooltipContent>
                          </Tooltip>

                        </div>
                      </div>

                      {/* ── Payments ──────────────────────────────────── */}
                      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                        <div className="mb-2.5 flex items-center gap-1.5">
                          <DollarSign className="h-3 w-3 text-slate-400" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("dashPayments")}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-default flex-col items-center rounded-xl border border-emerald-100 bg-emerald-50 px-1.5 py-2.5 text-center">
                                <CheckCircle className="mb-1 h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-base font-bold leading-none text-emerald-700">{subcDashboard.payments.settled}</span>
                                <span className="mt-1 line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-emerald-600">{t("dashSettled")}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px] text-xs">{t("tooltipSettled")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex cursor-default flex-col items-center rounded-xl border px-1.5 py-2.5 text-center",
                                subcDashboard.payments.pending > 0 ? "border-rose-100 bg-rose-50" : "border-slate-200 bg-slate-50"
                              )}>
                                <AlertCircle className={cn("mb-1 h-3.5 w-3.5", subcDashboard.payments.pending > 0 ? "text-rose-500" : "text-slate-400")} />
                                <span className={cn("text-base font-bold leading-none", subcDashboard.payments.pending > 0 ? "text-rose-700" : "text-slate-500")}>{subcDashboard.payments.pending}</span>
                                <span className={cn("mt-1 line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide", subcDashboard.payments.pending > 0 ? "text-rose-600" : "text-slate-400")}>{t("dashPendingPay")}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[220px] text-xs">{t("tooltipPendingPay")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex cursor-default flex-col items-center rounded-xl border px-1.5 py-2.5 text-center",
                                subcDashboard.payments.unlinked > 0 ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-slate-50"
                              )}>
                                <Unlink className={cn("mb-1 h-3.5 w-3.5", subcDashboard.payments.unlinked > 0 ? "text-slate-500" : "text-slate-300")} />
                                <span className={cn("text-base font-bold leading-none", subcDashboard.payments.unlinked > 0 ? "text-slate-600" : "text-slate-400")}>{subcDashboard.payments.unlinked}</span>
                                <span className="mt-1 line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-400">{t("dashUnlinked")}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[240px] text-xs">{t("tooltipUnlinked")}</TooltipContent>
                          </Tooltip>

                        </div>
                      </div>

                      {/* ── Tasks ─────────────────────────────────────── */}
                      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                        <div className="mb-2.5 flex items-center gap-1.5">
                          <ClipboardList className="h-3 w-3 text-slate-400" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("dashTasks")}</p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "flex cursor-default items-center gap-3 rounded-xl border px-3 py-2.5",
                              subcDashboard.tasks.pending > 0 ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"
                            )}>
                              <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                subcDashboard.tasks.pending > 0 ? "bg-amber-100" : "bg-emerald-100"
                              )}>
                                {subcDashboard.tasks.pending > 0
                                  ? <ClipboardList className="h-4 w-4 text-amber-600" />
                                  : <CheckCircle className="h-4 w-4 text-emerald-600" />
                                }
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={cn("text-lg font-bold leading-none", subcDashboard.tasks.pending > 0 ? "text-amber-700" : "text-emerald-700")}>
                                  {subcDashboard.tasks.pending}
                                </p>
                                <p className={cn("mt-0.5 text-[10px] font-medium leading-tight", subcDashboard.tasks.pending > 0 ? "text-amber-600" : "text-emerald-600")}>
                                  {t("dashPendingTasks")}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs font-semibold text-slate-600">{subcDashboard.tasks.total}</p>
                                <p className="text-[10px] text-slate-400">total</p>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[220px] text-xs">{t("tooltipPendingTasks")}</TooltipContent>
                        </Tooltip>
                      </div>

                    </TooltipProvider>
                  )}
                </div>

                {/* Coverage area summary */}
                {(subc.Coverage_Area ?? []).length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("coverageAreas")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 sm:p-5">
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
          </Tabs>
        </div>
        </div>
      </main>
      </div>

      {/* ── Manage Skills dialog ───────────────────────────────────────────── */}
      <Dialog open={manageSkillsOpen} onOpenChange={(o) => { setManageSkillsOpen(o); if (!o) { setEditingSkillId(null); setDeleteSkillId(null) } }}>
        <DialogContent className="flex h-[90dvh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">

          {/* Header */}
          <div className="flex-shrink-0 border-b border-slate-100 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 sm:h-10 sm:w-10">
                <Wrench className="h-4 w-4 text-amber-600 sm:h-5 sm:w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900 sm:text-lg">
                  {t("manageSkillsTitle")}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-slate-500">
                  {t("manageSkillsDesc")}
                </DialogDescription>
              </div>
            </div>

            {/* Create new skill form */}
            <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                {t("createNewSkill")}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={createSkillName}
                  onChange={(e) => setCreateSkillName(e.target.value)}
                  placeholder={t("skillNamePlaceholder")}
                  className={`flex-1 ${inputCls}`}
                  onKeyDown={(e) => { if (e.key === "Enter") createSkill() }}
                />
                <Button
                  size="sm"
                  onClick={createSkill}
                  disabled={!createSkillName.trim() || createSkillLoading}
                  className="flex-shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                  {createSkillLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />
                  }
                  {createSkillLoading ? t("skillCreating") : t("createNewSkill")}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-emerald-600/70">{t("skillNameHint")}</p>
            </div>
          </div>

          {/* Skills list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {skillsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
                    <div className="h-7 w-16 animate-pulse rounded-lg bg-slate-200" />
                    <div className="h-7 w-16 animate-pulse rounded-lg bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : allSkills.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Wrench className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">No skills in the library yet</p>
                <p className="text-xs text-slate-400">Use the form above to add the first skill</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...allSkills].sort((a, b) => asStr(a.Skill_name).localeCompare(asStr(b.Skill_name))).map((s) => {
                  const isEditing = editingSkillId === s.ID_Skill
                  const isDeleting = deleteSkillId === s.ID_Skill
                  const name = asStr(s.Skill_name) || asStr(s.Division_trade) || "—"
                  return (
                    <div key={s.ID_Skill}>
                      {isEditing ? (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/40 p-2.5">
                          <Input
                            value={editSkillName}
                            onChange={(e) => setEditSkillName(e.target.value)}
                            placeholder={t("skillNamePlaceholder")}
                            className={`flex-1 ${inputCls}`}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") saveSkill(s.ID_Skill); if (e.key === "Escape") setEditingSkillId(null) }}
                          />
                          <Button size="sm" onClick={() => saveSkill(s.ID_Skill)}
                            disabled={!editSkillName.trim() || editSkillLoading}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            {editSkillLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {editSkillLoading ? t("skillSaving") : t("save")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSkillId(null)}
                            className="border-slate-200 text-xs">{t("cancel")}
                          </Button>
                        </div>
                      ) : isDeleting ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/40 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-red-800">{name}</p>
                            <p className="mt-0.5 text-xs text-red-500">{t("deleteSkillDesc")}</p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <Button size="sm" onClick={() => deleteSkill(s.ID_Skill)}
                              disabled={deleteSkillLoading}
                              className="gap-1.5 bg-red-600 hover:bg-red-700 text-xs text-white">
                              {deleteSkillLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              {deleteSkillLoading ? t("skillDeleting") : t("delete")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeleteSkillId(null)}
                              className="border-slate-200 text-xs">{t("cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-slate-200 hover:bg-white transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{name}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">{s.ID_Skill}</p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5">
                            <Button size="sm" variant="outline"
                              onClick={() => { setEditingSkillId(s.ID_Skill); setEditSkillName(name); setDeleteSkillId(null) }}
                              className="gap-1 border-slate-200 text-xs text-slate-600 hover:border-amber-300 hover:bg-amber-50">
                              <Edit3 className="h-3 w-3" /> {t("editSkill")}
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => { setDeleteSkillId(s.ID_Skill); setEditingSkillId(null) }}
                              className="gap-1 border-slate-200 text-xs text-red-500 hover:border-red-200 hover:bg-red-50">
                              <X className="h-3 w-3" /> {t("delete")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-xs text-slate-500">
              {allSkills.length} {t("globalSkillsLibrary").toLowerCase()}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchAllSkills} disabled={skillsLoading}
                className="gap-1.5 border-slate-200 text-xs">
                {skillsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {t("refresh")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setManageSkillsOpen(false)}
                className="border-slate-200 text-xs">{t("close")}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* ── Skills modal ───────────────────────────────────────────────────── */}
      <Dialog open={skillsModalOpen} onOpenChange={setSkillsModalOpen}>
        <DialogContent className="flex h-[90dvh] w-full max-w-5xl sm:max-w-5xl flex-col gap-0 overflow-hidden p-0" style={{ maxWidth: "64rem" }}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-b border-slate-100 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 sm:h-10 sm:w-10">
                  <Link2 className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-slate-900 sm:text-lg">
                    {t("linkSkillTitle")}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">
                    {t("linkSkillDesc")}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 sm:mt-4 sm:gap-3">
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
                <span className="hidden sm:inline">{t("refresh")}</span>
              </Button>
            </div>

            {skillsError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600">
                {skillsError}
              </div>
            )}
          </div>

          {/* ── Card grid scrolleable ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {skillsLoading ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="h-7 w-16 animate-pulse rounded-lg bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : paginatedSkillsDb.length ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {paginatedSkillsDb.map((s) => {
                  const already = linkedSkillIds.has(s.ID_Skill)
                  const busy = linkingSkillId === s.ID_Skill
                  const label = asStr(s.Division_trade) || asStr(s.Skill_name) || "—"
                  return (
                    <div
                      key={s.ID_Skill}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                        already
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800" title={label}>
                          {label}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">{s.ID_Skill}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => linkSkill(s.ID_Skill)}
                        disabled={already || busy}
                        variant={already ? "outline" : "default"}
                        className={`flex-shrink-0 gap-1.5 text-xs ${!already ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-300 text-emerald-700"}`}
                      >
                        {busy
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Link2 className="h-3.5 w-3.5" />
                        }
                        {already ? t("linked") : t("link")}
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">No skills found</p>
                <p className="text-xs text-slate-400">Try adjusting your search</p>
              </div>
            )}
          </div>

          {/* ── Footer: paginación + Close ───────────────────────────────────── */}
          <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
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
                {t("close")}
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