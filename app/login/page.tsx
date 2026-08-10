"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { Logo } from "@/components/atoms/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t("invalidCredentials"))
        setLoading(false)
        return
      }

      // Sesión httpOnly (REG-108): los tokens quedaron en cookies del
      // servidor; aquí solo estado de UI no sensible.
      localStorage.setItem("user_id", data.user_id)
      localStorage.setItem("user_type", data.user_type)

      // Save IAM policies if returned by the backend login endpoint
      if (data.user_data?.policies) {
        localStorage.setItem("user_policies", JSON.stringify(data.user_data.policies))
      }

      // El rol real viene del backend (data.role = slug del modelo de 4
      // roles, el mismo de la cookie gqm_role). Antes se fijaba GQM_MEMBER
      // para todo member, así que un Full Admin veía «GQM_MEMBER» en el
      // header y la etiqueta no se corregía nunca (TopBar la cachea 5 min).
      const ROLE_LABEL: Record<string, string> = {
        full_admin:    "FULL_ADMIN",
        gqm_member:    "GQM_MEMBER",
        technical:     "LEAD_TECHNICIAN",
        subcontractor: "SUBCONTRACTOR",
      }
      let role = ROLE_LABEL[data.role as string] ?? "GQM_MEMBER"
      if (data.user_type === "technician") role = "LEAD_TECHNICIAN"
      if (data.user_type === "subcontractor") role = "SUBCONTRACTOR"

      let userData
      if (data.user_type === "member") {
        // Map member data to existing User format
        userData = {
          id: data.user_data.ID_Member,
          name: data.user_data.Acc_Rep,
          email: data.user_data.Email_Address,
          role: role,
          avatar: "/placeholder.svg?height=40&width=40",
          phone: data.user_data.Phone_Number,
          address: data.user_data.Address,
        }
      } else if (data.user_type === "subcontractor") {
        userData = {
          id: data.user_data.ID_Subcontractor,
          name: data.user_data.Name,
          email: data.user_data.Email_Address,
          role: role,
          avatar: "/placeholder.svg?height=40&width=40",
          phone: data.user_data.Phone_Number,
        }
      } else {
        // Map technician data to existing User format
        userData = {
          id: data.user_data.ID_Technician,
          name: data.user_data.Name,
          email: data.user_data.Email_Address,
          role: role,
          avatar: "/placeholder.svg?height=40&width=40",
          phone: data.user_data.Phone_Number,
          location: data.user_data.Location,
          technicianType: data.user_data.Type_of_technician,
          subcontractorId: data.user_data.ID_Subcontractor,
        }
      }

      localStorage.setItem("user_data", JSON.stringify(userData))

      console.log("[v0] Login successful, redirecting to dashboard")
      router.push("/dashboard")
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError(t("genericError"))
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Background Image */}
      <div
        className="hidden flex-1 bg-cover bg-center lg:block"
        style={{
          backgroundImage: "url(/images/login-background.jpg)",
        }}
      >
        <div className="flex h-full items-start p-12">
          <Logo className="scale-150" />
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">{t("welcomeBack")}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="text-right">
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => router.push("/forgot-password")}
              >
                {t("forgotPassword")}
              </Button>
            </div>

            <Button type="submit" className="w-full bg-gqm-green-dark hover:bg-gqm-green" disabled={loading}>
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
