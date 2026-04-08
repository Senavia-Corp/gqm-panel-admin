"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import {
  ArrowLeft, Save, Loader2, Eye, EyeOff,
  User, Mail, Phone, MapPin, Shield, Briefcase,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"

function SectionCard({ icon: Icon, iconBg, iconColor, title, children }: {
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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}{required && <span className="ml-0.5 text-red-400">*</span>}
    </p>
  )
}

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

// ─── Password strength ─────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const checks = [
    { label: "8+ characters",    ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number",           ok: /[0-9]/.test(password) },
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateMemberPage() {
  const router  = useRouter()
  const [user, setUser]     = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    Member_Name:  "",
    Company_Role: "",
    Email_Address:"",
    Phone_Number: "",
    Address:      "",
    Password:     "",
    confirmPassword: "",
  })

  const setField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const validate = (): string | null => {
    if (!form.Member_Name.trim())   return "Full name is required"
    if (!form.Email_Address.trim()) return "Email is required"
    if (!form.Password)             return "Password is required"
    if (form.Password !== form.confirmPassword) return "Passwords do not match"
    if (form.Password.length < 8 || !/[A-Z]/.test(form.Password) || !/[0-9]/.test(form.Password))
      return "Password must be 8+ characters with one uppercase letter and one number"
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { toast({ title: err, variant: "destructive" }); return }

    setSaving(true)
    try {
      const payload: Record<string, any> = {
        Member_Name:   form.Member_Name.trim(),
        Email_Address: form.Email_Address.trim(),
        Password:      form.Password,
      }
      if (form.Company_Role.trim()) payload.Company_Role = form.Company_Role.trim()
      if (form.Phone_Number.trim()) payload.Phone_Number = form.Phone_Number.trim()
      if (form.Address.trim())      payload.Address      = form.Address.trim()

      const res = await apiFetch("/api/members", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
        cache:   "no-store",
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? `Error ${res.status}`)
      }

      const created = await res.json()
      toast({ title: "Member created", description: `${created.Member_Name ?? "New member"} was added successfully.` })
      router.push(created.ID_Member ? `/members/${created.ID_Member}` : "/members")
    } catch (e: any) {
      toast({ title: "Error creating member", description: e?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  )

  // initials preview from name
  const initials = form.Member_Name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?"

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky header ──────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/members")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  {/* Live avatar preview */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm">
                    {initials}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">
                      {form.Member_Name.trim() || <span className="italic text-slate-400 font-normal text-base">New Member</span>}
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-400">Creating new GQM member</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" onClick={() => router.push("/members")} disabled={saving} className="gap-1.5 text-xs border-slate-200">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? "Creating…" : "Create Member"}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Form content ───────────────────────────────────────────────── */}
          <div className="p-6">
            <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-3">

              {/* ── LEFT: form fields ─────────────────────────────────────── */}
              <div className="space-y-5 xl:col-span-3 lg:col-span-2">

                {/* Member Information */}
                <SectionCard icon={User} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="Member Information">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <FieldLabel required>Full Name</FieldLabel>
                      <Input
                        value={form.Member_Name}
                        onChange={e => setField("Member_Name", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. John Smith"
                      />
                    </div>
                    <div>
                      <FieldLabel>Company Role</FieldLabel>
                      <Input
                        value={form.Company_Role}
                        onChange={e => setField("Company_Role", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Account Representative"
                      />
                    </div>
                    <div>
                      <FieldLabel required>Email Address</FieldLabel>
                      <Input
                        type="email"
                        value={form.Email_Address}
                        onChange={e => setField("Email_Address", e.target.value)}
                        className={inputCls}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <FieldLabel>Phone Number</FieldLabel>
                      <Input
                        value={form.Phone_Number}
                        onChange={e => setField("Phone_Number", e.target.value)}
                        className={inputCls}
                        placeholder="(555) 000-0000"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>Address</FieldLabel>
                      <Textarea
                        value={form.Address}
                        onChange={e => setField("Address", e.target.value)}
                        className={`${inputCls} resize-none`}
                        rows={2}
                        placeholder="Full address"
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Password */}
                <SectionCard icon={Shield} iconBg="bg-slate-100" iconColor="text-slate-500" title="Password">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <FieldLabel required>Password</FieldLabel>
                      <PasswordInput
                        value={form.Password}
                        onChange={v => setField("Password", v)}
                        placeholder="New password"
                      />
                      <PasswordStrength password={form.Password} />
                    </div>
                    <div>
                      <FieldLabel required>Confirm Password</FieldLabel>
                      <PasswordInput
                        value={form.confirmPassword}
                        onChange={v => setField("confirmPassword", v)}
                        placeholder="Repeat password"
                      />
                      {form.confirmPassword && (
                        <p className={`mt-2 text-[11px] font-medium ${form.Password === form.confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                          {form.Password === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                        </p>
                      )}
                    </div>
                  </div>
                </SectionCard>

              </div>

              {/* ── RIGHT: summary card ───────────────────────────────────── */}
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Preview</p>
                  </div>

                  {/* Avatar preview */}
                  <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-slate-100">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black text-white shadow-sm">
                      {initials}
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 leading-snug">
                        {form.Member_Name.trim() || <span className="italic text-slate-400 font-normal text-sm">No name yet</span>}
                      </p>
                      {form.Company_Role && <p className="text-xs text-slate-500 mt-0.5">{form.Company_Role}</p>}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50 px-5">
                    {[
                      {
                        icon: Mail, label: "Email",
                        value: form.Email_Address || null,
                        empty: "Not set",
                      },
                      {
                        icon: Phone, label: "Phone",
                        value: form.Phone_Number || null,
                        empty: "Not set",
                      },
                      {
                        icon: MapPin, label: "Address",
                        value: form.Address || null,
                        empty: "Not set",
                      },
                      {
                        icon: Briefcase, label: "Role",
                        value: form.Company_Role || null,
                        empty: "Not set",
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
                  <p className="text-[11px] font-semibold text-amber-700 mb-1">Required fields</p>
                  <ul className="space-y-1">
                    {[
                      { label: "Full Name",    done: !!form.Member_Name.trim() },
                      { label: "Email",        done: !!form.Email_Address.trim() },
                      { label: "Password",     done: form.Password.length >= 8 && /[A-Z]/.test(form.Password) && /[0-9]/.test(form.Password) },
                      { label: "Pwd. matches", done: !!form.confirmPassword && form.Password === form.confirmPassword },
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
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Fields marked with <span className="text-red-400">*</span> are required
              </p>
              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" onClick={() => router.push("/members")} disabled={saving} className="gap-1.5 text-xs border-slate-200">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? "Creating…" : "Create Member"}
                </Button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}