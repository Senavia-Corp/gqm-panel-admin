"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "@/components/ui/use-toast"
import { DeleteSupplierDialog } from "@/components/organisms/DeleteSupplierDialog"
import type { Supplier } from "@/lib/types"
import {
  Store, ArrowLeft, Pencil, Save, X, Loader2, Trash2,
  Info, Phone, Zap, Globe, CheckCircle2, XCircle,
  ShoppingCart, ExternalLink,
} from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIALTIES = [
  "Doors", "Windows/Glazing", "Plumbing Materials", "Fencing",
  "Landscaping Supplies", "Tile/Flooring", "Stones/Masonry", "Rental Equip",
  "Electrical Materials", "HVAC Materials", "Paint Suppliers", "Roll Up Doors",
  "Kitchen Cabinets", "Roofing Materials", "Glass/Mirrors", "Construction Supplies",
  "Bathroom Supplies", "Gutters / Screens",
]

const COVERAGE_AREAS = [
  "Dade County", "Broward County", "Palm Beach County", "St. Lucie County",
  "Orange County", "Seminole County", "Pinellas County (St Pete)",
  "Hillsborough County (Tampa)", "Osceola County",
]

// ─── ComboSelect ──────────────────────────────────────────────────────────────

function ComboSelect({
  value, onChange, options, placeholder = "Select an option", allowCustom,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  allowCustom: boolean
}) {
  const isCurrentlyCustom = value !== "" && !options.includes(value)
  const [customMode, setCustomMode] = useState(isCurrentlyCustom)

  useEffect(() => {
    if (!allowCustom && customMode) {
      setCustomMode(false)
      if (!options.includes(value)) onChange("")
    }
  }, [allowCustom]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync customMode when value changes externally (e.g. cancel edit)
  useEffect(() => {
    const isCustom = value !== "" && !options.includes(value)
    setCustomMode(isCustom)
  }, [value, options])

  const selectValue = customMode ? "__custom__" : (options.includes(value) ? value : "")

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setCustomMode(true)
            onChange("")
          } else {
            setCustomMode(false)
            onChange(e.target.value)
          }
        }}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        {allowCustom && <option value="__custom__">Other (type manually)…</option>}
      </select>
      {customMode && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type custom value…"
          className="rounded-xl border-slate-200"
        />
      )}
    </div>
  )
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
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

function PodioToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
        value
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${value ? "bg-blue-500" : "bg-slate-400"}`} />
      Sync Podio: {value ? "ON" : "OFF"}
    </button>
  )
}

// ─── Linked Purchases ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
  "Completed":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Pending":     "bg-amber-100 text-amber-700 border-amber-200",
  "Cancelled":   "bg-red-100 text-red-600 border-red-200",
  "In Review":   "bg-violet-100 text-violet-700 border-violet-200",
  "Approved":    "bg-teal-100 text-teal-700 border-teal-200",
}

type LinkedPurchase = {
  ID_Purchase: string
  Description?: string | null
  Status?: string | null
  Selling_rep?: string | null
}

function LinkedPurchasesSection({ supplierId }: { supplierId: string }) {
  const [rows, setRows] = useState<LinkedPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    apiFetch(`/api/purchases?supplier_id=${encodeURIComponent(supplierId)}&limit=50`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!cancelled) setRows(Array.isArray(data.results) ? data.results : [])
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [supplierId])

  return (
    <SectionCard icon={ShoppingCart} title="Linked Purchases">
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : error ? (
        <p className="text-xs text-slate-400 text-center py-4">Could not load purchases.</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ShoppingCart className="h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">No purchases linked yet</p>
          <p className="text-xs text-slate-300">Purchases that reference this supplier will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(p => (
            <Link
              key={p.ID_Purchase}
              href={`/purchases/${p.ID_Purchase}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors group"
            >
              <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 group-hover:text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                  {p.ID_Purchase}
                </p>
                {p.Description && (
                  <p className="truncate text-[11px] text-slate-400">{p.Description}</p>
                )}
              </div>
              {p.Status && (
                <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[p.Status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {p.Status}
                </span>
              )}
              <ExternalLink className="h-3 w-3 flex-shrink-0 text-slate-300 group-hover:text-emerald-400" />
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplierDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [syncPodio, setSyncPodio] = useState(true)

  // Edit form state
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [description, setDescription] = useState("")
  const [accStatus, setAccStatus] = useState<"Active" | "Inactive">("Active")
  const [accRep, setAccRep] = useState("")
  const [speciality, setSpeciality] = useState("")
  const [coverageArea, setCoverageArea] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")

  const loadFormFromSupplier = useCallback((s: Supplier) => {
    setCompanyName(s.Company_Name ?? "")
    setWebsite(s.Company_Website ?? "")
    setDescription(s.Description ?? "")
    setAccStatus((s.Acc_Status === "Inactive" ? "Inactive" : "Active"))
    setAccRep(s.Acc_Rep ?? "")
    setSpeciality(s.Speciality ?? "")
    setCoverageArea(s.Coverage_Area ?? "")
    setEmail(s.Email_Address ?? "")
    setPhone(s.Phone_Number ?? "")
    setAddress(s.Address ?? "")
  }, [])

  const fetchSupplier = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/supplier/${id}`)
      if (!res.ok) throw new Error("Not found")
      const data: Supplier = await res.json()
      setSupplier(data)
      loadFormFromSupplier(data)
    } catch {
      toast({ title: "Error", description: "Failed to load supplier.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [id, loadFormFromSupplier])

  useEffect(() => {
    if (!localStorage.getItem("user_data")) { router.push("/login"); return }
    fetchSupplier()
  }, [fetchSupplier, router])

  const handleEdit = () => {
    if (supplier) loadFormFromSupplier(supplier)
    setEditing(true)
  }

  const handleCancelEdit = () => {
    if (supplier) loadFormFromSupplier(supplier)
    setEditing(false)
  }

  const handleSave = async () => {
    if (!companyName.trim()) {
      toast({ title: "Validation", description: "Company name is required.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const body = {
        Company_Name: companyName.trim(),
        Company_Website: website.trim() || null,
        Description: description.trim() || null,
        Acc_Status: accStatus,
        Acc_Rep: accRep.trim() || null,
        Speciality: speciality || null,
        Coverage_Area: coverageArea || null,
        Email_Address: email.trim() || null,
        Phone_Number: phone.trim() || null,
        Address: address.trim() || null,
      }
      const res = await apiFetch(`/api/supplier/${id}?sync_podio=${syncPodio}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.detail ?? errData?.error ?? `Error ${res.status}`)
      }
      setEditing(false)
      toast({ title: "Saved", description: "Supplier updated." })
      await fetchSupplier()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to save.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    const res = await apiFetch(`/api/supplier/${id}?sync_podio=${syncPodio}`, { method: "DELETE" })
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" })
      return
    }
    toast({ title: "Deleted", description: "Supplier removed." })
    router.push("/suppliers")
  }

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

  if (!supplier) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-slate-500">Supplier not found.</p>
            <Button onClick={() => router.push("/suppliers")}>Back to list</Button>
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
          <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/suppliers">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </Link>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-sm">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      {editing ? companyName || "Supplier" : (supplier.Company_Name ?? "Supplier")}
                    </h1>
                    <p className="font-mono text-xs text-slate-400">{supplier.ID_Supplier}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {editing ? (
                  <>
                    <PodioToggle value={syncPodio} onChange={setSyncPodio} />
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
                    <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5 text-xs border-slate-200">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteOpen(true)}
                      className="gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <SectionCard icon={Info} title="Basic Info">
              <div>
                <FieldLabel>Company Name</FieldLabel>
                {editing
                  ? <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="rounded-xl border-slate-200" />
                  : <ReadonlyField value={supplier.Company_Name} />
                }
              </div>
              <div>
                <FieldLabel>Website</FieldLabel>
                {editing ? (
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="rounded-xl border-slate-200 pl-9" placeholder="https://example.com" />
                  </div>
                ) : (
                  supplier.Company_Website
                    ? <a href={supplier.Company_Website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                        <Globe className="h-3.5 w-3.5" />{supplier.Company_Website}
                      </a>
                    : <ReadonlyField value={null} />
                )}
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                {editing
                  ? <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl border-slate-200 resize-none" placeholder="Brief description…" />
                  : <ReadonlyField value={supplier.Description} />
                }
              </div>
            </SectionCard>

            {/* Account */}
            <SectionCard icon={Zap} title="Account">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Account Status</FieldLabel>
                  {editing ? (
                    <div className="flex gap-2">
                      {(["Active", "Inactive"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAccStatus(s)}
                          className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                            accStatus === s
                              ? s === "Active"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-slate-300 bg-slate-100 text-slate-600"
                              : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {supplier.Acc_Status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : supplier.Acc_Status === "Inactive" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      ) : (
                        <ReadonlyField value={null} />
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel>Account Rep</FieldLabel>
                  {editing
                    ? <Input value={accRep} onChange={(e) => setAccRep(e.target.value)} className="rounded-xl border-slate-200" placeholder="Rep name" />
                    : <ReadonlyField value={supplier.Acc_Rep} />
                  }
                </div>
              </div>

              <div>
                <FieldLabel>Specialty</FieldLabel>
                {editing ? (
                  <>
                    <ComboSelect
                      value={speciality}
                      onChange={setSpeciality}
                      options={SPECIALTIES}
                      placeholder="Select a specialty…"
                      allowCustom={!syncPodio}
                    />
                    {syncPodio && (
                      <p className="mt-1.5 text-[11px] text-blue-600">Custom values are disabled when Sync Podio is ON.</p>
                    )}
                  </>
                ) : (
                  <ReadonlyField value={supplier.Speciality} />
                )}
              </div>

              <div>
                <FieldLabel>Coverage Area</FieldLabel>
                {editing ? (
                  <>
                    <ComboSelect
                      value={coverageArea}
                      onChange={setCoverageArea}
                      options={COVERAGE_AREAS}
                      placeholder="Select a coverage area…"
                      allowCustom={!syncPodio}
                    />
                    {syncPodio && (
                      <p className="mt-1.5 text-[11px] text-blue-600">Custom values are disabled when Sync Podio is ON.</p>
                    )}
                  </>
                ) : (
                  <ReadonlyField value={supplier.Coverage_Area} />
                )}
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard icon={Phone} title="Contact">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Email Address</FieldLabel>
                  {editing
                    ? <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border-slate-200" placeholder="contact@company.com" />
                    : supplier.Email_Address
                      ? <a href={`mailto:${supplier.Email_Address}`} className="text-sm text-blue-600 hover:underline">{supplier.Email_Address}</a>
                      : <ReadonlyField value={null} />
                  }
                </div>
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  {editing
                    ? <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl border-slate-200" placeholder="+1 (305) 000-0000" />
                    : <ReadonlyField value={supplier.Phone_Number} />
                  }
                </div>
              </div>
              <div>
                <FieldLabel>Address</FieldLabel>
                {editing
                  ? <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl border-slate-200" placeholder="Street address, city, state, ZIP" />
                  : <ReadonlyField value={supplier.Address} />
                }
              </div>
            </SectionCard>

            {/* Linked Purchases */}
            <LinkedPurchasesSection supplierId={supplier.ID_Supplier} />

          </div>
        </main>
      </div>

      <DeleteSupplierDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        supplierId={supplier.ID_Supplier}
        companyName={supplier.Company_Name ?? ""}
        syncPodio={syncPodio}
        onSyncPodioChange={setSyncPodio}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
