"use client"

import { useEffect, useState } from "react"
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
import { toast } from "@/components/ui/use-toast"
import {
  ArrowLeft, Save, Loader2, Building2, MapPin, Mail, Phone,
  Globe, Hash, FileText, Plus, X, User,
} from "lucide-react"

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

// ─── Section card ─────────────────────────────────────────────────────────────

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

const inputCls = "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"
const textareaCls = `${inputCls} resize-none`

// ─── US States ────────────────────────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateParentCoPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    Property_mgmt_co:    "",
    Company_abbrev:      "",
    Main_office_hq:      "",
    Website:             "",
    State:               "",
    Main_office_email:   [""] as string[],
    Main_office_number:  [""] as string[],
    Notes:               "",
  })

  const set = (field: string, value: string | string[]) =>
    setForm((p) => ({ ...p, [field]: value }))

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  // Serialize array to Postgres literal or plain string
  const serializeArray = (values: string[]): string | null => {
    const clean = values.filter((v) => v.trim())
    if (!clean.length) return null
    if (clean.length === 1) return clean[0]
    return `{${clean.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",")}}`
  }

  const handleSubmit = async () => {
    if (!form.Property_mgmt_co.trim()) {
      toast({ title: "Required field", description: "Company name is required.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        Property_mgmt_co:   form.Property_mgmt_co.trim()  || null,
        Company_abbrev:     form.Company_abbrev.trim()    || null,
        Main_office_hq:     form.Main_office_hq.trim()    || null,
        Website:            form.Website.trim()            || null,
        State:              form.State                     || null,
        Main_office_email:  serializeArray(form.Main_office_email),
        Main_office_number: serializeArray(form.Main_office_number),
        Notes:              form.Notes.trim()              || null,
      }

      const res = await fetch("/api/parent_mgmt_co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(await res.text())

      const created = await res.json()
      toast({ title: "Company created", description: `${form.Property_mgmt_co} was created successfully.` })
      router.push(`/clients/${created.ID_Community_Tracking}`)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to create company.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky header ── */}
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
                    <Building2 className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">New Parent Company</h1>
                    <p className="mt-0.5 text-xs text-slate-500">Fill in the details to register a parent management company</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button variant="outline" onClick={() => router.back()} disabled={saving} className="h-9 gap-2 text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-9 gap-2 bg-emerald-600 text-sm hover:bg-emerald-700"
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                    : <><Save className="h-3.5 w-3.5" /> Create Company</>
                  }
                </Button>
              </div>
            </div>
          </div>

          {/* ── Form body ── */}
          <div className="mx-auto max-w-4xl space-y-5 p-6">

            {/* ── 1. Company Identity ── */}
            <Section icon={Building2} title="Company Identity" iconBg="bg-emerald-50" iconColor="text-emerald-600">
              <div className="grid gap-5">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Field label="Company Name" required>
                      <Input
                        value={form.Property_mgmt_co}
                        onChange={(e) => set("Property_mgmt_co", e.target.value)}
                        placeholder="e.g. Suncoast Property Management"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field label="Abbreviation" hint="Short code used as identifier">
                    <Input
                      value={form.Company_abbrev}
                      onChange={(e) => set("Company_abbrev", e.target.value.toUpperCase())}
                      placeholder="e.g. SPM"
                      className={`font-mono tracking-wider ${inputCls}`}
                      maxLength={10}
                    />
                  </Field>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="State">
                    <Select value={form.State || "none"} onValueChange={(v) => set("State", v === "none" ? "" : v)}>
                      <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="Select state…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="none">— None —</SelectItem>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

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
                </div>
              </div>
            </Section>

            {/* ── 2. Location ── */}
            <Section icon={MapPin} title="Location" iconBg="bg-blue-50" iconColor="text-blue-600">
              <Field label="Main Office HQ Address">
                <Textarea
                  value={form.Main_office_hq}
                  onChange={(e) => set("Main_office_hq", e.target.value)}
                  placeholder="Full street address of the main office"
                  rows={2}
                  className={textareaCls}
                />
              </Field>
            </Section>

            {/* ── 3. Contact ── */}
            <Section icon={Mail} title="Contact Information" iconBg="bg-violet-50" iconColor="text-violet-600">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Office Email">
                  <ArrayInputField
                    values={form.Main_office_email}
                    icon={Mail}
                    placeholder="office@company.com"
                    onChange={(v) => set("Main_office_email", v)}
                  />
                </Field>
                <Field label="Office Phone">
                  <ArrayInputField
                    values={form.Main_office_number}
                    icon={Phone}
                    placeholder="(555) 000-0000"
                    onChange={(v) => set("Main_office_number", v)}
                  />
                </Field>
              </div>
            </Section>

            {/* ── 4. Notes ── */}
            <Section icon={FileText} title="Additional Notes" iconBg="bg-slate-100" iconColor="text-slate-500">
              <Field label="Notes">
                <Textarea
                  value={form.Notes}
                  onChange={(e) => set("Notes", e.target.value)}
                  placeholder="Any additional notes about this company…"
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
                    : <><Save className="h-3.5 w-3.5" /> Create Company</>
                  }
                </Button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}