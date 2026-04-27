"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  ArrowLeft, Plus, X, Loader2, User, Building2, Briefcase,
  Mail, Phone, Globe, MapPin, Map, ShieldCheck, GraduationCap,
  ClipboardList, Save, Star, Wrench,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  Name:                     string
  Organization:             string
  Email_Address:            string[]
  Phone_Number:             string[]
  Organization_Website:     string
  Address:                  string
  Status:                   string
  Score:                    string
  Gqm_compliance:           string
  Gqm_best_service_training:string
  Specialty:                string
  Notes:                    string
  Coverage_Area:            string[]
}

const COVERAGE_AREA_OPTIONS = [
  "Dade County", "Broward County", "Palm Beach County", "St. Lucie County",
  "Orange County", "Seminole County", "Pinellas County (St Pete)",
  "Hillsborough County (Tampa)", "Osceola County",
] as const

const clean = (s: string) => s.trim().replace(/\s+/g, " ")

// Serialize string[] → Postgres format for subcontractor model
function serializeArrayField(values: string[]): string | null {
  const clean = values.filter((v) => v.trim())
  if (!clean.length) return null
  if (clean.length === 1) return clean[0]
  return `{${clean.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",")}}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, iconBg, iconColor, title, children,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string
  title: string; children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function FieldLabel({ htmlFor, required, children }: {
  htmlFor?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </Label>
  )
}

const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"

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
          <input
            type="text" value={item} placeholder={placeholder}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n) }}
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
        <Plus className="h-3 w-3" /> {t("addAnother")}
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreateSubcontractorPage() {
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [user, setUser]           = useState<any>(null)
  const [syncPodio, setSyncPodio] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [coveragePick, setCoveragePick] = useState<string>("")

  const [form, setForm] = useState<FormState>({
    Name:                     "",
    Organization:             "",
    Email_Address:            [""],
    Phone_Number:             [""],
    Organization_Website:     "",
    Address:                  "",
    Status:                   "Active",
    Score:                    "",
    Gqm_compliance:           "N/A",
    Gqm_best_service_training:"N/A",
    Specialty:                "",
    Notes:                    "",
    Coverage_Area:            [],
  })

  const setField = (k: keyof FormState, v: any) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const canSubmit = useMemo(() =>
    clean(form.Name).length > 0 && clean(form.Organization).length > 0 && !submitting,
    [form.Name, form.Organization, submitting]
  )

  const addCoverageArea = (val?: string) => {
    const v = clean(val ?? coveragePick)
    if (!v) return
    if (form.Coverage_Area.some((x) => x.toLowerCase() === v.toLowerCase())) return
    setField("Coverage_Area", [...form.Coverage_Area, v])
    setCoveragePick("")
  }

  const removeCoverageArea = (val: string) =>
    setField("Coverage_Area", form.Coverage_Area.filter((x) => x !== val))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)

    try {
      const payload = {
        Name:                     clean(form.Name)             || null,
        Organization:             clean(form.Organization)     || null,
        Email_Address:            serializeArrayField(form.Email_Address),
        Phone_Number:             serializeArrayField(form.Phone_Number),
        Organization_Website:     clean(form.Organization_Website) || null,
        Address:                  form.Address.trim()          || null,
        Status:                   form.Status                  || null,
        Score:                    form.Score !== "" ? parseFloat(form.Score) : null,
        Gqm_compliance:           form.Gqm_compliance          || null,
        Gqm_best_service_training:form.Gqm_best_service_training || null,
        Specialty:                clean(form.Specialty)        || null,
        Coverage_Area:            form.Coverage_Area.length    ? form.Coverage_Area : null,
        Notes:                    form.Notes.trim()            || null,
      }

      const res = await apiFetch(`/api/subcontractors?sync_podio=${syncPodio}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.detail || body?.error || `Error ${res.status}`)
      }

      const created = await res.json()
      const newId   = created?.ID_Subcontractor

      toast({ title: t("toastCreated"), description: t("toastCreatedDesc") })
      router.push(newId ? `/subcontractors/${newId}` : "/subcontractors")
    } catch (err: any) {
      toast({ title: t("toastError"), description: err?.message ?? t("toastErrorDesc"), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  if (!hasPermission("subcontractor:create")) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6 group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">{t("accessDeniedTitle")}</h1>
            <p className="text-slate-500 max-w-md mb-8">
              {t("accessDeniedDesc")}
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">

          {/* ── Sticky header ─────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/subcontractors")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">{t("newSub")}</h1>
                    <p className="mt-0.5 text-xs text-slate-400">{t("requiredFields")}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Podio toggle */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-emerald-200 transition-colors">
                  <div
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${syncPodio ? "bg-emerald-500" : "bg-slate-200"}`}
                    onClick={() => setSyncPodio((v) => !v)}
                  >
                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </div>
                  {t("syncPodio")}
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/subcontractors")}
                  disabled={submitting}
                  className="gap-1.5 text-xs border-slate-200"
                >
                  <X className="h-3.5 w-3.5" /> {t("cancel")}
                </Button>

                <Button
                  type="submit"
                  form="create-subc-form"
                  size="sm"
                  disabled={!canSubmit}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                  {submitting
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("creating")}</>
                    : <><Save className="h-3.5 w-3.5" /> {t("create")}</>
                  }
                </Button>
              </div>
            </div>

            {syncPodio && (
              <div className="flex items-center gap-2 border-t border-emerald-100 bg-emerald-50 px-6 py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-medium text-emerald-700">{t("podioEnabled")}</p>
              </div>
            )}
          </div>

          {/* ── Form body ─────────────────────────────────────────────────── */}
          <form id="create-subc-form" onSubmit={handleSubmit}>
            <div className="mx-auto max-w-4xl space-y-5 p-6 pb-12">

              {/* Basic Information */}
              <SectionCard icon={Building2} iconBg="bg-emerald-50" iconColor="text-emerald-600" title={t("basicInfo")}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="Name" required>{t("name")}</FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Name" required
                        value={form.Name} onChange={(e) => setField("Name", e.target.value)}
                        placeholder="John Doe"
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="Organization" required>{t("organization")}</FieldLabel>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Organization" required
                        value={form.Organization} onChange={(e) => setField("Organization", e.target.value)}
                        placeholder="ABC Construction LLC"
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="Specialty">{t("specialty")}</FieldLabel>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Specialty"
                        value={form.Specialty} onChange={(e) => setField("Specialty", e.target.value)}
                        placeholder="Electrical, Plumbing, HVAC…"
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="Status">{t("status")}</FieldLabel>
                    <Select value={form.Status} onValueChange={(v) => setField("Status", v)} disabled={submitting}>
                      <SelectTrigger id="Status" className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Active","Inactive","Pending","Banned"].map(s =>
                          <SelectItem key={s} value={s}>{t(s.toLowerCase() as any)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel htmlFor="Address">{t("address")}</FieldLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                      <Textarea
                        id="Address"
                        value={form.Address} onChange={(e) => setField("Address", e.target.value)}
                        placeholder="123 Main St, City, State, ZIP"
                        rows={2}
                        className={`pl-9 resize-none ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Contact Information */}
              <SectionCard icon={Mail} iconBg="bg-blue-50" iconColor="text-blue-600" title={t("contactInfo")}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>{t("email")}</FieldLabel>
                    <ArrayEditField
                      values={form.Email_Address}
                      icon={Mail}
                      placeholder="email@example.com"
                      onChange={(v) => setField("Email_Address", v)}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t("phone")}</FieldLabel>
                    <ArrayEditField
                      values={form.Phone_Number}
                      icon={Phone}
                      placeholder="(555) 000-0000"
                      onChange={(v) => setField("Phone_Number", v)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel htmlFor="Organization_Website">{t("website")}</FieldLabel>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Organization_Website"
                        value={form.Organization_Website} onChange={(e) => setField("Organization_Website", e.target.value)}
                        placeholder="https://example.com"
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Coverage Area */}
              <SectionCard icon={Map} iconBg="bg-orange-50" iconColor="text-orange-600" title={t("coverageArea")}>
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Select
                      value={coveragePick || undefined}
                      onValueChange={(v) => { setCoveragePick(v); addCoverageArea(v) }}
                      disabled={submitting}
                    >
                      <SelectTrigger className={`pl-9 ${inputCls}`}>
                        <SelectValue placeholder={t("selectCounty")} />
                      </SelectTrigger>
                      <SelectContent>
                        {COVERAGE_AREA_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt} value={opt}
                            disabled={form.Coverage_Area.some(x => x.toLowerCase() === opt.toLowerCase())}
                          >
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.Coverage_Area.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.Coverage_Area.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          <MapPin className="h-3 w-3 text-slate-400" />{area}
                          <button
                            type="button"
                            onClick={() => removeCoverageArea(area)}
                            className="ml-0.5 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                            disabled={submitting}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">{t("noCoverageAreas")}</p>
                  )}
                </div>
              </SectionCard>

              {/* GQM Information */}
              <SectionCard icon={ShieldCheck} iconBg="bg-violet-50" iconColor="text-violet-600" title={t("gqmInfo")}>
                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor="Score">{t("score")}</FieldLabel>
                    <div className="relative">
                      <Star className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Score"
                        type="number" min={0} max={300}
                        value={form.Score}
                        onChange={(e) => setField("Score", e.target.value)}
                        placeholder={t("scorePlaceholder")}
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="Gqm_compliance">{t("gqmCompliance")}</FieldLabel>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Select
                        value={form.Gqm_compliance}
                        onValueChange={(v) => setField("Gqm_compliance", v)}
                        disabled={submitting}
                      >
                        <SelectTrigger id="Gqm_compliance" className={`pl-9 ${inputCls}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Yes","No","N/A"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="Gqm_best_service_training">{t("gqmTraining")}</FieldLabel>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Select
                        value={form.Gqm_best_service_training}
                        onValueChange={(v) => setField("Gqm_best_service_training", v)}
                        disabled={submitting}
                      >
                        <SelectTrigger id="Gqm_best_service_training" className={`pl-9 ${inputCls}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Yes","No","N/A"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Notes */}
              <SectionCard icon={ClipboardList} iconBg="bg-slate-100" iconColor="text-slate-500" title={t("notes")}>
                <Textarea
                  value={form.Notes}
                  onChange={(e) => setField("Notes", e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={4}
                  className={`resize-none ${inputCls}`}
                  disabled={submitting}
                />
              </SectionCard>

              {/* Bottom action bar */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                <p className="text-xs text-slate-400">
                  {canSubmit
                    ? t("readyToCreate")
                    : <span className="text-amber-600">{t("requiredWarning")}</span>
                  }
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => router.push("/subcontractors")}
                    disabled={submitting}
                    className="text-xs border-slate-200"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit" size="sm"
                    disabled={!canSubmit}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                  >
                    {submitting
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("creating")}</>
                      : <><Save className="h-3.5 w-3.5" /> {t("create")}</>
                    }
                  </Button>
                </div>
              </div>

            </div>
          </form>
        </main>
      </div>
    </div>
  )
}