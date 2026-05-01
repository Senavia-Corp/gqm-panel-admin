"use client"

import React, { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Save, ArrowLeft, RefreshCw, Search, Users, Mail, Phone, Plus, X, Trash2, Zap, ZapOff, Shield, Building2, MapPin, Edit3, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CommunityDetailsCard, type CommunityClient } from "@/components/organisms/CommunityDetailsCard"
import { ParentCompanyTimelineTab } from "@/components/organisms/parent-company-detail/tabs/ParentCompanyTimelineTab"

// ─── Array field helpers ─────────────────────────────────────────────────────

function parseArrayField(raw: string | null | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1)
    const items: string[] = []
    let current = ""
    let inQuote = false
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i]
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === "," && !inQuote) { items.push(current.trim()); current = ""; continue }
      current += ch
    }
    if (current.trim()) items.push(current.trim())
    return items.filter(Boolean)
  }
  return trimmed ? [trimmed] : []
}

export function serializeArrayField(values: string[]): string {
  if (values.length === 0) return ""
  if (values.length === 1) return values[0]
  return '{' + values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",") + '}'
}

// ─── Podio Sync Toggle ────────────────────────────────────────────────────────

function PodioSyncToggle({ value, onChange, danger }: {
  value: boolean; onChange: (v: boolean) => void; danger?: boolean
}) {
  const activeColor = danger
    ? "border-red-400 bg-gradient-to-r from-red-50 to-rose-50"
    : "border-violet-400 bg-gradient-to-r from-violet-50 to-indigo-50"
  const iconBg = danger ? "bg-red-600" : "bg-violet-600"
  const textActive = danger ? "text-red-800" : "text-violet-800"
  const subActive = danger ? "text-red-600" : "text-violet-600"
  const pillActive = danger ? "bg-red-500" : "bg-violet-600"

  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
        value ? activeColor : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
        value ? iconBg : "bg-slate-200"
      }`}>
        {value
          ? <Zap className="h-4 w-4 text-white" />
          : <ZapOff className="h-4 w-4 text-slate-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold transition-colors ${value ? textActive : "text-slate-600"}`}>
          {value
            ? (danger ? "También eliminar de Podio: ON" : "Sincronizar con Podio: ON")
            : (danger ? "También eliminar de Podio: OFF" : "Sincronizar con Podio: OFF")
          }
        </p>
        <p className={`text-xs transition-colors ${value ? subActive : "text-slate-400"}`}>
          {danger
            ? "El item de Podio también será eliminado"
            : "Los cambios se propagarán a Podio"
          }
        </p>
      </div>
      <div className={`relative flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-all duration-200 ${
        value ? pillActive : "bg-slate-300"
      }`}>
        <span className={`absolute inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-200 ${
          value ? "left-[18px]" : "left-[3px]"
        }`} />
      </div>
    </button>
  )
}

// ─── Read-only display: chips with icon ──────────────────────────────────────

function ArrayDisplayField({
  raw, icon: Icon, linkPrefix, emptyLabel, changed,
}: {
  raw: string | null | undefined
  icon: React.ElementType
  linkPrefix?: string
  emptyLabel: string
  changed?: boolean
}) {
  const values = parseArrayField(raw)
  return (
    <div className={`min-h-[40px] rounded-lg border px-3 py-2 ${changed ? "border-yellow-500 ring-2 ring-yellow-200" : "border-slate-200 bg-slate-50"}`}>
      {values.length === 0 ? (
        <span className="flex items-center gap-1.5 text-xs text-slate-400 italic">
          <Icon className="h-3.5 w-3.5" /> {emptyLabel}
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            linkPrefix ? (
              <a key={i} href={`${linkPrefix}${v}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                title={v}>
                <Icon className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />
                <span className="max-w-[200px] truncate">{v}</span>
              </a>
            ) : (
              <span key={i} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                <Icon className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />
                <span className="max-w-[200px] truncate">{v}</span>
              </span>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Edit mode: one input per item + add/remove ───────────────────────────────

function ArrayEditField({
  raw, icon: Icon, placeholder, onChange, changed,
}: {
  raw: string | null | undefined
  icon: React.ElementType
  placeholder: string
  onChange: (serialized: string) => void
  changed?: boolean
}) {
  const [items, setItems] = React.useState<string[]>(() => {
    const parsed = parseArrayField(raw)
    return parsed.length > 0 ? parsed : [""]
  })

  React.useEffect(() => {
    const parsed = parseArrayField(raw)
    setItems(parsed.length > 0 ? parsed : [""])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (newItems: string[]) => {
    setItems(newItems)
    const nonEmpty = newItems.filter((v) => v.trim())
    onChange(serializeArrayField(nonEmpty))
  }

  const handleChange = (idx: number, val: string) => {
    const next = [...items]; next[idx] = val; update(next)
  }

  const handleAdd = () => update([...items, ""])

  const handleRemove = (idx: number) => {
    if (items.length === 1) { update([""]); return }
    update(items.filter((_, i) => i !== idx))
  }

  return (
    <div className={`rounded-lg border p-2 space-y-1.5 ${changed ? "border-yellow-500 ring-2 ring-yellow-200" : "border-slate-200"}`}>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type="text"
            value={item}
            onChange={(e) => handleChange(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
          />
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors"
      >
        <Plus className="h-3 w-3" /> Add another
      </button>
    </div>
  )
}

// ─── Constants ───────────────────────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]

const inputCls = "rounded-xl border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition-all"
const textareaCls = `${inputCls} resize-none`

// ─── Section / Field / FieldValue ─────────────────────────────────────────────

function Section({ icon: Icon, title, accent, badge, children }: {
  icon: React.ElementType; title: string; accent: string
  badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 ${accent}`}>
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function FieldValue({ value, placeholder, icon: Icon }: {
  value?: string | null; placeholder?: string; icon?: React.ElementType
}) {
  if (!value) return <p className="text-sm italic text-slate-400">{placeholder ?? "—"}</p>
  return (
    <div className="flex items-start gap-1.5">
      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />}
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ClientCommunity = CommunityClient

type ParentMgmtCo = {
  ID_Community_Tracking: string
  Property_mgmt_co?: string | null
  Company_abbrev?: string | null
  Main_office_hq?: string | null
  Main_office_email?: string | null
  Main_office_number?: string | null
  State?: string | null
  podio_item_id?: string | null
  clients?: ClientCommunity[]
  managers?: any[]
}

type ParentMgmtCoDetailsPageProps = {
  params: Promise<{ id: string }>
}

const SKIP_ON_PATCH: Array<keyof ParentMgmtCo> = ["clients", "managers", "ID_Community_Tracking"]

// ─── Delete dialog ────────────────────────────────────────────────────────────

function DeleteParentDialog({ open, onOpenChange, item, onDeleted }: {
  open: boolean; onOpenChange: (v: boolean) => void
  item: ParentMgmtCo | null; onDeleted: () => void
}) {
  const [syncPodio, setSyncPodio] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { if (open) setSyncPodio(false) }, [open])

  const doDelete = async () => {
    if (!item) return
    setDeleting(true)
    try {
      // ✅ Pasar sync_podio como query param
      const res = await apiFetch(
        `/api/parent_mgmt_co/${item.ID_Community_Tracking}?sync_podio=${syncPodio}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error(await res.text())
      onDeleted()
      onOpenChange(false)
      toast({
        title: "Compañía eliminada",
        description: `${item.Property_mgmt_co ?? item.ID_Community_Tracking} eliminada${syncPodio ? " y removida de Podio" : ""}.`,
      })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setDeleting(false) }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Compañía Padre</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar{" "}
            <span className="font-semibold text-slate-800">
              {item?.Property_mgmt_co ?? item?.ID_Community_Tracking}
            </span>? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ✅ Solo mostrar si tiene conexión con Podio */}
        {item?.podio_item_id && (
          <div className="my-2">
            <PodioSyncToggle value={syncPodio} onChange={setSyncPodio} danger />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={doDelete} disabled={deleting}
            className="bg-red-600 hover:bg-red-700">
            {deleting ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParentMgmtCoDetailsPage({ params }: ParentMgmtCoDetailsPageProps) {
  const router = useRouter()
  const { id: parentMgmtCoId } = use(params)

  const [user, setUser] = useState<any>(null)
  const [parentMgmtCo, setParentMgmtCo] = useState<ParentMgmtCo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { hasPermission } = usePermissions()
  const canRead = hasPermission("parent_mgmt_co:read")
  const canUpdate = hasPermission("parent_mgmt_co:update")
  const canDelete = hasPermission("parent_mgmt_co:delete")

  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<Partial<ParentMgmtCo>>({})
  const [syncPodio, setSyncPodio] = useState(false)  // ✅ Estado del toggle de Podio para edición

  const [communitySearch, setCommunitySearch] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleOpenCommunityDetails = (clientId: string) => {
    router.push(`/communities/${clientId}`)
  }

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  const fetchParentMgmtCoData = async () => {
    if (!parentMgmtCoId) return
    try {
      setLoading(true)
      setLoadError(null)

      const response = await apiFetch(`/api/parent_mgmt_co/${parentMgmtCoId}`, { cache: "no-store" })
      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(`Failed to fetch parent mgmt co (${response.status})${errText ? `: ${errText}` : ""}`)
      }

      const data = (await response.json()) as ParentMgmtCo
      const normalized: ParentMgmtCo = {
        ...data,
        ID_Community_Tracking: data.ID_Community_Tracking ?? parentMgmtCoId,
        clients: Array.isArray(data.clients) ? data.clients : [],
        managers: Array.isArray(data.managers) ? data.managers : [],
      }

      setParentMgmtCo(normalized)
      setFormData(normalized)
    } catch (error: any) {
      console.error("Error fetching parent mgmt co:", error)
      setParentMgmtCo(null)
      setLoadError(error?.message ?? "Failed to load parent mgmt co data")
      toast({ title: "Error", description: "Failed to load parent management company data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParentMgmtCoData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMgmtCoId])

  const handleFieldChange = (field: keyof ParentMgmtCo, value: any) => {
    setEditedFields((prev) => new Set([...prev, field as string]))
    setFormData((prev) => ({ ...prev, [field]: value }))
    setIsEditing(true)
  }

  const handleSaveChanges = async () => {
    if (!parentMgmtCoId) return

    const patchPayload: Record<string, any> = {}
    for (const [key, value] of Object.entries(formData)) {
      if (!SKIP_ON_PATCH.includes(key as keyof ParentMgmtCo) && editedFields.has(key)) {
        patchPayload[key] = value
      }
    }

    try {
      // ✅ Pasar sync_podio como query param
      const response = await apiFetch(`/api/parent_mgmt_co/${parentMgmtCoId}?sync_podio=${syncPodio}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(`Failed to update (${response.status})${errText ? `: ${errText}` : ""}`)
      }

      const updated = (await response.json()) as ParentMgmtCo
      const normalized: ParentMgmtCo = {
        ...updated,
        clients: parentMgmtCo?.clients ?? [],
        managers: parentMgmtCo?.managers ?? [],
      }

      setParentMgmtCo(normalized)
      setFormData(normalized)
      setIsEditing(false)
      setEditedFields(new Set())
      setSyncPodio(false)  // ✅ Reset del toggle tras guardar

      toast({
        title: "Success",
        description: `Parent management company updated successfully${syncPodio ? " and synced with Podio" : ""}`,
      })
    } catch (error: any) {
      console.error("Error updating parent mgmt co:", error)
      toast({
        title: "Error",
        description: error?.message ?? "Failed to update parent management company",
        variant: "destructive",
      })
    }
  }

  const allClients = useMemo(() => parentMgmtCo?.clients ?? [], [parentMgmtCo?.clients])
  const associatedClientsCount = allClients.length

  const clients = useMemo(() => {
    const q = communitySearch.trim().toLowerCase()
    if (!q) return allClients
    return allClients.filter((c) => {
      const haystack = [
        c.Client_Community, c.ID_Client, c.Address,
        c.Compliance_Partner, c.ID_Community_Tracking,
      ].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(q)
    })
  }, [allClients, communitySearch])

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm text-slate-500">Cargando compañía…</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!parentMgmtCo) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
              <div className="border-b border-red-100 bg-red-50/60 px-6 py-4">
                <h1 className="text-base font-bold text-red-700">No se pudo cargar la compañía</h1>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-500">{loadError ?? "Error desconocido."}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => router.push("/clients")} className="gap-2 rounded-xl">
                    <ArrowLeft className="h-4 w-4" /> Volver
                  </Button>
                  <Button onClick={fetchParentMgmtCoData} className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!canRead) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 shadow-sm shadow-red-100">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Acceso denegado</h1>
            <p className="mt-2 max-w-sm text-slate-500">
              No tienes el permiso <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-red-600 text-xs">parent_mgmt_co:read</code> necesario.
            </p>
            <Button onClick={() => router.push("/clients")} variant="outline" className="mt-8 gap-2 rounded-xl group transition-all hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Volver a Clientes
            </Button>
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

          {/* ── Sticky header ────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3">

              {/* Left: back + avatar + name + badges */}
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <button onClick={() => router.push("/clients")}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm sm:h-9 sm:w-9">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h1 className="truncate text-base font-bold text-slate-900 leading-none sm:text-lg">
                      {parentMgmtCo.Property_mgmt_co ?? <span className="italic text-slate-400">Sin nombre</span>}
                    </h1>
                    {parentMgmtCo.Company_abbrev && (
                      <span className="hidden shrink-0 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 sm:inline-flex">
                        {parentMgmtCo.Company_abbrev}
                      </span>
                    )}
                    {parentMgmtCo.State && (
                      <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:inline-flex">
                        {parentMgmtCo.State}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{parentMgmtCo.ID_Community_Tracking}</p>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
                {isEditing && syncPodio && (
                  <span className="hidden items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 sm:flex">
                    <Zap className="h-3 w-3" /> Podio activo
                  </span>
                )}
                {canDelete && !isEditing && (
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canUpdate && (
                  !isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}
                      className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
                      <Edit3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm"
                        onClick={() => { setIsEditing(false); setEditedFields(new Set()); setFormData(parentMgmtCo ?? {}); setSyncPodio(false) }}
                        className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs">
                        <X className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cancelar</span>
                      </Button>
                      <Button size="sm" onClick={handleSaveChanges}
                        disabled={editedFields.size === 0}
                        className="h-8 gap-1.5 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
                        <Save className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Guardar</span>
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ── Content ──────────────────────────────────────────────────────── */}
          <div className="p-4 sm:p-6">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">

              {/* ── Main column ───────────────────────────────────────────────── */}
              <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-2">

                {/* Identity */}
                <Section icon={Building2} title="Identidad de la Compañía" accent="text-emerald-700 bg-emerald-50/60">
                  {isEditing && (
                    <div className="mb-4 sm:mb-5">
                      <PodioSyncToggle value={syncPodio} onChange={setSyncPodio} />
                    </div>
                  )}
                  <div className="grid gap-4 sm:gap-5">
                    <Field label="Nombre de la Compañía" required>
                      {isEditing ? (
                        <Input
                          value={formData.Property_mgmt_co ?? ""}
                          onChange={(e) => handleFieldChange("Property_mgmt_co", e.target.value)}
                          placeholder="ej. Suncoast Property Management"
                          className={`${inputCls} ${editedFields.has("Property_mgmt_co") ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
                        />
                      ) : (
                        <FieldValue value={parentMgmtCo.Property_mgmt_co} placeholder="Sin nombre" />
                      )}
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Abreviatura" hint="Código corto identificador">
                        {isEditing ? (
                          <Input
                            value={formData.Company_abbrev ?? ""}
                            onChange={(e) => handleFieldChange("Company_abbrev", e.target.value.toUpperCase())}
                            placeholder="ej. SPM"
                            maxLength={10}
                            className={`font-mono tracking-wider ${inputCls} ${editedFields.has("Company_abbrev") ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
                          />
                        ) : (
                          parentMgmtCo.Company_abbrev ? (
                            <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-sm font-bold text-emerald-800 tracking-wider">
                              {parentMgmtCo.Company_abbrev}
                            </span>
                          ) : (
                            <FieldValue value={null} placeholder="Sin abreviatura" />
                          )
                        )}
                      </Field>

                      <Field label="Estado">
                        {isEditing ? (
                          <Select
                            value={formData.State || "none"}
                            onValueChange={(v) => handleFieldChange("State", v === "none" ? "" : v)}
                          >
                            <SelectTrigger className={`${inputCls} ${editedFields.has("State") ? "border-amber-400 ring-2 ring-amber-200" : ""}`}>
                              <SelectValue placeholder="Seleccionar estado…" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="none">— Ninguno —</SelectItem>
                              {US_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        ) : (
                          parentMgmtCo.State ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold uppercase tracking-wider text-slate-600">
                              {parentMgmtCo.State}
                            </span>
                          ) : (
                            <FieldValue value={null} placeholder="Sin estado" />
                          )
                        )}
                      </Field>
                    </div>

                    <Field label="Dirección de Oficina Principal">
                      {isEditing ? (
                        <Textarea
                          value={formData.Main_office_hq ?? ""}
                          onChange={(e) => handleFieldChange("Main_office_hq", e.target.value)}
                          rows={2}
                          placeholder="Dirección completa de la sede principal"
                          className={`${textareaCls} ${editedFields.has("Main_office_hq") ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
                        />
                      ) : (
                        <FieldValue value={parentMgmtCo.Main_office_hq} placeholder="Sin dirección" icon={MapPin} />
                      )}
                    </Field>
                  </div>
                </Section>

                {/* Contact */}
                <Section icon={Mail} title="Información de Contacto" accent="text-violet-700 bg-violet-50/60">
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field label="Email de Oficina">
                      {isEditing ? (
                        <ArrayEditField
                          raw={formData.Main_office_email}
                          icon={Mail}
                          placeholder="email@ejemplo.com"
                          changed={editedFields.has("Main_office_email")}
                          onChange={(val) => handleFieldChange("Main_office_email", val)}
                        />
                      ) : (
                        <ArrayDisplayField
                          raw={parentMgmtCo.Main_office_email}
                          icon={Mail}
                          linkPrefix="mailto:"
                          emptyLabel="Sin email"
                        />
                      )}
                    </Field>
                    <Field label="Teléfono de Oficina">
                      {isEditing ? (
                        <ArrayEditField
                          raw={formData.Main_office_number}
                          icon={Phone}
                          placeholder="(555) 000-0000"
                          changed={editedFields.has("Main_office_number")}
                          onChange={(val) => handleFieldChange("Main_office_number", val)}
                        />
                      ) : (
                        <ArrayDisplayField
                          raw={parentMgmtCo.Main_office_number}
                          icon={Phone}
                          linkPrefix="tel:"
                          emptyLabel="Sin teléfono"
                        />
                      )}
                    </Field>
                  </div>
                </Section>

                {/* Associated Communities */}
                <Section
                  icon={Users}
                  title="Communities Asociadas"
                  accent="text-blue-700 bg-blue-50/60"
                  badge={
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                      {associatedClientsCount}
                    </span>
                  }
                >
                  {associatedClientsCount > 0 && (
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, ID, dirección…"
                        value={communitySearch}
                        onChange={(e) => setCommunitySearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                      />
                      {communitySearch && (
                        <button onClick={() => setCommunitySearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {associatedClientsCount === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                      <Users className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">Sin communities asociadas</p>
                      <p className="text-xs text-slate-400">Las communities aparecerán aquí una vez vinculadas.</p>
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                      <Search className="h-6 w-6 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">Sin resultados para "{communitySearch}"</p>
                      <button onClick={() => setCommunitySearch("")} className="text-xs text-emerald-600 hover:underline">
                        Limpiar búsqueda
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clients.map((c) => (
                        <CommunityDetailsCard key={c.ID_Client} client={c} onViewDetails={handleOpenCommunityDetails} />
                      ))}
                    </div>
                  )}
                </Section>
              </div>

              {/* ── Sidebar ───────────────────────────────────────────────────── */}
              <div className="min-w-0 space-y-4 sm:space-y-5">

                {/* Quick summary */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5 sm:py-3.5">
                    <h3 className="text-sm font-semibold text-slate-700">Resumen rápido</h3>
                  </div>
                  <div className="divide-y divide-slate-50 px-4 sm:px-5">
                    {([
                      {
                        label: "Communities",
                        value: (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                            {associatedClientsCount}
                          </span>
                        ),
                      },
                      parentMgmtCo.Company_abbrev ? {
                        label: "Abreviatura",
                        value: (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                            {parentMgmtCo.Company_abbrev}
                          </span>
                        ),
                      } : null,
                      parentMgmtCo.State ? {
                        label: "Estado",
                        value: (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                            {parentMgmtCo.State}
                          </span>
                        ),
                      } : null,
                      parentMgmtCo.podio_item_id ? {
                        label: "Podio ID",
                        value: (
                          <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 font-mono text-[11px] text-violet-700">
                            {parentMgmtCo.podio_item_id}
                          </span>
                        ),
                      } : null,
                    ] as const).filter(Boolean).map((item: any) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-slate-500">{item.label}</span>
                        {item.value}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <ParentCompanyTimelineTab pmcId={parentMgmtCoId} />
              </div>
            </div>
          </div>

        </main>
      </div>

      <DeleteParentDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={parentMgmtCo}
        onDeleted={() => router.push("/clients")}
      />
    </div>
  )
}