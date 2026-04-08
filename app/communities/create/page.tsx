"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"
import {
  ArrowLeft, Save, Loader2, Users, MapPin, Mail, Phone,
  Globe, ShieldCheck, Plus, X, Building2, FileText,
  CreditCard, Search, ChevronRight, ExternalLink, Shield
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParentMgmtCo {
  ID_Community_Tracking: string
  Property_mgmt_co: string | null
  Company_abbrev: string | null
  Main_office_hq: string | null
  State: string | null
  podio_item_id: string | null
}

// ─── Array input helper ───────────────────────────────────────────────────────

function ArrayInputField({ values, placeholder, icon: Icon, onChange }: {
  values: string[]
  placeholder: string
  icon: React.ElementType
  onChange: (v: string[]) => void
}) {
  const items = values.length ? values : [""]
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const n = [...items]; n[idx] = e.target.value; onChange(n)
            }}
            className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/30 transition-colors"
          />
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
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
      >
        <Plus className="h-3 w-3" /> Add another
      </button>
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({ icon: Icon, title, iconBg, iconColor, children }: {
  icon: React.ElementType
  title: string
  iconBg: string
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── Styled classes ───────────────────────────────────────────────────────────

const inputCls = "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"
const textareaCls = `${inputCls} resize-none`

// ─── Company Avatar ───────────────────────────────────────────────────────────

function CompanyAvatar({ name, abbrev }: { name: string | null; abbrev: string | null }) {
  const initials = abbrev?.slice(0, 2) ?? (name ?? "?").slice(0, 2).toUpperCase()
  const COLORS = [
    ["#ECFDF5", "#059669"], ["#EFF6FF", "#2563EB"], ["#FFF7ED", "#EA580C"],
    ["#F5F3FF", "#7C3AED"], ["#FEF2F2", "#DC2626"], ["#F0FDF4", "#16A34A"],
  ]
  const [bg, fg] = COLORS[(initials.charCodeAt(0) ?? 0) % COLORS.length]
  return (
    <div style={{ background: bg, color: fg }}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-black">
      {initials}
    </div>
  )
}

// ─── Parent Company Selector Modal ───────────────────────────────────────────

function ParentCompanySelectorModal({ open, onOpenChange, onSelect }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (company: ParentMgmtCo) => void
}) {
  const [companies, setCompanies] = useState<ParentMgmtCo[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Primer fetch para saber total, luego traer todos
      const first = await apiFetch("/api/parent_mgmt_co?page=1&limit=1", { cache: "no-store" })
      if (!first.ok) throw new Error(`Error ${first.status}`)
      const firstData = await first.json()
      const total: number = firstData.total ?? 0
      const limit = total > 0 ? total : 200

      const r = await apiFetch(`/api/parent_mgmt_co?page=1&limit=${limit}`, { cache: "no-store" })
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const d = await r.json()
      setCompanies(d.results ?? [])
    } catch (e: any) {
      setError(e?.message ?? "Failed to load companies")
    } finally { setLoading(false) }
  }, [])

  // Cargar cuando se abre el modal
  useEffect(() => {
    if (open) { setSearch(""); fetchCompanies() }
  }, [open, fetchCompanies])

  const filtered = companies.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [c.Property_mgmt_co, c.Company_abbrev, c.ID_Community_Tracking, c.State]
      .filter(Boolean).join(" ").toLowerCase().includes(q)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            Select Parent Company
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, abbrev, state…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/20"
          />
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={fetchCompanies} className="text-xs text-emerald-600 hover:underline">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {search ? `No results for "${search}"` : "No companies available"}
            </p>
          ) : (
            filtered.map((company) => (
              <button
                key={company.ID_Community_Tracking}
                onClick={() => { onSelect(company); onOpenChange(false) }}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-sm"
              >
                <CompanyAvatar name={company.Property_mgmt_co} abbrev={company.Company_abbrev} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-emerald-800">
                      {company.Property_mgmt_co ?? <span className="font-normal italic text-slate-400">Unnamed</span>}
                    </p>
                    {company.Company_abbrev && (
                      <span className="flex-shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                        {company.Company_abbrev}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{company.ID_Community_Tracking}</span>
                    {company.State && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                        {company.State}
                      </span>
                    )}
                    {company.podio_item_id && (
                      <span className="flex items-center gap-0.5 text-[10px] text-violet-500">
                        <ExternalLink className="h-2.5 w-2.5" />Podio
                      </span>
                    )}
                  </div>
                  {company.Main_office_hq && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                      {company.Main_office_hq}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </button>
            ))
          )}
        </div>

        {/* Footer count */}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-right text-xs text-slate-400">
            {filtered.length} of {companies.length} companies
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateCommunityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [syncPodio, setSyncPodio] = useState(false)
  const [parentSelectorOpen, setParentSelectorOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<ParentMgmtCo | null>(null)
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission("client:create")

  const [form, setForm] = useState({
    Client_Community:       "",
    Address:                "",
    Website:                "",
    ID_Community_Tracking:  "",
    Client_Status:          "New Client",
    Compliance_Partner:     "",
    Risk_Value:             "Low",
    Maintenance_Sup:        "",
    Payment_Collection:     "",
    Invoice_Collection:     "",
    Collection_Process:     "",
    Services_interested_in: "Rehabs",
    Text:                   "",
    Email_Address:          [""] as string[],
    Phone_Number:           [""] as string[],
  })

  const set = (field: string, value: string | string[]) =>
    setForm((p) => ({ ...p, [field]: value }))

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const handleSelectParent = (company: ParentMgmtCo) => {
    setSelectedParent(company)
    set("ID_Community_Tracking", company.ID_Community_Tracking)
  }

  const handleClearParent = () => {
    setSelectedParent(null)
    set("ID_Community_Tracking", "")
  }

  const handleSubmit = async () => {
    if (!form.Client_Community.trim()) {
      toast({ title: "Required field", description: "Community name is required.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        Client_Community:       form.Client_Community.trim()       || null,
        Address:                form.Address.trim()                 || null,
        Website:                form.Website.trim()                 || null,
        ID_Community_Tracking:  form.ID_Community_Tracking.trim()  || null,
        Client_Status:          form.Client_Status                  || null,
        Compliance_Partner:     form.Compliance_Partner.trim()      || null,
        Risk_Value:             form.Risk_Value                     || null,
        Maintenance_Sup:        form.Maintenance_Sup.trim()         || null,
        Payment_Collection:     form.Payment_Collection.trim()      || null,
        Invoice_Collection:     form.Invoice_Collection.trim()      || null,
        Collection_Process:     form.Collection_Process.trim()      || null,
        Services_interested_in: form.Services_interested_in         || null,
        Text:                   form.Text.trim()                    || null,
        Email_Address:          form.Email_Address.filter((v) => v.trim()),
        Phone_Number:           form.Phone_Number.filter((v) => v.trim()),
      }

      const res = await apiFetch(`/api/clients?sync_podio=${syncPodio}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(await res.text())

      const created = await res.json()
      toast({ title: "Community created", description: `${form.Client_Community} was created successfully.` })
      router.push(`/communities/${created.ID_Client}`)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to create community.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  )

  if (!canCreate) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 shadow-sm shadow-red-100">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Access Denied</h1>
            <p className="mt-2 max-w-sm text-slate-500">
              You do not have the <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-red-600 text-xs">client:create</code> permission required to access this resource.
            </p>
            <Button onClick={() => router.back()} variant="outline" className="mt-8 gap-2 rounded-xl group transition-all hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go Back
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
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky page header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">New Community</h1>
                    <p className="mt-0.5 text-xs text-slate-500">Fill in the details to create a new community</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Podio toggle */}
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700">
                  <div
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${syncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                    onClick={() => setSyncPodio((v) => !v)}
                  >
                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </div>
                  Sync Podio
                </label>

                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                  className="h-9 gap-2 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-9 gap-2 bg-emerald-600 text-sm hover:bg-emerald-700"
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                    : <><Save className="h-3.5 w-3.5" /> Create Community</>
                  }
                </Button>
              </div>
            </div>

            {/* Podio indicator bar */}
            {syncPodio && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-medium text-emerald-700">
                  Podio sync is enabled — this community will also be created in Podio
                </p>
              </div>
            )}
          </div>

          {/* ── Form body ── */}
          <div className="mx-auto max-w-4xl space-y-5 p-6">

            {/* ── 1. Community Information ── */}
            <Section icon={Users} title="Community Information" iconBg="bg-emerald-50" iconColor="text-emerald-600">
              <div className="grid gap-5">
                <Field label="Community Name" required>
                  <Input
                    value={form.Client_Community}
                    onChange={(e) => set("Client_Community", e.target.value)}
                    placeholder="e.g. Sunset Villas HOA"
                    className={inputCls}
                  />
                </Field>

                <Field label="Address">
                  <Textarea
                    value={form.Address}
                    onChange={(e) => set("Address", e.target.value)}
                    placeholder="Full street address"
                    rows={2}
                    className={textareaCls}
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Website">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={form.Website}
                        onChange={(e) => set("Website", e.target.value)}
                        placeholder="https://…"
                        className={`pl-8 ${inputCls}`}
                      />
                    </div>
                  </Field>

                  {/* ✅ Parent Company selector */}
                  <Field label="Parent Company" hint="Optional — link to a parent management company">
                    {selectedParent ? (
                      // Selected state: show company card with clear button
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                        <CompanyAvatar
                          name={selectedParent.Property_mgmt_co}
                          abbrev={selectedParent.Company_abbrev}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {selectedParent.Property_mgmt_co ?? "Unnamed"}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {selectedParent.ID_Community_Tracking}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearParent}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Remove parent company"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      // Empty state: button to open modal
                      <button
                        type="button"
                        onClick={() => setParentSelectorOpen(true)}
                        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-400 transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-600"
                      >
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span>Click to select a parent company…</span>
                      </button>
                    )}
                  </Field>
                </div>
              </div>
            </Section>

            {/* ── 2. Contact Information ── */}
            <Section icon={Mail} title="Contact Information" iconBg="bg-blue-50" iconColor="text-blue-600">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Email Address">
                  <ArrayInputField
                    values={form.Email_Address}
                    icon={Mail}
                    placeholder="email@example.com"
                    onChange={(v) => set("Email_Address", v)}
                  />
                </Field>

                <Field label="Phone Number">
                  <ArrayInputField
                    values={form.Phone_Number}
                    icon={Phone}
                    placeholder="(555) 000-0000"
                    onChange={(v) => set("Phone_Number", v)}
                  />
                </Field>
              </div>
            </Section>

            {/* ── 3. Status & Compliance ── */}
            <Section icon={ShieldCheck} title="Status & Compliance" iconBg="bg-violet-50" iconColor="text-violet-600">
              <div className="grid gap-5 md:grid-cols-3">
                {/* ✅ Updated status options */}
                <Field label="Client Status">
                  <Select value={form.Client_Status} onValueChange={(v) => set("Client_Status", v)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Client">New Client</SelectItem>
                      <SelectItem value="Current Client">Current Client</SelectItem>
                      <SelectItem value="No Longer a Client">No Longer a Client</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Compliance Partner">
                  <Select value={form.Compliance_Partner || "none"} onValueChange={(v) => set("Compliance_Partner", v === "none" ? "" : v)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Risk Value">
                  <Select value={form.Risk_Value} onValueChange={(v) => set("Risk_Value", v)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Low", "Medium", "High"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Maintenance Supervisor">
                  <Input
                    value={form.Maintenance_Sup}
                    onChange={(e) => set("Maintenance_Sup", e.target.value)}
                    placeholder="Supervisor name"
                    className={inputCls}
                  />
                </Field>

                <Field label="Services Interested In">
                  <Select value={form.Services_interested_in} onValueChange={(v) => set("Services_interested_in", v)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Rehabs", "Work Orders", "Paint", "Plumbing", "HVAC", "General"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* ── 4. Billing & Collections ── */}
            <Section icon={CreditCard} title="Billing & Collections" iconBg="bg-amber-50" iconColor="text-amber-600">
              <div className="grid gap-5">
                <Field label="Payment Collection">
                  <Input
                    value={form.Payment_Collection}
                    onChange={(e) => set("Payment_Collection", e.target.value)}
                    placeholder="e.g. Net 30, Check, ACH…"
                    className={inputCls}
                  />
                </Field>

                <Field label="Invoice Collection">
                  <Textarea
                    value={form.Invoice_Collection}
                    onChange={(e) => set("Invoice_Collection", e.target.value)}
                    placeholder="Describe invoice submission process…"
                    rows={2}
                    className={textareaCls}
                  />
                </Field>

                <Field label="Collection Process">
                  <Textarea
                    value={form.Collection_Process}
                    onChange={(e) => set("Collection_Process", e.target.value)}
                    placeholder="Describe collection follow-up process…"
                    rows={2}
                    className={textareaCls}
                  />
                </Field>
              </div>
            </Section>

            {/* ── 5. Notes ── */}
            <Section icon={FileText} title="Additional Notes" iconBg="bg-slate-100" iconColor="text-slate-500">
              <Field label="Notes">
                <Textarea
                  value={form.Text}
                  onChange={(e) => set("Text", e.target.value)}
                  placeholder="Any additional notes or context about this community…"
                  rows={3}
                  className={textareaCls}
                />
              </Field>
            </Section>

            {/* ── Bottom action bar ── */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <p className="text-sm text-slate-500">
                Fields marked with <span className="text-red-500">*</span> are required
              </p>
              <div className="flex items-center gap-2.5">
                <Button variant="outline" onClick={() => router.back()} disabled={saving} className="h-9 text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-9 gap-2 bg-emerald-600 text-sm hover:bg-emerald-700"
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</>
                    : <><Save className="h-3.5 w-3.5" /> Create Community</>
                  }
                </Button>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ── Parent Company Selector Modal ── */}
      <ParentCompanySelectorModal
        open={parentSelectorOpen}
        onOpenChange={setParentSelectorOpen}
        onSelect={handleSelectParent}
      />
    </div>
  )
}