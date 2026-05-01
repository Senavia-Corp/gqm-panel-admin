"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "@/components/ui/use-toast"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import type { TechnicianType } from "@/lib/types"

export default function CreateTechnicianPage({ params }: { params: { id: string } }) {
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    phoneNumber: "",
    type: "Worker" as TechnicianType,
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors: string[] = []

    // Validate required fields
    if (!formData.name) validationErrors.push(t("nameRequired"))
    if (!formData.email) validationErrors.push(t("emailRequired"))
    if (!formData.location) validationErrors.push(t("locationRequired"))
    if (!formData.phoneNumber) validationErrors.push(t("phoneRequired"))
    if (!formData.password) validationErrors.push(t("pwdRequired"))

    // Validate password
    const passwordErrors = validatePassword(formData.password)
    validationErrors.push(...passwordErrors)

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      validationErrors.push(t("pwdMatch"))
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    const payload = {
      ...formData,
      ID_Subcontractor: params.id,
    }

    apiFetch("/api/technician", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || err.detail || `Error ${res.status}`)
        }
        toast({ title: t("success"), description: t("techCreated") })
        router.push(`/subcontractors/${params.id}?tab=technicians`)
      })
      .catch((err) => {
        setErrors([err.message || t("failedToCreateTech")])
        toast({ title: t("error"), description: err.message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }

  if (!user) return null

  if (!hasPermission("subcontractor:update")) {
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
              {t("accessDeniedTechDesc")}
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

          <div className="mx-auto max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold">{t("createTechTitle")}</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">{t("personalInfo")}</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block font-semibold">{t("name")} *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t("fullNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">{t("techType")} *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: TechnicianType) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Leader">{t("leader")}</SelectItem>
                        <SelectItem value="Worker">{t("worker")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block font-semibold">{t("location")} *</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder={t("locationPlaceholder")}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">{t("contactInfo")}</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block font-semibold">{t("emailUsername")} *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">{t("phoneNumber")} *</Label>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+1-XXX-XXX-XXXX"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">{t("authentication")}</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block font-semibold">{t("password")} *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t("enterPassword")}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("passwordHelp")}
                    </p>
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">{t("confirmPassword")} *</Label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder={t("confirmPassword")}
                    />
                  </div>
                </div>
              </Card>

              {errors.length > 0 && (
                <div className="rounded-md bg-red-50 p-4">
                  <h3 className="mb-2 font-semibold text-red-800">{t("fixErrors")}</h3>
                  <ul className="list-inside list-disc text-sm text-red-600">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? t("creating") : t("createTechTitle")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => router.push(`/subcontractors/${params.id}?tab=technicians`)}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
