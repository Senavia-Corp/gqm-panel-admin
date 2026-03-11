"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import {
  Plus, Search, ChevronLeft, ChevronRight, Eye, Trash2,
  Building2, Hash, MapPin, Mail, Phone, ExternalLink,
  AlertCircle, RefreshCw, Users, X, Loader2,
  ShieldCheck, Tag, Zap, ZapOff,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParentMgmtCo {
  ID_Community_Tracking: string
  Property_mgmt_co: string | null
  Company_abbrev: string | null
  Main_office_hq: string | null
  Main_office_email: string | null
  Main_office_number: string | null
  State: string | null
  podio_item_id: string | null
  clients?: unknown[]
  managers?: unknown[]
}

interface CommunityRow {
  ID_Client: string
  Client_Community: string | null
  Address: string | null
  Email_Address: string[] | string | null
  Phone_Number: string[] | string | null
  Client_Status: string | null
  Compliance_Partner: string | null
  ID_Community_Tracking: string | null
  podio_item_id: string | null
}

type MainTab = "companies" | "communities"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArrayField(raw: string | string[] | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
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

function useDebounce<T>(value: T, ms = 350): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

// ─── Shared small UI ─────────────────────────────────────────────────────────

function MultiValueCell({ values, icon: Icon, fallback, linkPrefix }: {
  values: string[]; icon: React.ElementType; fallback: string; linkPrefix?: string
}) {
  if (!values.length) return (
    <span className="flex items-center gap-1 text-xs italic text-slate-300">
      <Icon className="h-3 w-3 flex-shrink-0" />{fallback}
    </span>
  )
  return (
    <div className="flex flex-col gap-0.5">
      {values.map((v, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          <Icon className="h-3 w-3 flex-shrink-0 text-slate-400" />
          {linkPrefix ? (
            <a href={`${linkPrefix}${v}`} className="truncate max-w-[180px] text-xs text-emerald-700 hover:underline" title={v}>{v}</a>
          ) : (
            <span className="truncate max-w-[180px] text-xs text-slate-700" title={v}>{v}</span>
          )}
        </span>
      ))}
    </div>
  )
}

function AbbrevBadge({ abbrev }: { abbrev: string | null }) {
  if (!abbrev) return <span className="text-xs italic text-slate-300">—</span>
  return (
    <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 tracking-wide">
      {abbrev}
    </span>
  )
}

function StateBadge({ state }: { state: string | null }) {
  if (!state) return null
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {state}
    </span>
  )
}

function CompanyAvatar({ name, abbrev }: { name: string | null; abbrev: string | null }) {
  const initials = abbrev?.slice(0, 2) ?? (name ?? "?").slice(0, 2).toUpperCase()
  const COLORS = [
    ["#ECFDF5", "#059669"], ["#EFF6FF", "#2563EB"], ["#FFF7ED", "#EA580C"],
    ["#F5F3FF", "#7C3AED"], ["#FEF2F2", "#DC2626"], ["#F0FDF4", "#16A34A"],
  ]
  const [bg, fg] = COLORS[(initials.charCodeAt(0) ?? 0) % COLORS.length]
  return (
    <div style={{ background: bg, color: fg }}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-black">
      {initials}
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs italic text-slate-300">—</span>
  const MAP: Record<string, string> = {
    active:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive:   "bg-slate-100 text-slate-500 border-slate-200",
    pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
    "on hold":  "bg-orange-100 text-orange-700 border-orange-200",
  }
  const cls = MAP[status.toLowerCase()] ?? "bg-blue-100 text-blue-700 border-blue-200"
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>
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
            : "Crear este registro en Podio simultáneamente"
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

function Pagination({ page, total, limit, onChange }: {
  page: number; total: number; limit: number; onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-800">{start}–{end}</span> of{" "}
        <span className="font-semibold text-slate-800">{total}</span> records
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1 text-xs border-slate-200"
          disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Button>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" className="gap-1 text-xs border-slate-200"
          disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Array input helper (for email/phone multi-value) ─────────────────────────

function ArrayInputField({ values, placeholder, icon: Icon, onChange }: {
  values: string[]; placeholder: string; icon: React.ElementType
  onChange: (v: string[]) => void
}) {
  const items = values.length ? values : [""]
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type="text" value={item} placeholder={placeholder}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n) }}
            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
          />
          <button type="button"
            onClick={() => { if (items.length === 1) { onChange([""]); return }; onChange(items.filter((_, i) => i !== idx)) }}
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

// ─── Create Community Modal ───────────────────────────────────────────────────

interface CreateForm {
  Client_Community: string; Address: string; Website: string
  Compliance_Partner: string; Risk_Value: string; Maintenance_Sup: string
  Client_Status: string; Services_interested_in: string
  Invoice_Collection: string; Collection_Process: string
  Payment_Collection: string; Text: string; ID_Community_Tracking: string
  Email_Address: string[]; Phone_Number: string[]
}

const EMPTY: CreateForm = {
  Client_Community: "", Address: "", Website: "", Compliance_Partner: "",
  Risk_Value: "", Maintenance_Sup: "", Client_Status: "",
  Services_interested_in: "", Invoice_Collection: "", Collection_Process: "",
  Payment_Collection: "", Text: "", ID_Community_Tracking: "",
  Email_Address: [""], Phone_Number: [""],
}

// ─── Delete Community Dialog ──────────────────────────────────────────────────

function DeleteCommunityDialog({ open, onOpenChange, community, onDeleted }: {
  open: boolean; onOpenChange: (v: boolean) => void
  community: CommunityRow | null; onDeleted: (id: string) => void
}) {
  const [syncPodio, setSyncPodio] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { if (open) setSyncPodio(false) }, [open])

  const doDelete = async () => {
    if (!community) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${community.ID_Client}?sync_podio=${syncPodio}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      onDeleted(community.ID_Client)
      onOpenChange(false)
      toast({ title: "Community deleted", description: `${community.Client_Community ?? community.ID_Client} removed` })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setDeleting(false) }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Community</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">
              {community?.Client_Community ?? community?.ID_Client}
            </span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-2">
          <PodioSyncToggle value={syncPodio} onChange={setSyncPodio} danger />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={doDelete} disabled={deleting}
            className="bg-red-600 hover:bg-red-700">
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Delete Parent Company Dialog ─────────────────────────────────────────────

function DeleteParentDialog({ open, onOpenChange, item, onDeleted }: {
  open: boolean; onOpenChange: (v: boolean) => void
  item: ParentMgmtCo | null; onDeleted: (id: string) => void
}) {
  const [syncPodio, setSyncPodio] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reset al abrir
  useEffect(() => { if (open) setSyncPodio(false) }, [open])

  const doDelete = async () => {
    if (!item) return
    setDeleting(true)
    try {
      // ✅ Pasar sync_podio como query param
      const r = await fetch(
        `/api/parent_mgmt_co/${item.ID_Community_Tracking}?sync_podio=${syncPodio}`,
        { method: "DELETE" }
      )
      if (!r.ok) throw new Error(await r.text())
      onDeleted(item.ID_Community_Tracking)
      onOpenChange(false)
      toast({
        title: "Deleted",
        description: `${item.Property_mgmt_co ?? item.ID_Community_Tracking} removed${syncPodio ? " from Podio too" : ""}`,
      })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setDeleting(false) }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Parent Management Company</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">
              {item?.Property_mgmt_co ?? item?.ID_Community_Tracking}
            </span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ✅ Toggle de Podio — solo si el item tiene podio_item_id */}
        {item?.podio_item_id && (
          <div className="my-2">
            <PodioSyncToggle value={syncPodio} onChange={setSyncPodio} danger />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={doDelete} disabled={deleting}
            className="bg-red-600 hover:bg-red-700">
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-0">
        <div className="h-10 bg-slate-50 border-b border-slate-100" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-5 py-3.5">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className={`h-4 animate-pulse rounded bg-slate-100 ${j === 0 ? "w-20" : j === 1 ? "w-36" : "w-24"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Companies Tab ────────────────────────────────────────────────────────────

function CompaniesTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const [items, setItems]               = useState<ParentMgmtCo[]>([])
  const [search, setSearch]             = useState("")
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ParentMgmtCo | null>(null)
  const PER_PAGE = 10

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Primer fetch para saber el total real
      const first = await fetch("/api/parent_mgmt_co?page=1&limit=1", { cache: "no-store" })
      if (!first.ok) throw new Error(`Error ${first.status}`)
      const firstData = await first.json()
      const total: number = firstData.total ?? 0

      // Si hay registros, traerlos todos en una sola llamada
      const limit = total > 0 ? total : 200
      const r = await fetch(`/api/parent_mgmt_co?page=1&limit=${limit}`, { cache: "no-store" })
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const d = await r.json()
      setItems(d.results ?? [])
    } catch (e: any) {
      setError(e?.message ?? "Failed to load")
      toast({ title: "Error", description: e?.message, variant: "destructive" })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase(); if (!q) return items
    return items.filter((x) =>
      [x.Property_mgmt_co, x.Company_abbrev, x.ID_Community_Tracking, x.Main_office_hq, x.State]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    )
  }, [items, search])

  useEffect(() => { setPage(1) }, [search])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) return <TableSkeleton cols={7} />

  if (error) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm font-medium text-red-600">{error}</p>
      <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, state…"
            className="pl-9 text-sm border-slate-200 focus:border-emerald-400" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={() => router.push("/clients/create")}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {[
                { icon: Hash,         label: "ID" },
                { icon: Building2,    label: "Company" },
                { icon: MapPin,       label: "HQ Address" },
                { icon: Mail,         label: "Email" },
                { icon: Phone,        label: "Phone" },
                { icon: ExternalLink, label: "Podio" },
              ].map(({ icon: Icon, label }) => (
                <th key={label} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:pl-5">
                  <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span>
                </th>
              ))}
              <th className="py-3 pl-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map((row) => {
              const emails = parseArrayField(row.Main_office_email)
              const phones = parseArrayField(row.Main_office_number)
              return (
                <tr key={row.ID_Community_Tracking} className="group transition-colors hover:bg-slate-50/60">
                  <td className="py-3.5 pl-5 pr-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-500">
                      {row.ID_Community_Tracking}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <CompanyAvatar name={row.Property_mgmt_co} abbrev={row.Company_abbrev} />
                      <div className="min-w-0">
                        <p className="max-w-[150px] truncate text-sm font-semibold text-slate-800">
                          {row.Property_mgmt_co ?? <span className="font-normal italic text-slate-300">Unnamed</span>}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <AbbrevBadge abbrev={row.Company_abbrev} />
                          {row.State && <StateBadge state={row.State} />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[180px] px-3 py-3.5">
                    {row.Main_office_hq ? (
                      <span className="flex items-start gap-1 text-xs text-slate-600">
                        <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
                        <span className="line-clamp-2">{row.Main_office_hq}</span>
                      </span>
                    ) : <span className="text-xs italic text-slate-300">No address</span>}
                  </td>
                  <td className="px-3 py-3.5">
                    <MultiValueCell values={emails} icon={Mail} fallback="No email" linkPrefix="mailto:" />
                  </td>
                  <td className="px-3 py-3.5">
                    <MultiValueCell values={phones} icon={Phone} fallback="No phone" linkPrefix="tel:" />
                  </td>
                  <td className="px-3 py-3.5">
                    {row.podio_item_id ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700">
                        <ExternalLink className="h-2.5 w-2.5" />{row.podio_item_id}
                      </span>
                    ) : <span className="text-xs italic text-slate-300">—</span>}
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 rounded-lg bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                        onClick={() => router.push(`/clients/${row.ID_Community_Tracking}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 rounded-lg bg-slate-800 text-white shadow-sm transition-colors hover:bg-red-600"
                        onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="py-16 text-center">
                <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  {search ? `No results for "${search}"` : "No companies yet"}
                </p>
                {search && (
                  <button onClick={() => setSearch("")} className="mt-1 text-xs text-emerald-600 hover:underline">Clear search</button>
                )}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={filtered.length} limit={PER_PAGE} onChange={setPage} />

      <DeleteParentDialog
        open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        item={deleteTarget}
        onDeleted={(id) => { setItems((p) => p.filter((x) => x.ID_Community_Tracking !== id)); setDeleteTarget(null) }}
      />
    </div>
  )
}

// ─── Communities Tab ──────────────────────────────────────────────────────────

function CommunitiesTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const PER_PAGE = 20
  const [rows, setRows]                 = useState<CommunityRow[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState("")
  const dSearch                         = useDebounce(search, 350)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CommunityRow | null>(null)
  const abortRef                        = useRef<AbortController | null>(null)

  const fetchPage = useCallback(async (p: number, q: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) })
      if (q) params.set("q", q)
      const res = await fetch(`/api/clients/table?${params}`, {
        cache: "no-store", signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setRows(data.results ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? "Failed to load")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPage(page, dSearch) }, [page, dSearch, fetchPage])
  useEffect(() => { setPage(1) }, [dSearch])

  const handleDeleted = (id: string) => {
    setRows((p) => p.filter((r) => r.ID_Client !== id))
    setTotal((t) => t - 1)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Global search: name, ID, address, status, compliance…"
            className="pl-9 text-sm border-slate-200 focus:border-emerald-400" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={() => router.push("/communities/create")}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex-shrink-0">
          <Plus className="h-4 w-4" /> New Community
        </Button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton cols={9} /> : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchPage(page, dSearch)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {[
                  { icon: Hash,        label: "ID" },
                  { icon: Users,       label: "Community" },
                  { icon: MapPin,      label: "Address" },
                  { icon: ShieldCheck, label: "Status" },
                  { icon: Tag,         label: "Compliance" },
                  { icon: Mail,        label: "Email" },
                  { icon: Phone,       label: "Phone" },
                  { icon: Building2,   label: "Parent Co." },
                ].map(({ icon: Icon, label }) => (
                  <th key={label} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:pl-5">
                    <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span>
                  </th>
                ))}
                <th className="py-3 pl-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => {
                const emails = parseArrayField(row.Email_Address)
                const phones = parseArrayField(row.Phone_Number)
                return (
                  <tr key={row.ID_Client} className="group transition-colors hover:bg-slate-50/60">
                    <td className="py-3.5 pl-5 pr-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-500">
                        {row.ID_Client}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="max-w-[160px] truncate text-sm font-semibold text-slate-800">
                        {row.Client_Community ?? <span className="font-normal italic text-slate-300">Unnamed</span>}
                      </p>
                    </td>
                    <td className="max-w-[160px] px-3 py-3.5">
                      {row.Address ? (
                        <span className="flex items-start gap-1 text-xs text-slate-600">
                          <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{row.Address}</span>
                        </span>
                      ) : <span className="text-xs italic text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={row.Client_Status} />
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-xs text-slate-600">
                        {row.Compliance_Partner ?? <span className="italic text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <MultiValueCell values={emails} icon={Mail} fallback="—" linkPrefix="mailto:" />
                    </td>
                    <td className="px-3 py-3.5">
                      <MultiValueCell values={phones} icon={Phone} fallback="—" linkPrefix="tel:" />
                    </td>
                    <td className="px-3 py-3.5">
                      {row.ID_Community_Tracking ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                          {row.ID_Community_Tracking}
                        </span>
                      ) : <span className="text-xs italic text-slate-300">—</span>}
                    </td>
                    <td className="py-3.5 pl-3 pr-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 rounded-lg bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                          onClick={() => router.push(`/communities/${row.ID_Client}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 rounded-lg bg-slate-800 text-white shadow-sm transition-colors hover:bg-red-600"
                          onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-16 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    {dSearch ? `No results for "${dSearch}"` : "No communities yet"}
                  </p>
                  {dSearch && (
                    <button onClick={() => setSearch("")} className="mt-1 text-xs text-emerald-600 hover:underline">
                      Clear search
                    </button>
                  )}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <Pagination page={page} total={total} limit={PER_PAGE} onChange={setPage} />
      )}

      <DeleteCommunityDialog
        open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        community={deleteTarget} onDeleted={handleDeleted}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const router = useRouter()
  const [user, setUser]           = useState<any>(null)
  const [activeTab, setActiveTab] = useState<MainTab>("companies")

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky header + tabs ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3 px-6 pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Client Management</h1>
                <p className="text-xs text-slate-500">Parent management companies & communities</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="mt-3 flex px-6">
              {(
                [
                  { id: "companies"   as MainTab, icon: Building2, label: "Parent Companies" },
                  { id: "communities" as MainTab, icon: Users,     label: "Communities"       },
                ] as const
              ).map(({ id, icon: Icon, label }) => {
                const on = activeTab === id
                return (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors
                      ${on
                        ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600"
                        : "text-slate-500 hover:text-slate-700"
                      }`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div className="p-6">
            {activeTab === "companies"   && <CompaniesTab   router={router} />}
            {activeTab === "communities" && <CommunitiesTab router={router} />}
          </div>
        </main>
      </div>
    </div>
  )
}