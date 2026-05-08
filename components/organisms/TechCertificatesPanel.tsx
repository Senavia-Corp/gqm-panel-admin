"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Award,
  FileText,
  AlertTriangle,
  Clock,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { cn } from "@/lib/utils"
import type { Certificate } from "@/lib/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntilExpiration(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ExpirationBadge({ dateStr, t }: { dateStr: string | null; t: any }) {
  const days = daysUntilExpiration(dateStr)
  if (days === null) return <span className="text-xs italic text-slate-400">—</span>
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">{formatDate(dateStr)}</span>
      {days < 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
          <AlertTriangle className="h-2.5 w-2.5" /> {t("certExpired")}
        </span>
      )}
      {days >= 0 && days <= 30 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <Clock className="h-2.5 w-2.5" /> {days}d {t("remaining")}
        </span>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    Active:   "border-emerald-200 bg-emerald-50 text-emerald-700",
    Inactive: "border-slate-200   bg-slate-50   text-slate-600",
    Expired:  "border-red-200     bg-red-50     text-red-700",
    Pending:  "border-amber-200   bg-amber-50   text-amber-700",
  }
  const cls = map[status ?? ""] ?? "border-slate-200 bg-slate-50 text-slate-600"
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", cls)}>
      {status ?? "—"}
    </span>
  )
}

function CertCard({ cert, t }: { cert: Certificate; t: any }) {
  const [expanded, setExpanded] = useState(false)
  
  const days = daysUntilExpiration(cert.Expiration_date)
  const isExpired = days !== null && days < 0
  const isExpiringSoon = days !== null && days >= 0 && days <= 30
  const attachments = cert.attachments ?? []

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
      isExpired ? "border-red-200" : isExpiringSoon ? "border-amber-200" : "border-slate-200"
    )}>
      {/* Expiry Warning Header */}
      {(isExpired || isExpiringSoon) && (
        <div className={cn(
          "flex items-center gap-2 border-b px-4 py-1.5 text-[11px] font-medium",
          isExpired ? "border-red-100 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-700"
        )}>
          <AlertTriangle className="h-3 w-3" />
          {isExpired ? t("certExpired") : `${t("certExpiringSoon")} — ${days}d ${t("remaining")}`}
        </div>
      )}

      {/* Main Content */}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isExpired ? "bg-red-50" : isExpiringSoon ? "bg-amber-50" : "bg-emerald-50"
        )}>
          <Award className={cn("h-5 w-5", isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-500" : "text-emerald-600")} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{cert.Name ?? t("unnamed")}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={cert.Status} />
                <ExpirationBadge dateStr={cert.Expiration_date} t={t} />
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/30 p-4 sm:px-5">
          {cert.Notes && (
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("certNotes")}</span>
              <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{cert.Notes}</p>
            </div>
          )}
          
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("certDocuments")}</span>
            <div className="mt-2 space-y-2">
              {attachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 border border-dashed rounded-xl bg-white/50">
                  <FileText className="h-5 w-5 text-slate-300" />
                  <p className="text-xs text-slate-400 mt-1">{t("certNoDocuments")}</p>
                </div>
              ) : (
                attachments.map((att) => (
                  <div key={att.ID_Attachment} className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{att.Document_name}</p>
                    </div>
                    {att.Link && (
                      <a
                        href={att.Link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function TechCertificatesPanel({ subcontractorId }: { subcontractorId: string | null }) {
  const t = useTranslations("subcontractors")
  const td = useTranslations("dashboard")
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchCerts = useCallback(async () => {
    if (!subcontractorId) return
    try {
      setLoading(true)
      setError(false)
      const res = await apiFetch(`/api/certificates/subcontractor/${encodeURIComponent(subcontractorId)}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setCerts(Array.isArray(data) ? data : data.results ?? [])
    } catch (e) {
      console.error("[TechCertificates] fetch error:", e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [subcontractorId])

  useEffect(() => {
    fetchCerts()
  }, [fetchCerts])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">{td("loadingEllipsis")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertTriangle className="h-8 w-8 mb-3" />
        <p className="text-sm">{td("errorLoadSubDetails")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-800">{t("tabCertificates")}</h2>
        <p className="text-sm text-slate-500">{t("noCertificatesDesc").replace("Add certificates to ", "")}</p>
      </div>

      {certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <Award className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-800">{t("noCertificates")}</h3>
          <p className="mt-1 max-w-xs text-sm text-slate-400">
            {t("noCertificatesDesc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs.map((cert) => (
            <CertCard key={cert.ID_Certificate} cert={cert} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
