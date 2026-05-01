"use client"

import { useLocale } from "@/components/providers/LocaleProvider"

export function LanguageToggle() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      <button
        onClick={() => setLocale("en")}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
          locale === "en"
            ? "bg-white text-slate-800 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
        aria-pressed={locale === "en"}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLocale("es")}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
          locale === "es"
            ? "bg-white text-slate-800 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
        aria-pressed={locale === "es"}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  )
}
