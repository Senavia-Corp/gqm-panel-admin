"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import {
  User, Mail, Phone, MapPin, Briefcase, Shield,
  Lock, Eye, EyeOff, Pencil, Check, X, Loader2,
  Building2, IdCard, KeyRound, ChevronRight, CheckSquare, DollarSign,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfilePipelineJobs } from "./components/ProfilePipelineJobs"
import { ProfileWeeklyTasks } from "./components/ProfileWeeklyTasks"
import { ProfileCommunities } from "./components/ProfileCommunities"
import { ProfileCommissions } from "./components/ProfileCommissions"

// ─── Types ──────────────────────────────────────────────────────────────────
interface MemberProfile {
  ID_Member: string
  Member_Name: string | null
  Company_Role: string | null
  Email_Address: string
  Phone_Number: string | null
  Address: string | null
  podio_profile_id: string | null
  podio_item_id: string | null
  role?: { ID_Role: string; Role_Name?: string } | null
}

interface EditState {
  Member_Name: string
  Company_Role: string
  Email_Address: string
  Phone_Number: string
  Address: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// ─── Editable Field ──────────────────────────────────────────────────────────
function EditableField({
  label, value, fieldKey, icon: Icon, type = "text",
  editing, editValues, onChange,
}: {
  label: string
  value: string | null | undefined
  fieldKey: keyof EditState
  icon: React.ElementType
  type?: string
  editing: boolean
  editValues: EditState
  onChange: (k: keyof EditState, v: string) => void
}) {
  return (
    <div className="group relative">
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      {editing ? (
        <Input
          type={type}
          value={editValues[fieldKey]}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="border-slate-200 bg-white focus:border-emerald-400 focus:ring-emerald-400/20"
        />
      ) : (
        <p className="rounded-lg border border-transparent bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
          {value || <span className="text-slate-400 italic">Not set</span>}
        </p>
      )}
    </div>
  )
}

// ─── Password Field ──────────────────────────────────────────────────────────
function PasswordField({
  label, fieldKey, icon: Icon, editValues, onChange,
}: {
  label: string
  fieldKey: keyof EditState
  icon: React.ElementType
  editValues: EditState
  onChange: (k: keyof EditState, v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={editValues[fieldKey]}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="pr-10 border-slate-200 bg-white focus:border-emerald-400 focus:ring-emerald-400/20"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value || "—"}</p>
    </div>
  )
}

// ─── Avatar Initials ─────────────────────────────────────────────────────────
function AvatarInitials({ name }: { name: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
  return (
    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl shadow-emerald-200 text-3xl font-black text-white select-none">
      {initials || <User className="h-10 w-10" />}
      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow">
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [editingInfo, setEditingInfo] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)

  const [editValues, setEditValues] = useState<EditState>({
    Member_Name: "",
    Company_Role: "",
    Email_Address: "",
    Phone_Number: "",
    Address: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // ── Load user from localStorage ──────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("user_data")
    if (!raw) { router.push("/login"); return }
    setUser(JSON.parse(raw))
  }, [router])

  // ── Fetch profile from API ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const memberId = localStorage.getItem("user_id") ?? user?.user_id ?? user?.id ?? user?.ID_Member
    if (!memberId) { setIsLoading(false); return }

    void (async () => {
      try {
        const res = await apiFetch(`/api/members/${memberId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: MemberProfile = await res.json()
        setProfile(data)
        setEditValues({
          Member_Name: data.Member_Name ?? "",
          Company_Role: data.Company_Role ?? "",
          Email_Address: data.Email_Address ?? "",
          Phone_Number: data.Phone_Number ?? "",
          Address: data.Address ?? "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } catch (err) {
        console.error("[profile] fetch error:", err)
        toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user])

  const handleChange = (key: keyof EditState, value: string) =>
    setEditValues((prev) => ({ ...prev, [key]: value }))

  // ── Save info ─────────────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!profile) return
    setIsSaving(true)
    try {
      const payload: Record<string, string> = {
        Member_Name: editValues.Member_Name,
        Company_Role: editValues.Company_Role,
        Email_Address: editValues.Email_Address,
        Phone_Number: editValues.Phone_Number,
        Address: editValues.Address,
      }

      const res = await apiFetch(`/api/members/${profile.ID_Member}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail ?? err?.error ?? `HTTP ${res.status}`)
      }
      const updated = await res.json()
      setProfile((prev) => prev ? { ...prev, ...updated } : updated)
      setEditingInfo(false)
      toast({ title: "Profile updated", description: "Your information has been saved." })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Save password ─────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!profile) return
    if (editValues.newPassword !== editValues.confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must be identical.", variant: "destructive" })
      return
    }
    if (editValues.newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const res = await apiFetch(`/api/members/${profile.ID_Member}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Password: editValues.newPassword }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail ?? err?.error ?? `HTTP ${res.status}`)
      }
      setEditingPassword(false)
      setEditValues((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }))
      toast({ title: "Password updated", description: "Your password has been changed successfully." })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update password.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const cancelInfo = () => {
    setEditingInfo(false)
    if (profile) setEditValues((prev) => ({
      ...prev,
      Member_Name: profile.Member_Name ?? "",
      Company_Role: profile.Company_Role ?? "",
      Email_Address: profile.Email_Address ?? "",
      Phone_Number: profile.Phone_Number ?? "",
      Address: profile.Address ?? "",
    }))
  }

  const cancelPassword = () => {
    setEditingPassword(false)
    setEditValues((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }))
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50/80">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">

          {/* ── Hero banner ─────────────────────────────────────────────── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 px-8 pb-10 pt-10">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10" />
            <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-teal-400/10" />

            {isLoading ? (
              <div className="flex items-center gap-5">
                <div className="h-24 w-24 animate-pulse rounded-3xl bg-slate-700" />
                <div className="space-y-3">
                  <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-700" />
                  <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-700" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-5">
                  <AvatarInitials name={profile?.Member_Name ?? null} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">
                      Member Profile
                    </p>
                    <h1 className="text-2xl font-black text-white leading-tight">
                      {profile?.Member_Name ?? "—"}
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {profile?.Company_Role ?? "No role set"}
                    </p>
                  </div>
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-2">
                  <StatPill
                    label="Member ID"
                    value={profile?.ID_Member ?? "—"}
                    color="bg-white/5 text-white"
                  />
                  <StatPill
                    label="Role"
                    value={profile?.role?.Role_Name ?? "Member"}
                    color="bg-emerald-500/20 text-emerald-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div className="mx-auto max-w-4xl space-y-6 p-8">

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            ) : profile && (
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-2 lg:grid-cols-5 h-auto rounded-xl p-1 bg-white border border-slate-200 shadow-sm">
                  <TabsTrigger value="personal" className="py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Personal Info</TabsTrigger>
                  <TabsTrigger value="jobs" className="py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Pipeline Jobs</TabsTrigger>
                  <TabsTrigger value="tasks" className="py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Weekly Tasks</TabsTrigger>
                  <TabsTrigger value="communities" className="py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Communities</TabsTrigger>
                  <TabsTrigger value="commissions" className="py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Commissions</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-6 mt-0">
                  {/* ── Personal Information Card ─────────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                        <User className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">Personal Information</h2>
                        <p className="text-xs text-slate-400">Manage your profile details</p>
                      </div>
                    </div>
                    {!editingInfo ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingInfo(true)}
                        className="gap-1.5 border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelInfo}
                          disabled={isSaving}
                          className="gap-1.5 border-slate-200 text-slate-500"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveInfo}
                          disabled={isSaving}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                    <EditableField label="Full Name" value={profile?.Member_Name} fieldKey="Member_Name" icon={User} editing={editingInfo} editValues={editValues} onChange={handleChange} />
                    <EditableField label="Company Role" value={profile?.Company_Role} fieldKey="Company_Role" icon={Briefcase} editing={editingInfo} editValues={editValues} onChange={handleChange} />
                    <EditableField label="Email Address" value={profile?.Email_Address} fieldKey="Email_Address" icon={Mail} type="email" editing={editingInfo} editValues={editValues} onChange={handleChange} />
                    <EditableField label="Phone Number" value={profile?.Phone_Number} fieldKey="Phone_Number" icon={Phone} type="tel" editing={editingInfo} editValues={editValues} onChange={handleChange} />
                    <div className="sm:col-span-2">
                      <EditableField label="Address" value={profile?.Address} fieldKey="Address" icon={MapPin} editing={editingInfo} editValues={editValues} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* ── Password Card ─────────────────────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                        <KeyRound className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">Password & Security</h2>
                        <p className="text-xs text-slate-400">Update your login credentials</p>
                      </div>
                    </div>
                    {!editingPassword ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPassword(true)}
                        className="gap-1.5 border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700"
                      >
                        <Lock className="h-3.5 w-3.5" /> Change
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelPassword}
                          disabled={isSaving}
                          className="gap-1.5 border-slate-200 text-slate-500"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSavePassword}
                          disabled={isSaving}
                          className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Update
                        </Button>
                      </div>
                    )}
                  </div>

                  {!editingPassword ? (
                    <div className="flex items-center gap-4 px-6 py-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Password is set</p>
                        <p className="text-xs text-slate-400">Click "Change" to update your password</p>
                      </div>
                      <div className="ml-auto text-slate-300">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                      <PasswordField label="New Password" fieldKey="newPassword" icon={Lock} editValues={editValues} onChange={handleChange} />
                      <PasswordField label="Confirm Password" fieldKey="confirmPassword" icon={Shield} editValues={editValues} onChange={handleChange} />
                      {/* Strength hint */}
                      {editValues.newPassword && (
                        <div className="flex flex-col justify-end">
                          <p className="text-xs text-slate-400 mb-1.5">Strength</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  editValues.newPassword.length >= i * 3
                                    ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-amber-400" : i <= 3 ? "bg-yellow-400" : "bg-emerald-500"
                                    : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {editValues.newPassword.length < 4 ? "Weak" : editValues.newPassword.length < 8 ? "Fair" : editValues.newPassword.length < 12 ? "Good" : "Strong"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── System Info Card ──────────────────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <IdCard className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">System Information</h2>
                      <p className="text-xs text-slate-400">Read-only identifiers</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-0 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    {[
                      { label: "Member ID", value: profile?.ID_Member, icon: IdCard },
                      { label: "Podio Profile ID", value: profile?.podio_profile_id, icon: Building2 },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-3 px-6 py-4">
                        <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                          <p className="mt-0.5 truncate font-mono text-sm font-medium text-slate-700">
                            {value ?? <span className="text-slate-300 italic not-italic font-sans">—</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </TabsContent>

                <TabsContent value="jobs" className="mt-0">
                  <ProfilePipelineJobs memberId={profile.ID_Member} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                  <ProfileWeeklyTasks memberId={profile.ID_Member} />
                </TabsContent>

                <TabsContent value="communities" className="mt-0">
                  <ProfileCommunities memberId={profile.ID_Member} />
                </TabsContent>

                <TabsContent value="commissions" className="mt-0">
                  <ProfileCommissions memberId={profile.ID_Member} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}