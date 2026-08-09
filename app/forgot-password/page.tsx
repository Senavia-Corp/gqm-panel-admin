"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from "@/components/providers/LocaleProvider"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const resp = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (resp.status === 429) {
        setError(t("tooManyAttempts"))
      } else {
        setSent(true)
      }
    } catch {
      setError(t("genericError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t("forgotTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("forgotSubtitle")}
          </p>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <p className="text-sm">
              {t("resetSent")}
            </p>
            <Button variant="link" onClick={() => router.push("/login")}>
              {t("backToSignIn")}
            </Button>
          </div>
        ) : (
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full bg-gqm-green-dark hover:bg-gqm-green" disabled={loading}>
              {loading ? t("sending") : t("sendResetLink")}
            </Button>

            <div className="text-center">
              <Button type="button" variant="link" className="text-sm" onClick={() => router.push("/login")}>
                {t("backToSignIn")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
