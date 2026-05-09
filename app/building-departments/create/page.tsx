"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  ArrowLeft, Save, Loader2, Landmark, MapPin, Mail, Phone,
  Globe, Lock, User, ClipboardList, ShieldCheck, X, Plus, Eye, EyeOff,
} from "lucide-react"
import { useTranslations } from "@/components/providers/LocaleProvider"

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, iconBg, iconColor, title, children,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string
  title: string; children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
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

const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400/30 transition-colors"

function ArrayEditField({ values, icon: Icon, placeholder, onChange, type = "text" }: {
  values: string[]; icon: React.ElementType; placeholder: string
  onChange: (v: string[]) => void; type?: string
}) {
  const items = values.length ? values : [""]
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type={type} value={item} placeholder={placeholder}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n) }}
            className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-colors"
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
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <Plus className="h-3 w-3" /> {placeholder.includes("@") ? "Add another" : "Add another"}
      </button>
    </div>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  City_BldgDept:    string
  Location:         string
  Office_Email:     string[]
  Phone:            string[]
  Portal_Log_In:    string
  PW:               string
  Link:             string
  Notes_Inspectors: string
}

const clean = (s: string) => s.trim().replace(/\s+/g, " ")

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateBuildingDeptPage() {
  const router = useRouter()
  const t = useTranslations("buildingDepartments")
  const { hasPermission } = usePermissions()
  const [user, setUser]           = useState<any>(null)
  const [syncPodio, setSyncPodio] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPW, setShowPW] = useState(false)

  const [form, setForm] = useState<FormState>({
    City_BldgDept:    "",
    Location:         "",
    Office_Email:     [""],
    Phone:            [""],
    Portal_Log_In:    "",
    PW:               "",
    Link:             "",
    Notes_Inspectors: "",
  })

  const setField = (k: keyof FormState, v: any) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const canSubmit = useMemo(() =>
    clean(form.City_BldgDept).length > 0 && !submitting,
    [form.City_BldgDept, submitting]
  )

  const cleanEmails = () => form.Office_Email.filter((e) => e.trim())
  const cleanPhones = () => form.Phone.filter((p) => p.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)

    try {
      const payload = {
        City_BldgDept:    clean(form.City_BldgDept)    || null,
        Location:         clean(form.Location)          || null,
        Office_Email:     cleanEmails().length ? cleanEmails() : null,
        Phone:            cleanPhones().length ? cleanPhones() : null,
        Portal_Log_In:    clean(form.Portal_Log_In)    || null,
        PW:               form.PW.trim()                || null,
        Link:             clean(form.Link)              || null,
        Notes_Inspectors: form.Notes_Inspectors.trim() || null,
      }

      const res = await apiFetch(`/api/bldg_dept?sync_podio=${syncPodio}`, {
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
      const newId = created?.ID_BldgDept

      toast({ title: t("form_toastCreated"), description: t("form_toastCreatedDesc") })
      router.push(newId ? `/building-departments/${newId}` : "/building-departments")
    } catch (err: any) {
      toast({ title: t("form_toastError"), description: err?.message ?? t("form_toastCreateError"), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  if (!hasPermission("bldg_dept:create")) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">{t("bd_accessDenied")}</h1>
            <p className="text-slate-500 max-w-md mb-8">
              {t("form_accessDeniedCreate")}
            </p>
            <Button onClick={() => router.push("/building-departments")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold">
              {t("form_btnReturnList")}
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
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/building-departments")}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 sm:flex">
                    <Landmark className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-slate-900 leading-none sm:text-lg">{t("form_titleCreate")}</h1>
                    <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">{t("form_subtitle")}</p>
                  </div>
                </div>
              </div>

              <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                {/* Podio toggle */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:border-blue-200 transition-colors sm:px-3">
                  <div
                    className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${syncPodio ? "bg-blue-500" : "bg-slate-200"}`}
                    onClick={() => setSyncPodio((v) => !v)}
                  >
                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncPodio ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="hidden sm:inline">{t("form_syncPodio")}</span>
                </label>

                <Button type="button" variant="outline" size="sm"
                  onClick={() => router.push("/building-departments")}
                  disabled={submitting} className="hidden gap-1.5 text-xs border-slate-200 sm:flex">
                  <X className="h-3.5 w-3.5" /> {t("form_btnCancel")}
                </Button>

                <Button type="submit" form="create-bldg-form" size="sm"
                  disabled={!canSubmit}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs">
                  {submitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">{t("form_creating")}</span></>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("form_btnCreate")}</span><span className="sm:hidden">{t("form_btnCreateShort")}</span></>
                  )}
                </Button>
              </div>
            </div>

            {syncPodio && (
              <div className="flex items-center gap-2 border-t border-blue-100 bg-blue-50 px-4 py-2 sm:px-6">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-xs font-medium text-blue-700">{t("form_podioEnabled")}</p>
              </div>
            )}
          </div>

          {/* ── Form ── */}
          <form id="create-bldg-form" onSubmit={handleSubmit}>
            <div className="mx-auto max-w-4xl space-y-4 p-4 pb-10 sm:space-y-5 sm:p-6 sm:pb-12">

              {/* Location info */}
              <SectionCard icon={Landmark} iconBg="bg-blue-50" iconColor="text-blue-600" title={t("form_secLocation")}>
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <div>
                    <FieldLabel htmlFor="City_BldgDept" required>{t("form_labelCity")}</FieldLabel>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="City_BldgDept" required
                        value={form.City_BldgDept}
                        onChange={(e) => setField("City_BldgDept", e.target.value)}
                        placeholder={t("form_phCity")}
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="Location">{t("form_labelLocation")}</FieldLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Location"
                        value={form.Location}
                        onChange={(e) => setField("Location", e.target.value)}
                        placeholder={t("form_phLocation")}
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Contact */}
              <SectionCard icon={Mail} iconBg="bg-emerald-50" iconColor="text-emerald-600" title={t("form_secContact")}>
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <div>
                    <FieldLabel>{t("form_labelEmail")}</FieldLabel>
                    <ArrayEditField
                      values={form.Office_Email}
                      icon={Mail}
                      placeholder={t("form_phEmail")}
                      type="email"
                      onChange={(v) => setField("Office_Email", v)}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t("form_labelPhone")}</FieldLabel>
                    <ArrayEditField
                      values={form.Phone}
                      icon={Phone}
                      placeholder={t("form_phPhone")}
                      type="tel"
                      onChange={(v) => setField("Phone", v)}
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Portal access */}
              <SectionCard icon={Globe} iconBg="bg-violet-50" iconColor="text-violet-600" title={t("form_secPortal")}>
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
                  <div className="sm:col-span-2 md:col-span-3">
                    <FieldLabel htmlFor="Link">{t("form_labelPortalUrl")}</FieldLabel>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Link"
                        value={form.Link}
                        onChange={(e) => setField("Link", e.target.value)}
                        placeholder={t("form_phPortalUrl")}
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="Portal_Log_In">{t("form_labelUsername")}</FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="Portal_Log_In"
                        value={form.Portal_Log_In}
                        onChange={(e) => setField("Portal_Log_In", e.target.value)}
                        placeholder={t("form_phUsername")}
                        className={`pl-9 ${inputCls}`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="PW">{t("form_labelPassword")}</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="PW"
                        type={showPW ? "text" : "password"}
                        value={form.PW}
                        onChange={(e) => setField("PW", e.target.value)}
                        placeholder={t("form_phPassword")}
                        className={`pl-9 pr-9 ${inputCls}`}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPW((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPW ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Notes */}
              <SectionCard icon={ClipboardList} iconBg="bg-slate-100" iconColor="text-slate-500" title={t("form_secNotes")}>
                <Textarea
                  value={form.Notes_Inspectors}
                  onChange={(e) => setField("Notes_Inspectors", e.target.value)}
                  placeholder={t("form_phNotes")}
                  rows={4}
                  className={`resize-none ${inputCls}`}
                  disabled={submitting}
                />
              </SectionCard>

              {/* Bottom bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 sm:py-4">
                <p className="hidden text-xs text-slate-400 sm:block">
                  {canSubmit
                    ? t("form_statusReady")
                    : <span className="text-amber-600">{t("form_statusRequired")}</span>
                  }
                </p>
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => router.push("/building-departments")}
                    disabled={submitting} className="text-xs border-slate-200">
                    {t("form_btnCancel")}
                  </Button>
                  <Button type="submit" size="sm" disabled={!canSubmit}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs">
                    {submitting
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("form_creating")}</>
                      : <><Save className="h-3.5 w-3.5" /> {t("form_btnCreate")}</>
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
