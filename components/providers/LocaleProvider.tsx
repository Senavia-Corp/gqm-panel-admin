"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
// Triggering reload of JSON messages - v23
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
    // REG-138: cookie primero (la ve el SSR), localStorage como legado
    const fromCookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${STORAGE_KEY}=`))
      ?.split("=")[1] as Locale | undefined
    const saved = fromCookie ?? (localStorage.getItem(STORAGE_KEY) as Locale | null)
    if (saved === "en" || saved === "es") setLocaleState(saved)
  }, [])

  const setLocale = (newLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, newLocale)
    // Cookie legible por el server (i18n/request.ts) → SSR coherente (REG-138)
    document.cookie = `${STORAGE_KEY}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
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
 * If no namespace is provided, it returns a translator for the root of the messages object.
 */
export function useTranslations(namespace?: string) {
  const { messages } = useContext(LocaleContext)

  return useMemo(() => {
    // Resolve the section based on a dot-separated namespace (e.g. "jobEstimate.general")
    let section: any = messages
    if (namespace) {
      const parts = namespace.split(".")
      for (const p of parts) {
        if (section && typeof section === "object" && p in section) {
          section = section[p]
        } else {
          section = undefined
          break
        }
      }
    }

    const t = (key: string, values?: Record<string, any>): string => {
      // Handle nested keys (e.g. "form.title")
      let text: any = section
      const keys = key.split(".")
      
      for (const k of keys) {
        if (text && typeof text === "object" && k in text) {
          text = text[k]
        } else {
          text = key // Fallback to key if not found
          break
        }
      }

      if (typeof text !== "string") {
        text = String(text || key)
      }

      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{${k}}`, "g"), String(v))
        })
      }
      return text
    }

    t.rich = t
    return t
  }, [messages, namespace])
}
