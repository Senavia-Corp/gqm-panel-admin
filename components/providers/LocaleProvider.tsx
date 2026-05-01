"use client"

import { createContext, useContext, useEffect, useState } from "react"
import enMessages from "@/messages/en.json"
import esMessages from "@/messages/es.json"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Locale = "en" | "es"
type Messages = typeof enMessages

const STORAGE_KEY = "gqm_locale"

const allMessages: Record<Locale, Messages> = {
  en: enMessages,
  es: esMessages,
}

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  messages: Messages
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
  messages: enMessages,
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved === "en" || saved === "es") setLocaleState(saved)
  }, [])

  const setLocale = (newLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, newLocale)
    setLocaleState(newLocale)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, messages: allMessages[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLocale() {
  return useContext(LocaleContext)
}

/**
 * Returns a translator function for the given namespace.
 * Usage: const t = useTranslations("navigation"); t("dashboard", { name: "John" })
 */
export function useTranslations(namespace: keyof Messages) {
  const { messages } = useContext(LocaleContext)
  const section = messages[namespace] as Record<string, any>

  const t = (key: string, values?: Record<string, any>): string => {
    let text = section?.[key] || key
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, "g"), String(v))
      })
    }
    return text
  }

  // Basic implementation of .rich to avoid crashes
  // In a full implementation, this would handle React components in chunks
  t.rich = (key: string, values?: Record<string, any>): string => {
    return t(key, values)
  }

  return t
}
