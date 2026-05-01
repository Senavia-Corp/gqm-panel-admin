"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "@/components/ui/use-toast"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { TimelineItem } from "@/components/molecules/TimelineItem"
import { ArrowLeft, Save, Eye, EyeOff, ShieldCheck, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Technician } from "@/lib/types"
import { TechnicianJobsSection } from "@/components/organisms/TechnicianJobsSection"

export default function TechnicianDetailsPage({ params }: { params: { id: string; technicianId: string } }) {
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<Partial<Technician>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  const fetchTechnician = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await apiFetch(`/api/technician/${params.technicianId}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setTechnician(data)
      setFormData(data)
    } catch (e: any) {
      setLoadError(e.message || t("failedToLoadTech"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
    fetchTechnician()
  }, [params.technicianId, router])

  const handleFieldChange = (field: keyof Technician, value: any) => {
    setEditedFields(new Set(editedFields.add(field)))
    setFormData({ ...formData, [field]: value })
    setIsEditing(true)
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 8) {
      errors.push(t("pwdLength"))
    }
    if (!/\d/.test(password)) {
      errors.push(t("pwdNumber"))
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t("pwdCapital"))
    }
    return errors
  }

  const handlePasswordChange = () => {
    const errors: string[] = []

    if (passwordForm.oldPassword !== technician?.Password) {
      errors.push(t("currentPwdIncorrect"))
    }

    const validationErrors = validatePassword(passwordForm.newPassword)
    errors.push(...validationErrors)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.push(t("newPwdMatch"))
    }

    if (errors.length > 0) {
      setPasswordErrors(errors)
      return
    }

    handleFieldChange("Password", passwordForm.newPassword)
    setPasswordErrors([])
    setIsChangingPassword(false)
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" })
  }

  const handleSaveChanges = async () => {
    try {
      setSaving(true)
      const res = await apiFetch(`/api/technician/${params.technicianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updated = await res.json()
      setTechnician(updated)
      setIsEditing(false)
      setEditedFields(new Set())
      toast({ title: t("saved"), description: t("techUpdated") })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  if (!hasPermission("subcontractor:read")) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6 transition-transform hover:scale-110">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">{t("accessDenied")}</h1>
            <p className="text-slate-500 max-w-md mb-8">
              {t("accessDeniedTechViewDesc")}
            </p>
            <Button onClick={() => router.push(`/subcontractors/${params.id}?tab=technicians`)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold shadow-lg">
              {t("returnTechs")}
            </Button>
          </main>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="mt-4 text-sm font-medium text-slate-500 font-mono italic">{t("loadingTechDetails")}</p>
          </main>
        </div>
      </div>
    )
  }

  if (!technician) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Button variant="ghost" onClick={() => router.push(`/subcontractors/${params.id}?tab=technicians`)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t("backTechs")}
            </Button>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
              <div className="flex items-center gap-3 font-mono">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h2 className="font-semibold text-red-800">{t("techNotFound")}</h2>
              </div>
              <p className="mt-2 text-sm text-red-600 italic font-mono">{loadError || t("techMightHaveBeenDeleted")}</p>
              <Button onClick={fetchTechnician} className="mt-4 gap-2" variant="outline">
                <RefreshCw className="h-4 w-4" /> {t("retry")}
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/subcontractors/${params.id}?tab=technicians`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backTechs")}
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={technician.Avatar || "/placeholder.svg"} alt={technician.Name} />
                    <AvatarFallback className="bg-gqm-yellow text-gqm-green-dark text-2xl font-semibold">
                      {(technician.Name || t("unnamed")).split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-bold">{technician.Name || t("unnamed")}</h1>
                    <p className="text-muted-foreground font-mono">{technician.ID_Technician}</p>
                  </div>
                </div>
                {isEditing && hasPermission("subcontractor:update") && (
                  <Button onClick={handleSaveChanges} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? t("saving") : t("saveChanges")}
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="mb-6 text-xl font-semibold">{t("personalInfo")}</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block font-semibold">{t("name")}</Label>
                      <Input
                        value={formData.Name || ""}
                        onChange={(e) => handleFieldChange("Name", e.target.value)}
                        className={editedFields.has("Name") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block font-semibold">{t("techType")}</Label>
                      <Select value={formData.Type_of_technician || ""} onValueChange={(value) => handleFieldChange("Type_of_technician", value)}>
                        <SelectTrigger
                          className={editedFields.has("Type_of_technician") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Leader">{t("leader")}</SelectItem>
                          <SelectItem value="Worker">{t("worker")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-2 block font-semibold">{t("location")}</Label>
                      <Input
                        value={formData.Location || ""}
                        onChange={(e) => handleFieldChange("Location", e.target.value)}
                        className={editedFields.has("Location") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="mb-6 text-xl font-semibold">{t("contactInfo")}</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block font-semibold">{t("emailUsername")}</Label>
                      <Input
                        type="email"
                        value={formData.Email_Address || ""}
                        onChange={(e) => handleFieldChange("Email_Address", e.target.value)}
                        className={editedFields.has("Email_Address") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block font-semibold">{t("phoneNumber")}</Label>
                      <Input
                        value={formData.Phone_Number || ""}
                        onChange={(e) => handleFieldChange("Phone_Number", e.target.value)}
                        className={editedFields.has("Phone_Number") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="mb-6 text-xl font-semibold">{t("authentication")}</h2>
                  {!isChangingPassword ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block font-semibold">{t("password")}</Label>
                        <div className="flex gap-2">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={formData.Password || ""}
                            readOnly
                            className="flex-1 bg-slate-50"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button onClick={() => setIsChangingPassword(true)} variant="outline">
                        {t("changePassword")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block font-semibold">{t("currentPassword")}</Label>
                        <Input
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block font-semibold">{t("newPassword")}</Label>
                        <Input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("passwordHelp")}
                        </p>
                      </div>
                      <div>
                        <Label className="mb-2 block font-semibold">{t("confirmNewPassword")}</Label>
                        <Input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        />
                      </div>
                      {passwordErrors.length > 0 && (
                        <div className="rounded-md bg-red-50 p-3">
                          <ul className="list-inside list-disc text-sm text-red-600">
                            {passwordErrors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={handlePasswordChange}>{t("savePassword")}</Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsChangingPassword(false)
                            setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" })
                            setPasswordErrors([])
                          }}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>

                <TechnicianJobsSection technician={technician} />
              </div>
            </div>

            <div className="space-y-6">
              {/* Technician Info Sidebar */}
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">{t("orgInfo")}</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-emerald-600 text-white text-lg font-bold">
                        {(technician.Name || t("unnamed")).split(" ").map((n: any) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">{technician.Name || t("unnamed")}</h3>
                      <p className="text-xs text-slate-400 font-mono">{technician.ID_Technician}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t("phoneNumber")}:</span>
                      <span className="font-medium text-slate-900">{technician.Phone_Number || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t("location")}:</span>
                      <span className="font-medium text-slate-900">{technician.Location || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t("email")}:</span>
                      <span className="font-medium text-slate-900 truncate max-w-[150px]" title={technician.Email_Address || ""}>
                        {technician.Email_Address || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t("type")}:</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">
                        {t(technician.Type_of_technician?.toLowerCase() || "worker")}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {technician.tasks && technician.tasks.length > 0 && (
                <Card className="p-6">
                  <h2 className="mb-4 text-xl font-semibold">{t("recentTasks")}</h2>
                  <div className="space-y-3">
                    {technician.tasks.slice(0, 5).map((t: any) => (
                      <TimelineItem 
                        key={t.ID_Tasks || t.ID_Task} 
                        entry={{
                          ID_TLActivity: t.ID_Tasks || t.ID_Task,
                          Action: t("taskAssigned"),
                          Action_datetime: t.Designation_date || null,
                          Description: t.Name || "",
                          ID_Jobs: null,
                          ID_Member: null
                         }} 
                      />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
