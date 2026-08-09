"use client"

// REG-031: error boundary global — antes cualquier throw en un segmento
// dejaba la pantalla en blanco.
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/providers/LocaleProvider"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("common")

  useEffect(() => {
    console.error("[error-boundary]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold">{t("somethingWentWrong")}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("errorBoundaryHint")}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} className="bg-gqm-green-dark hover:bg-gqm-green">
          {t("tryAgain")}
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          {t("goToDashboard")}
        </Button>
      </div>
    </div>
  )
}
