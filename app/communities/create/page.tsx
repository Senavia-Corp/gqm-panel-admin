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
  ArrowLeft, Save, Loader2, Users, MapPin, Mail, Phone,
  Globe, ShieldCheck, AlertCircle, Plus, X, Building2, FileText,
  CreditCard, Wrench,
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
      <div className={`flex items-center gap-3 border-b border-slate-100 px-6 py-4`}>
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

// ─── Styled input ─────────────────────────────────────────────────────────────

const inputCls = "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"
const textareaCls = `${inputCls} resize-none`

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateCommunityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [syncPodio, setSyncPodio] = useState(false)

  const [form, setForm] = useState({
    Client_Community:       "",
    Address:                "",
    Website:                "",
    ID_Community_Tracking:  "",
    Client_Status:          "Active",
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

      const res = await fetch(`/api/clients?sync_podio=${syncPodio}`, {
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

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
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
                    <Users className="h-4.5 w-4.5 text-white" />
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

                  <Field label="Parent Company ID" hint="Optional — link to a parent management company">
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={form.ID_Community_Tracking}
                        onChange={(e) => set("ID_Community_Tracking", e.target.value)}
                        placeholder="PMC…"
                        className={`pl-8 font-mono ${inputCls}`}
                      />
                    </div>
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
                <Field label="Client Status">
                  <Select value={form.Client_Status} onValueChange={(v) => set("Client_Status", v)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Active", "Inactive", "Pending", "On Hold"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
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
    </div>
  )
}