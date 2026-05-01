"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { DeleteBldgDeptDialog } from "@/components/organisms/DeleteBldgDeptDialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft, Save, Loader2, Landmark, MapPin, Mail, Phone as PhoneIcon,
  Globe, Lock, User, ClipboardList, Edit2, Trash2, ExternalLink,
  AlertCircle, RefreshCw, Briefcase, X, Plus, Link2,
  Eye, EyeOff,
} from "lucide-react"
import type { BuildingDept, BuildingDeptJob } from "@/lib/types"

// ─── Helpers ───────────────────────────────────────────────────────────────────

const asStr = (v: unknown) => (v == null ? "" : String(v))

const SKIP_PATCH = new Set(["ID_BldgDept", "podio_item_id", "jobs"])

function parseJsonArr(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === "string" && raw.trim()) return [raw.trim()]
  return []
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, iconBg, iconColor, title, children, action,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string
  title: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </Label>
  )
}

const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400/30 transition-colors"
const readonlyCls = "border-slate-100 bg-slate-50/50 text-sm text-slate-700 cursor-default"

function ArrayEditField({ values, icon: Icon, placeholder, onChange, type = "text", disabled }: {
  values: string[]; icon: React.ElementType; placeholder: string
  onChange: (v: string[]) => void; type?: string; disabled?: boolean
}) {
  const items = values.length ? values : [""]
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type={type} value={item} placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n) }}
            className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-colors disabled:opacity-60"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                if (items.length === 1) { onChange([""]); return }
                onChange(items.filter((_, i) => i !== idx))
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add another
        </button>
      )}
    </div>
  )
}

function JobStatusBadge({ status }: { status: string | null }) {
  const s = status ?? ""
  const cfg: Record<string, string> = {
    "Completed": "bg-emerald-100 text-emerald-700",
    "Invoiced": "bg-blue-100 text-blue-700",
    "PAID": "bg-violet-100 text-violet-700",
    "Paid": "bg-violet-100 text-violet-700",
    "Cancelled": "bg-red-100 text-red-700",
    "HOLD": "bg-amber-100 text-amber-700",
    "Scheduled / Work in Progress": "bg-cyan-100 text-cyan-700",
    "In Progress": "bg-cyan-100 text-cyan-700",
  }
  const cls = Object.entries(cfg).find(([k]) => s.toLowerCase().includes(k.toLowerCase()))?.[1] ?? "bg-slate-100 text-slate-600"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {s || "—"}
    </span>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BuildingDeptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { hasPermission } = usePermissions()

  const [user, setUser]         = useState<any>(null)
  const [dept, setDept]         = useState<BuildingDept | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [showPW, setShowPW]     = useState(false)
  const [syncPodio, setSyncPodio] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)

  // Form state (mirrors dept fields)
  const [form, setForm] = useState({
    City_BldgDept:    "",
    Location:         "",
    Office_Email:     [""] as string[],
    Phone:            [""] as string[],
    Portal_Log_In:    "",
    PW:               "",
    Link:             "",
    Notes_Inspectors: "",
  })

  const setField = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const fetchDept = async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch(`/api/bldg_dept/${id}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: BuildingDept = await res.json()
      setDept(data)
      // Populate form
      setForm({
        City_BldgDept:    asStr(data.City_BldgDept),
        Location:         asStr(data.Location),
        Office_Email:     parseJsonArr(data.Office_Email).length ? parseJsonArr(data.Office_Email) : [""],
        Phone:            parseJsonArr(data.Phone).length ? parseJsonArr(data.Phone) : [""],
        Portal_Log_In:    asStr(data.Portal_Log_In),
        PW:               asStr(data.PW),
        Link:             asStr(data.Link),
        Notes_Inspectors: asStr(data.Notes_Inspectors),
      })
    } catch (e: any) {
      setError(e?.message ?? "Failed to load")
    } finally { setLoading(false) }
  }

  useEffect(() => { if (user && id) fetchDept() }, [user, id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      const cleanEmails = form.Office_Email.filter((e) => e.trim())
      const cleanPhones = form.Phone.filter((p) => p.trim())

      if (!SKIP_PATCH.has("City_BldgDept"))    payload.City_BldgDept    = form.City_BldgDept.trim() || null
      payload.City_BldgDept    = form.City_BldgDept.trim() || null
      payload.Location         = form.Location.trim() || null
      payload.Office_Email     = cleanEmails.length ? cleanEmails : null
      payload.Phone            = cleanPhones.length ? cleanPhones : null
      payload.Portal_Log_In    = form.Portal_Log_In.trim() || null
      payload.PW               = form.PW.trim() || null
      payload.Link             = form.Link.trim() || null
      payload.Notes_Inspectors = form.Notes_Inspectors.trim() || null

      const res = await apiFetch(`/api/bldg_dept/${id}?sync_podio=${syncPodio}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.detail || body?.error || `Error ${res.status}`)
      }
      toast({ title: "Saved", description: "Building department updated." })
      setEditing(false)
      fetchDept()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save", variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleDelete = async (sync: boolean) => {
    const res = await apiFetch(`/api/bldg_dept/${id}?sync_podio=${sync}`, {
      method: "DELETE", cache: "no-store",
    })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    toast({ title: "Deleted", description: "Building department removed." })
    router.push("/building-departments")
  }

  const jobs: BuildingDeptJob[] = useMemo(() => (dept?.jobs ?? []) as BuildingDeptJob[], [dept])

  if (!user) return null

  // ── Loading / Error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-slate-500">Loading building department…</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !dept) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm font-medium text-red-600">{error ?? "Not found"}</p>
            <Button variant="outline" size="sm" onClick={fetchDept} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </main>
        </div>
      </div>
    )
  }

  const displayEmails = parseJsonArr(dept.Office_Email)
  const displayPhones = parseJsonArr(dept.Phone)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => router.push("/building-departments")}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 sm:flex">
                    <Landmark className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-slate-900 leading-none sm:text-lg">
                      {dept.City_BldgDept ?? dept.ID_BldgDept}
                    </h1>
                    <div className="mt-0.5 hidden items-center gap-2 sm:flex">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                        {dept.ID_BldgDept}
                      </span>
                      {dept.Location && (
                        <span className="truncate text-xs text-slate-400">{dept.Location}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                {editing && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:border-blue-200 transition-colors sm:px-3">
                    <div
                      className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${syncPodio ? "bg-blue-500" : "bg-slate-200"}`}
                      onClick={() => setSyncPodio((v) => !v)}
                    >
                      <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="hidden sm:inline">Sync Podio</span>
                  </label>
                )}

                {!editing && hasPermission("bldg_dept:delete") && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Delete</span>
                  </Button>
                )}

                {editing ? (
                  <>
                    <Button variant="outline" size="sm"
                      onClick={() => { setEditing(false); fetchDept() }}
                      disabled={saving}
                      className="gap-1.5 text-xs border-slate-200">
                      <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cancel</span>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs">
                      {saving ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">Saving…</span></>
                      ) : (
                        <><Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">Save Changes</span><span className="sm:hidden">Save</span></>
                      )}
                    </Button>
                  </>
                ) : (
                  hasPermission("bldg_dept:update") && (
                    <Button size="sm" onClick={() => setEditing(true)}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs">
                      <Edit2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Edit</span>
                    </Button>
                  )
                )}
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-2 border-t border-blue-100 bg-blue-50 px-4 py-2 sm:px-6">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-xs font-medium text-blue-700">Editing mode — changes won't be saved until you click Save Changes</p>
              </div>
            )}
          </div>

          {/* ── Content ── */}
          <div className="mx-auto max-w-5xl space-y-4 p-4 pb-10 sm:space-y-5 sm:p-6 sm:pb-12">

            {/* Location */}
            <SectionCard icon={Landmark} iconBg="bg-blue-50" iconColor="text-blue-600" title="Location Information">
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <FieldLabel htmlFor="City_BldgDept">City</FieldLabel>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="City_BldgDept"
                      value={editing ? form.City_BldgDept : asStr(dept.City_BldgDept)}
                      onChange={(e) => setField("City_BldgDept", e.target.value)}
                      readOnly={!editing}
                      className={`pl-9 ${editing ? inputCls : readonlyCls}`}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel htmlFor="Location">Location / Jurisdiction</FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="Location"
                      value={editing ? form.Location : asStr(dept.Location)}
                      onChange={(e) => setField("Location", e.target.value)}
                      readOnly={!editing}
                      className={`pl-9 ${editing ? inputCls : readonlyCls}`}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard icon={Mail} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="Contact Information">
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <FieldLabel>Office Email</FieldLabel>
                  {editing ? (
                    <ArrayEditField
                      values={form.Office_Email}
                      icon={Mail}
                      placeholder="permits@city.gov"
                      type="email"
                      onChange={(v) => setField("Office_Email", v)}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {displayEmails.length > 0 ? displayEmails.map((e) => (
                        <div key={e} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <a href={`mailto:${e}`} className="text-sm text-blue-600 hover:underline">{e}</a>
                        </div>
                      )) : <p className="text-sm text-slate-400 italic">No email registered</p>}
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  {editing ? (
                    <ArrayEditField
                      values={form.Phone}
                      icon={PhoneIcon}
                      placeholder="(305) 000-0000"
                      type="tel"
                      onChange={(v) => setField("Phone", v)}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {displayPhones.length > 0 ? displayPhones.map((p) => (
                        <div key={p} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700">{p}</span>
                        </div>
                      )) : <p className="text-sm text-slate-400 italic">No phone registered</p>}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Portal Access */}
            <SectionCard
              icon={Globe}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              title="Portal Access"
              action={
                !editing && dept.Link ? (
                  <a
                    href={dept.Link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Open Portal <ExternalLink className="h-3 w-3" />
                  </a>
                ) : undefined
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
                <div className="sm:col-span-2 md:col-span-3">
                  <FieldLabel htmlFor="Link">Portal URL</FieldLabel>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="Link"
                      value={editing ? form.Link : asStr(dept.Link)}
                      onChange={(e) => setField("Link", e.target.value)}
                      readOnly={!editing}
                      className={`pl-9 ${editing ? inputCls : readonlyCls}`}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="Portal_Log_In">Username / Login</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                    <Textarea
                      id="Portal_Log_In"
                      value={editing ? form.Portal_Log_In : asStr(dept.Portal_Log_In)}
                      onChange={(e) => setField("Portal_Log_In", e.target.value)}
                      readOnly={!editing}
                      rows={3}
                      placeholder="Login credentials…"
                      className={`pl-9 resize-none ${editing ? inputCls : readonlyCls}`}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <FieldLabel htmlFor="PW">Password</FieldLabel>
                    <button
                      type="button"
                      onClick={() => setShowPW((v) => !v)}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      {showPW ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                    <Textarea
                      id="PW"
                      value={editing ? form.PW : asStr(dept.PW)}
                      onChange={(e) => setField("PW", e.target.value)}
                      readOnly={!editing}
                      rows={3}
                      placeholder="Password…"
                      className={`pl-9 resize-none transition-all ${editing ? inputCls : readonlyCls} ${!showPW ? "blur-sm select-none" : ""}`}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Notes */}
            <SectionCard icon={ClipboardList} iconBg="bg-slate-100" iconColor="text-slate-500" title="Notes & Inspector Info">
              {editing ? (
                <Textarea
                  value={form.Notes_Inspectors}
                  onChange={(e) => setField("Notes_Inspectors", e.target.value)}
                  placeholder="Inspector names, schedules, special requirements…"
                  rows={4}
                  className={`resize-none ${inputCls}`}
                />
              ) : (
                <p className={`whitespace-pre-wrap text-sm ${dept.Notes_Inspectors ? "text-slate-700" : "italic text-slate-400"}`}>
                  {dept.Notes_Inspectors || "No notes added"}
                </p>
              )}
            </SectionCard>

            {/* Linked Jobs */}
            <SectionCard
              icon={Briefcase}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              title="Linked Jobs"
              action={
                <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${jobs.length > 0 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {jobs.length}
                </span>
              }
            >
              {jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Briefcase className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No jobs linked to this department</p>
                  <p className="text-xs text-slate-400">
                    Jobs referencing this department will appear here automatically
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-28">Job ID</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-16">Type</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Location</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-28">Assigned</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right w-16">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.ID_Jobs} className="group hover:bg-slate-50/60 transition-colors">
                          <TableCell>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                              {job.ID_Jobs}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              job.Job_type === "QID" ? "bg-blue-100 text-blue-700"
                              : job.Job_type === "PTL" ? "bg-orange-100 text-orange-700"
                              : "bg-purple-100 text-purple-700"
                            }`}>
                              {job.Job_type ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-slate-800">
                              {job.Project_name ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">{job.Project_location ?? "—"}</span>
                          </TableCell>
                          <TableCell>
                            <JobStatusBadge status={job.Job_status} />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-500">
                              {job.Date_assigned ? new Date(job.Date_assigned).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <a
                              href={`/jobs/${job.ID_Jobs}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Open job"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

          </div>
        </main>
      </div>

      <DeleteBldgDeptDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        bldgDeptId={dept.ID_BldgDept}
        cityName={dept.City_BldgDept ?? ""}
        onConfirm={handleDelete}
        defaultSyncWithPodio={true}
      />
    </div>
  )
}
