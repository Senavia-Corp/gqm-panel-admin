"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "@/components/ui/use-toast"
import { Store, ArrowLeft, Save, Loader2, Info, Phone, Zap, Globe } from "lucide-react"

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

// ─── Section card ─────────────────────────────────────────────────────────────

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  )
}

// ─── Podio Toggle ─────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateSupplierPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [syncPodio, setSyncPodio] = useState(true)

  // Form state
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

  useEffect(() => {
    if (!localStorage.getItem("user_data")) router.push("/login")
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      const res = await apiFetch(`/api/supplier?sync_podio=${syncPodio}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.detail ?? errData?.error ?? `Error ${res.status}`)
      }

      const created = await res.json()
      toast({ title: "Created", description: "Supplier created successfully." })
      router.push(`/suppliers/${created.ID_Supplier ?? ""}`)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to create supplier.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href="/suppliers">
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </Link>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
                      <Store className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-slate-900">New Supplier</h1>
                      <p className="text-xs text-slate-500">Fill in the details below</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PodioToggle value={syncPodio} onChange={setSyncPodio} />
                  <Button
                    type="submit"
                    disabled={saving}
                    size="sm"
                    className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? "Saving…" : "Save Supplier"}
                  </Button>
                </div>
              </div>

              {/* Basic Info */}
              <SectionCard icon={Info} title="Basic Info">
                <div>
                  <FieldLabel required>Company Name</FieldLabel>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Florida Tile & Stone Inc."
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <FieldLabel>Website</FieldLabel>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="rounded-xl border-slate-200 pl-9"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this supplier…"
                    rows={3}
                    className="rounded-xl border-slate-200 resize-none"
                  />
                </div>
              </SectionCard>

              {/* Account */}
              <SectionCard icon={Zap} title="Account">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Account Status</FieldLabel>
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
                  </div>
                  <div>
                    <FieldLabel>Account Rep</FieldLabel>
                    <Input
                      value={accRep}
                      onChange={(e) => setAccRep(e.target.value)}
                      placeholder="Rep name"
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Specialty</FieldLabel>
                  <ComboSelect
                    value={speciality}
                    onChange={setSpeciality}
                    options={SPECIALTIES}
                    placeholder="Select a specialty…"
                    allowCustom={!syncPodio}
                  />
                  {syncPodio && (
                    <p className="mt-1.5 text-[11px] text-blue-600">
                      Custom values are disabled when Sync Podio is ON.
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel>Coverage Area</FieldLabel>
                  <ComboSelect
                    value={coverageArea}
                    onChange={setCoverageArea}
                    options={COVERAGE_AREAS}
                    placeholder="Select a coverage area…"
                    allowCustom={!syncPodio}
                  />
                  {syncPodio && (
                    <p className="mt-1.5 text-[11px] text-blue-600">
                      Custom values are disabled when Sync Podio is ON.
                    </p>
                  )}
                </div>
              </SectionCard>

              {/* Contact */}
              <SectionCard icon={Phone} title="Contact">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Email Address</FieldLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone Number</FieldLabel>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (305) 000-0000"
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Address</FieldLabel>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, city, state, ZIP"
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </SectionCard>

            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
