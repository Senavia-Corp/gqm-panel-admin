"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { motivoRechazo, reglasPassword } from "@/lib/password-policy"

function ResetPasswordForm() {
  const router = useRouter()
  const t = useTranslations("auth")
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    // O-06: aquí se pedían 8 caracteres y el servidor pide 10 y 3 de 4 tipos.
    // Es la única puerta de contraseña que se usa SIN sesión —la de
    // recuperación—, así que el desajuste lo sufría quien ya estaba fuera.
    const motivo = motivoRechazo(password)
    if (motivo) {
      setError(motivo)
      return
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"))
      return
    }
    setLoading(true)
    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || t("invalidResetLink"))
      } else {
        setDone(true)
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
          <h1 className="text-3xl font-bold tracking-tight">{t("resetTitle")}</h1>
        </div>

        {done ? (
          <div className="space-y-6 text-center">
            <p className="text-sm">{t("passwordUpdated")}</p>
            <Button
              className="w-full bg-gqm-green-dark hover:bg-gqm-green"
              onClick={() => router.push("/login")}
            >
              {t("signIn")}
            </Button>
          </div>
        ) : !token ? (
          <p className="text-center text-sm text-red-600">
            {t("missingToken")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              {/* O-06: la página no decía en ninguna parte qué se le pide a la
                  contraseña. El usuario tecleaba a ciegas y aprendía las
                  reglas fallando — en la única pantalla a la que se llega ya
                  estando fuera de la aplicación. */}
              <ul className="space-y-0.5 pt-1">
                {reglasPassword(password).map((r) => (
                  <li
                    key={r.clave}
                    className={`text-xs flex items-center gap-1.5 ${
                      r.ok ? "text-emerald-600" : "text-gray-500"
                    }`}
                  >
                    <span aria-hidden="true">{r.ok ? "✓" : "•"}</span>
                    {r.texto}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{t("confirmPassword")}</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full bg-gqm-green-dark hover:bg-gqm-green" disabled={loading}>
              {loading ? t("updating") : t("updatePassword")}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
