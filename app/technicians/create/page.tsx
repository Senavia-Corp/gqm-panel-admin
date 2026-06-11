"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import {
  ArrowLeft, Save, Loader2, Eye, EyeOff,
  User, Mail, Phone, MapPin, Shield, Users, Wrench, ShieldCheck
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { SelectSubcontractorModal } from "@/components/organisms/SelectSubcontractorModal"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ErrorModal, useErrorModal } from "@/components/organisms/ErrorModal"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"

function SectionCard({ icon: Icon, iconBg, iconColor, title, children }: {
  icon: React.ElementType; iconBg: string; iconColor: string
  title: string; children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}{required && <span className="ml-0.5 text-red-400">*</span>}
    </p>
  )
}



// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateTechnicianPage() {
  const t = useTranslations("subcontractors")

  function PasswordInput({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder: string
  }) {
    const [show, setShow] = useState(false)
    return (
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-md border px-3 py-2 pr-10 ${inputCls}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }

  function PasswordStrength({ password }: { password: string }) {
    if (!password) return null
    const checks = [
      { label: t("techPwdLen"),    ok: password.length >= 8 },
      { label: t("techPwdUpper"), ok: /[A-Z]/.test(password) },
      { label: t("techPwdNum"),           ok: /[0-9]/.test(password) },
    ]
    const score = checks.filter(c => c.ok).length
    const bar   = ["bg-red-400", "bg-amber-400", "bg-emerald-400"][score - 1] ?? "bg-slate-200"

    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? bar : "bg-slate-100"}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {checks.map(c => (
            <span key={c.label} className={`text-[11px] font-medium ${c.ok ? "text-emerald-600" : "text-slate-400"}`}>
              {c.ok ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const router  = useRouter()
  const [user, setUser]     = useState<any>(null)
  
  const queryClient = useQueryClient()
  const { errorModal, showError, closeError } = useErrorModal()
  
  const [subcontractors, setSubcontractors] = useState<any[]>([])
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [allPerms, setAllPerms] = useState<any[]>([])

  const [form, setForm] = useState({
    Name:               "",
    Email_Address:      "",
    Phone_Number:       "",
    Location:           "",
    Type_of_technician: "Worker",
    ID_Subcontractor:   "none",
    Password:           "",
    confirmPassword:    "",
    permissions:        [] as string[],
  })

  const setField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    const parsedUser = JSON.parse(u)
    setUser(parsedUser)
    
    // Check for subId in query params
    const searchParams = new URLSearchParams(window.location.search)
    const subIdParam = searchParams.get("subId")
    
    if (parsedUser.role === "SUBCONTRACTOR" || parsedUser.user_type === "subcontractor") {
      setField("ID_Subcontractor", localStorage.getItem("user_id") || "none")
    } else if (parsedUser.role === "LEAD_TECHNICIAN" && subIdParam) {
      setField("ID_Subcontractor", subIdParam)
    }

    // Fetch subcontractors
    apiFetch("/api/subcontractors_table?limit=1000")
      .then(res => res.json())
      .then(data => {
        setSubcontractors(data.results || [])
        setLoadingSubs(false)
      })
      .catch(err => {
        console.error("Failed to load subcontractors", err)
        setLoadingSubs(false)
      })

    // Fetch permissions
    apiFetch("/api/permissions?limit=1000")
      .then(res => res.json())
      .then(data => setAllPerms(data.results || data || []))
      .catch(err => console.error("Failed to load permissions", err))
  }, [router])

  const validate = (): string | null => {
    if (!form.Name.trim())          return t("errNameReq")
    if (!form.Email_Address.trim()) return t("errEmailReq")
    if (!form.Password)             return t("errPwdReq")
    if (form.Password !== form.confirmPassword) return t("techPwdNoMatch")
    if (form.Password.length < 8 || !/[A-Z]/.test(form.Password) || !/[0-9]/.test(form.Password))
      return t("errPwdComplexity")
    return null
  }

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await apiFetch("/api/technician", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })
      
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw { 
          message: data.error || data.detail || `Error ${res.status}`, 
          detail: data.details || (typeof data.detail === 'string' ? data.detail : JSON.stringify(data)),
          status: res.status 
        }
      }
      return data
    },
    onSuccess: async (created) => {
      // Asignar permisos si hay seleccionados
      if (form.permissions.length > 0 && created.ID_Technician) {
        try {
          await Promise.all(
            form.permissions.map(permId =>
              apiFetch(`/api/technician/${created.ID_Technician}/permissions/${permId}`, { method: "POST" })
            )
          )
        } catch (e) {
          console.error("Error linking permissions", e)
          toast({ title: t("toastError"), description: "Some permissions could not be assigned", variant: "destructive" })
        }
      }

      toast({ title: t("techToastCreated"), description: t("techToastCreatedDesc", { name: created.Name ?? "New technician" }) })
      queryClient.invalidateQueries({ queryKey: ["technicians"] })
      router.push(created.ID_Technician ? `/technicians/${created.ID_Technician}` : "/subcontractors")
    },
    onError: (err: any) => {
      showError(err.message || t("techToastError"), err.detail, "/api/technician", err.status)
    }
  })

  const saving = createMutation.isPending

  const handleSubmit = async () => {
    const err = validate()
    if (err) { toast({ title: err, variant: "destructive" }); return }

    const payload: Record<string, any> = {
      Name:               form.Name.trim(),
      Email_Address:      form.Email_Address.trim(),
      Password:           form.Password,
      Type_of_technician: form.Type_of_technician,
    }
    if (form.Phone_Number.trim()) payload.Phone_Number = form.Phone_Number.trim()
    if (form.Location.trim())     payload.Location     = form.Location.trim()
    if (form.ID_Subcontractor !== "none") payload.ID_Subcontractor = form.ID_Subcontractor

    createMutation.mutate(payload)
  }

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  )

  const initials = form.Name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?"

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* ── Sticky header ──────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                <button
                  onClick={() => router.push("/subcontractors")}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm sm:h-10 sm:w-10">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-slate-900 leading-none sm:text-lg">
                      {form.Name.trim() || <span className="italic text-slate-400 font-normal">{t("techNoName")}</span>}
                    </h1>
                    <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">{t("createTechSubtitle")}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/subcontractors")} disabled={saving}
                  className="hidden gap-1.5 text-xs border-slate-200 sm:flex">
                  {t("cancel")}
                </Button>
                <Button variant="outline" onClick={() => router.push("/subcontractors")} disabled={saving}
                  size="icon" className="h-8 w-8 border-slate-200 sm:hidden">
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <Button size="sm" onClick={handleSubmit} disabled={saving}
                  className="hidden gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs sm:flex">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? t("creating") : t("createTechTitle")}
                </Button>
                <Button onClick={handleSubmit} disabled={saving} size="icon"
                  className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 sm:hidden">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Form content ───────────────────────────────────────────────── */}
          <div className="p-4 sm:p-6">
            <div className="grid gap-5 sm:gap-6 xl:grid-cols-4 lg:grid-cols-3">

              {/* ── LEFT: form fields ─────────────────────────────────────── */}
              <div className="min-w-0 space-y-4 sm:space-y-5 xl:col-span-3 lg:col-span-2">

                {/* Technician Information */}
                <SectionCard icon={User} iconBg="bg-emerald-50" iconColor="text-emerald-600" title={t("personalInfo")}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="min-w-0 md:col-span-2">
                      <FieldLabel required>{t("techFullName")}</FieldLabel>
                      <Input
                        value={form.Name}
                        onChange={e => setField("Name", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. John Smith"
                      />
                    </div>
                    <div>
                      <FieldLabel required>{t("techEmailAddress")}</FieldLabel>
                      <Input
                        type="email"
                        value={form.Email_Address}
                        onChange={e => setField("Email_Address", e.target.value)}
                        className={inputCls}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("techPhoneNumber")}</FieldLabel>
                      <Input
                        value={form.Phone_Number}
                        onChange={e => setField("Phone_Number", e.target.value)}
                        className={inputCls}
                        placeholder="(555) 000-0000"
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("techLocation")}</FieldLabel>
                      <Input
                        value={form.Location}
                        onChange={e => setField("Location", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Orlando, FL"
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("techRoleType")}</FieldLabel>
                      <Select value={form.Type_of_technician} onValueChange={v => setField("Type_of_technician", v)}>
                        <SelectTrigger className={inputCls}>
                          <SelectValue placeholder={t("techSelectType")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Worker">{t("worker")}</SelectItem>
                          <SelectItem value="Leader">{t("leader")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SectionCard>
                
                {/* Association */}
                <SectionCard icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" title={t("techAssociation")}>
                  <div className="grid gap-5">
                    <div>
                      <FieldLabel>{t("techColSub")} {(user?.role === "LEAD_TECHNICIAN" || user?.role === "SUBCONTRACTOR") ? "" : t("techOptional")}</FieldLabel>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setSubModalOpen(true)}
                          disabled={loadingSubs || user?.role === "LEAD_TECHNICIAN" || user?.role === "SUBCONTRACTOR"}
                          className={`flex-1 justify-between bg-slate-50 border-slate-200 hover:bg-slate-100 ${form.ID_Subcontractor !== "none" ? "text-slate-900" : "text-slate-400"}`}
                        >
                          <span className="truncate">
                            {form.ID_Subcontractor !== "none" 
                              ? (subcontractors.find(s => s.ID_Subcontractor === form.ID_Subcontractor)?.Name || form.ID_Subcontractor)
                              : t("techSelectSub")}
                          </span>
                          {(user?.role !== "LEAD_TECHNICIAN" && user?.role !== "SUBCONTRACTOR") && <Users className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />}
                        </Button>
                        {form.ID_Subcontractor !== "none" && user?.role !== "LEAD_TECHNICIAN" && user?.role !== "SUBCONTRACTOR" && (
                          <Button variant="ghost" onClick={() => setField("ID_Subcontractor", "none")} className="text-slate-400 hover:text-red-500">
                            {t("techClear")}
                          </Button>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {(user?.role === "LEAD_TECHNICIAN" || user?.role === "SUBCONTRACTOR")
                          ? t("techAutoAssoc")
                          : t("techAssocDesc")}
                      </p>
                    </div>
                  </div>
                </SectionCard>

                {/* Password */}
                <SectionCard icon={Shield} iconBg="bg-slate-100" iconColor="text-slate-500" title={t("authentication")}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <FieldLabel required>{t("Password")}</FieldLabel>
                      <PasswordInput
                        value={form.Password}
                        onChange={v => setField("Password", v)}
                        placeholder="New password"
                      />
                      <PasswordStrength password={form.Password} />
                    </div>
                    <div>
                      <FieldLabel required>{t("techConfirmPassword")}</FieldLabel>
                      <PasswordInput
                        value={form.confirmPassword}
                        onChange={v => setField("confirmPassword", v)}
                        placeholder="Repeat password"
                      />
                      {form.confirmPassword && (
                        <p className={`mt-2 text-[11px] font-medium ${form.Password === form.confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                          {form.Password === form.confirmPassword ? `✓ ${t("techPwdMatch")}` : `✗ ${t("techPwdNoMatch")}`}
                        </p>
                      )}
                    </div>
                  </div>
                </SectionCard>

                {/* Roles / Permissions */}
                <SectionCard icon={ShieldCheck} iconBg="bg-blue-50" iconColor="text-blue-600" title={t("permissions", { defaultValue: "Permissions & Roles" })}>
                  <div className="flex flex-col gap-3">
                    <FieldLabel>{t("assignPermissions", { defaultValue: "Assign Permissions" })}</FieldLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                      {allPerms.map(p => (
                        <label key={p.ID_Permission} className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                          <Checkbox
                            checked={form.permissions.includes(p.ID_Permission)}
                            onCheckedChange={(c) => {
                              if (c) setField("permissions", [...form.permissions, p.ID_Permission] as any)
                              else setField("permissions", (form.permissions.filter(x => x !== p.ID_Permission)) as any)
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-slate-800 leading-tight">{p.Name}</p>
                            {p.Description && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.Description}</p>}
                          </div>
                        </label>
                      ))}
                      {allPerms.length === 0 && <p className="text-xs italic text-slate-400">{t("loadingPermissions", { defaultValue: "Loading..." })}</p>}
                    </div>
                  </div>
                </SectionCard>

              </div>

              {/* ── RIGHT: summary card ───────────────────────────────────── */}
              <div className="min-w-0 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("techPreview")}</p>
                  </div>

                  {/* Avatar preview */}
                  <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-slate-100">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black text-white shadow-sm">
                      {initials}
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 leading-snug">
                        {form.Name.trim() || <span className="italic text-slate-400 font-normal text-sm">{t("techNoName")}</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{form.Type_of_technician === "Leader" ? t("leader") : t("worker")}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50 px-5">
                    {[
                      {
                        icon: Mail, label: t("email"),
                        value: form.Email_Address || null,
                        empty: t("techNotSet"),
                      },
                      {
                        icon: Phone, label: t("phone"),
                        value: form.Phone_Number || null,
                        empty: t("techNotSet"),
                      },
                      {
                        icon: MapPin, label: t("techLocation"),
                        value: form.Location || null,
                        empty: t("techNotSet"),
                      },
                      {
                        icon: Wrench, label: t("techColSub"),
                        value: form.ID_Subcontractor !== "none" ? subcontractors.find(s => s.ID_Subcontractor === form.ID_Subcontractor)?.Name : t("techIndependent"),
                        empty: t("techIndependent"),
                      },
                    ].map(({ icon: Icon, label, value, empty }) => (
                      <div key={label} className="flex items-start gap-3 py-3">
                        <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                          <p className={`text-xs mt-0.5 break-words ${value ? "text-slate-700" : "italic text-slate-300"}`}>
                            {value ?? empty}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Required fields reminder */}
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-[11px] font-semibold text-amber-700 mb-1">{t("techRequiredReminder")}</p>
                  <ul className="space-y-1">
                    {[
                      { label: t("techFullName"),    done: !!form.Name.trim() },
                      { label: t("email"),        done: !!form.Email_Address.trim() },
                      { label: t("Password"),     done: form.Password.length >= 8 && /[A-Z]/.test(form.Password) && /[0-9]/.test(form.Password) },
                      { label: t("techConfirmPassword"), done: !!form.confirmPassword && form.Password === form.confirmPassword },
                    ].map(({ label, done }) => (
                      <li key={label} className={`flex items-center gap-1.5 text-[11px] font-medium ${done ? "text-emerald-600" : "text-amber-600"}`}>
                        {done ? "✓" : "○"} {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>

          {/* ── Bottom action bar ──────────────────────────────────────────── */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                {t("techFieldsMarked")}
              </p>
              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" onClick={() => router.push("/subcontractors")} disabled={saving}
                  className="flex-1 gap-1.5 text-xs border-slate-200 sm:flex-none">
                  {t("cancel")}
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={saving}
                  className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs sm:flex-none">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? t("creating") : t("createTechTitle")}
                </Button>
              </div>
            </div>
          </div>

        </main>
      </div>

      <SelectSubcontractorModal
        open={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        onSelect={(sub) => {
          setField("ID_Subcontractor", sub.ID_Subcontractor)
          setSubModalOpen(false)
        }}
        selectedId={form.ID_Subcontractor !== "none" ? form.ID_Subcontractor : undefined}
      />
      
      <ErrorModal
        open={errorModal.open}
        onClose={closeError}
        message={errorModal.message}
        detail={errorModal.detail}
        endpoint={errorModal.endpoint}
        severity={errorModal.severity}
        statusCode={errorModal.statusCode}
      />
    </div>
  )
}
