"use client"

import { useTranslations } from "@/components/providers/LocaleProvider"

export default function Loading() {
  const t = useTranslations("subcontractors")
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-muted-foreground">{t("loadingTasks")}</p>
      </div>
    </div>
  )
}
