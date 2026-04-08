"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"
import {
  ArrowLeft, Save, Loader2, Building2, MapPin, Mail, Phone,
  Globe, FileText, Plus, X, Zap, ZapOff, Shield
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
    <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type="text" value={item} placeholder={placeholder}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n) }}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all"
          />
          <button type="button"
            onClick={() => { if (items.length === 1) { onChange([""]); return }; onChange(items.filter((_, i) => i !== idx)) }}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
        <Plus className="h-3 w-3" /> Add another
      </button>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, accent, children }: {
  icon: React.ElementType
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`flex items-center gap-3 border-b border-slate-100 px-6 py-4 ${accent}`}>
        <Icon className="h-4 w-4" />
        <h2 className="text-sm font-semibold">{title}</h2>
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
      <Label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const inputCls = "rounded-xl border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition-all"
const textareaCls = `${inputCls} resize-none`

// ─── Podio Sync Toggle ────────────────────────────────────────────────────────

function PodioSyncToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 px-5 py-4 text-left transition-all duration-300 ${
        value
          ? "border-violet-400 bg-gradient-to-r from-violet-50 to-indigo-50 shadow-sm shadow-violet-100"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
      }`}
    >
      {/* Icon */}
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
        value ? "bg-violet-600 shadow-md shadow-violet-200" : "bg-slate-200"
      }`}>
        {value
          ? <Zap className="h-5 w-5 text-white" />
          : <ZapOff className="h-5 w-5 text-slate-400" />
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold transition-colors ${value ? "text-violet-800" : "text-slate-600"}`}>
          {value ? "Sincronización con Podio activada" : "Sincronizar con Podio"}
        </p>
        <p className={`mt-0.5 text-xs transition-colors ${value ? "text-violet-600" : "text-slate-400"}`}>
          {value
            ? "Este registro se creará simultáneamente en Podio"
            : "El registro se creará solo en la base de datos local"
          }
        </p>
      </div>

      {/* Toggle pill */}
      <div className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-300 ${
        value ? "bg-violet-600" : "bg-slate-300"
      }`}>
        <span className={`absolute inline-block h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${
          value ? "left-6" : "left-1"
        }`} />
      </div>
    </button>
  )
}

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
  const [syncPodio, setSyncPodio] = useState(false)
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission("parent_mgmt_co:create")

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

  const serializeArray = (values: string[]): string | null => {
    const clean = values.filter((v) => v.trim())
    if (!clean.length) return null
    if (clean.length === 1) return clean[0]
    return `{${clean.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",")}}`
  }

  const handleSubmit = async () => {
    if (!form.Property_mgmt_co.trim()) {
      toast({ title: "Campo requerido", description: "El nombre de la compañía es obligatorio.", variant: "destructive" })
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

      // ✅ Incluir sync_podio como query param
      const res = await apiFetch(`/api/parent_mgmt_co?sync_podio=${syncPodio}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(await res.text())

      const created = await res.json()
      toast({
        title: "Compañía creada",
        description: `${form.Property_mgmt_co} fue creada exitosamente${syncPodio ? " y sincronizada con Podio" : ""}.`,
      })
      router.push(`/clients/${created.ID_Community_Tracking}`)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "No se pudo crear la compañía.", variant: "destructive" })
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
              You do not have the <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-red-600 text-xs">parent_mgmt_co:create</code> permission required to access this resource.
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

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-200">
                    <Building2 className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">Nueva Compañía Padre</h1>
                    <p className="mt-0.5 text-xs text-slate-500">Completa los datos para registrar la compañía</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {syncPodio && (
                  <span className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    <Zap className="h-3 w-3" /> Podio activo
                  </span>
                )}
                <Button variant="outline" onClick={() => router.back()} disabled={saving} className="h-9 text-sm rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={saving}
                  className="h-9 gap-2 rounded-xl bg-emerald-600 text-sm hover:bg-emerald-700 shadow-sm shadow-emerald-200">
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>
                    : <><Save className="h-3.5 w-3.5" /> Crear Compañía</>
                  }
                </Button>
              </div>
            </div>
          </div>

          {/* ── Form body ── */}
          <div className="mx-auto max-w-4xl space-y-5 p-6">

            {/* ── Podio Sync ── */}
            <PodioSyncToggle value={syncPodio} onChange={setSyncPodio} />

            {/* ── 1. Identidad ── */}
            <Section icon={Building2} title="Identidad de la Compañía"
              accent="text-emerald-700 bg-emerald-50/60">
              <div className="grid gap-5">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Field label="Nombre de la Compañía" required>
                      <Input value={form.Property_mgmt_co}
                        onChange={(e) => set("Property_mgmt_co", e.target.value)}
                        placeholder="ej. Suncoast Property Management" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Abreviatura" hint="Código corto identificador">
                    <Input value={form.Company_abbrev}
                      onChange={(e) => set("Company_abbrev", e.target.value.toUpperCase())}
                      placeholder="ej. SPM" className={`font-mono tracking-wider ${inputCls}`} maxLength={10} />
                  </Field>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Estado">
                    <Select value={form.State || "none"} onValueChange={(v) => set("State", v === "none" ? "" : v)}>
                      <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="Seleccionar estado…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="none">— Ninguno —</SelectItem>
                        {US_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Sitio Web">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input value={form.Website} onChange={(e) => set("Website", e.target.value)}
                        placeholder="https://…" className={`pl-8 ${inputCls}`} />
                    </div>
                  </Field>
                </div>
              </div>
            </Section>

            {/* ── 2. Ubicación ── */}
            <Section icon={MapPin} title="Ubicación" accent="text-blue-700 bg-blue-50/60">
              <Field label="Dirección de la Oficina Principal">
                <Textarea value={form.Main_office_hq}
                  onChange={(e) => set("Main_office_hq", e.target.value)}
                  placeholder="Dirección completa de la sede principal" rows={2} className={textareaCls} />
              </Field>
            </Section>

            {/* ── 3. Contacto ── */}
            <Section icon={Mail} title="Información de Contacto" accent="text-violet-700 bg-violet-50/60">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Email de Oficina">
                  <ArrayInputField values={form.Main_office_email} icon={Mail}
                    placeholder="oficina@compañia.com"
                    onChange={(v) => set("Main_office_email", v)} />
                </Field>
                <Field label="Teléfono de Oficina">
                  <ArrayInputField values={form.Main_office_number} icon={Phone}
                    placeholder="(555) 000-0000"
                    onChange={(v) => set("Main_office_number", v)} />
                </Field>
              </div>
            </Section>

            {/* ── 4. Notas ── */}
            <Section icon={FileText} title="Notas Adicionales" accent="text-slate-600 bg-slate-50">
              <Field label="Notas">
                <Textarea value={form.Notes}
                  onChange={(e) => set("Notes", e.target.value)}
                  placeholder="Cualquier información adicional sobre esta compañía…"
                  rows={3} className={textareaCls} />
              </Field>
            </Section>

            {/* ── Bottom bar ── */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <p className="text-sm text-slate-400">
                Los campos con <span className="text-red-400">*</span> son obligatorios
              </p>
              <div className="flex items-center gap-2.5">
                <Button variant="outline" onClick={() => router.back()} disabled={saving} className="h-9 rounded-xl text-sm">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={saving}
                  className="h-9 gap-2 rounded-xl bg-emerald-600 text-sm hover:bg-emerald-700">
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creando…</>
                    : <><Save className="h-3.5 w-3.5" /> Crear Compañía</>
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