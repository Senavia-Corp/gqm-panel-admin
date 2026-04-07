"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search, Loader2, ChevronLeft, ChevronRight,
  Link2, X, Zap, ZapOff, Users, CheckCircle2,
  Mail, Building2, Star, AlertCircle,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type SubRow = {
  ID_Subcontractor: string
  Name?: string
  Organization?: any
  Status?: string
  Email_Address?: any
  Score?: number
}

type TableResponse = {
  page: number
  limit: number
  total: number
  results: SubRow[]
}

interface Props {
  open: boolean
  onClose: () => void
  jobId: string
  onSubcontractorLinked: () => void
  defaultSyncPodio?: boolean
  jobYear?: number
}

// ─── Email parser ─────────────────────────────────────────────────────────────
// Handles all known formats from the API:
//   "plain@email.com"
//   "{a@b.com,c@d.com}"
//   '{"a@b.com","c@d.com"}'
//   ["a@b.com", "c@d.com"]
//   { "0": "a@b.com", "1": "c@d.com" }

function parseEmails(raw: any): string[] {
  if (!raw) return []

  // Already an array
  if (Array.isArray(raw)) {
    return raw.map((e) => String(e).replace(/[{}"'\s]/g, "").trim()).filter(Boolean)
  }

  // Object with numeric-ish keys
  if (typeof raw === "object") {
    return Object.values(raw).map((v) => String(v).replace(/[{}"'\s]/g, "").trim()).filter(Boolean)
  }

  const s = String(raw).trim()

  // Looks like a set/array literal: {a,b} or ["a","b"]
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
    const inner = s.slice(1, -1)
    return inner
      .split(",")
      .map((e) => e.replace(/[{}"'\s]/g, "").trim())
      .filter((e) => e.includes("@"))
  }

  // Plain string — might be comma-separated
  if (s.includes(",")) {
    return s.split(",").map((e) => e.replace(/[{}"'\s]/g, "").trim()).filter((e) => e.includes("@"))
  }

  // Single email
  return s.replace(/[{}"']/g, "").trim() ? [s.replace(/[{}"']/g, "").trim()] : []
}

function normalizeOrg(raw: any): string {
  if (!raw) return ""
  if (Array.isArray(raw)) return raw.map((r) => String(r).trim()).filter(Boolean).join(", ")
  if (typeof raw === "object") {
    try { return String(Object.values(raw)[0] ?? "").trim() } catch { return String(raw) }
  }
  let s = String(raw).trim()
  s = s.replace(/\\"/g, '"').replace(/\\'/g, "'")
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) s = s.slice(1, -1).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1)
  return s.replace(/^[\{\[\]"'\s]+|[\}\]\s"']+$/g, "").trim()
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | undefined }) {
  if (score === undefined || score === null) {
    return <span className="text-slate-300 text-xs">—</span>
  }
  const color =
    score >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : score >= 50 ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-600 border-red-200"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Star className="h-2.5 w-2.5" />
      {score}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | undefined }) {
  const s = String(status ?? "").toLowerCase()
  const cls =
    s === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s === "inactive" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-500 border-slate-200"
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status || "—"}
    </span>
  )
}

// ─── Email chips ──────────────────────────────────────────────────────────────

function EmailList({ raw }: { raw: any }) {
  const emails = parseEmails(raw)
  if (emails.length === 0) return <span className="text-slate-300 text-xs">—</span>
  if (emails.length === 1) {
    return (
      <a href={`mailto:${emails[0]}`} className="text-xs text-slate-500 hover:text-slate-800 hover:underline truncate max-w-[220px] block" title={emails[0]}>
        {emails[0]}
      </a>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {emails.map((email, i) => (
        <a key={i} href={`mailto:${email}`}
          title={email}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 transition-colors max-w-[180px]"
        >
          <Mail className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate">{email}</span>
        </a>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LinkSubcontractorDialog({
  open, onClose, jobId, onSubcontractorLinked, defaultSyncPodio = true, jobYear,
}: Props) {
  const [loading, setLoading]   = useState(false)
  const [linking, setLinking]   = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const limit                   = 10
  const [total, setTotal]       = useState(0)
  const [rows, setRows]         = useState<SubRow[]>([])
  const [searchTerm, setSearchTerm]           = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter]       = useState("")
  const [syncPodio, setSyncPodio]             = useState(defaultSyncPodio)

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [total, limit])

  // Reset on open
  useEffect(() => {
    if (!open) return
    setPage(1); setSearchTerm(""); setDebouncedSearch(""); setStatusFilter(""); setSyncPodio(defaultSyncPodio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Fetch
  useEffect(() => {
    if (!open) return
    void fetchSubcontractors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, statusFilter])

  const fetchSubcontractors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("mode", "table")
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (statusFilter) params.set("status", statusFilter)
      const res = await apiFetch(`/api/subcontractors?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData?.error || errorData?.detail || "Failed to fetch subcontractors")
      }
      const data = (await res.json()) as TableResponse
      setRows(Array.isArray(data.results) ? data.results : [])
      setTotal(Number(data.total || 0))
    } catch (err) {
      console.error(err); setRows([]); setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows
    const q = debouncedSearch.toLowerCase()
    return rows.filter((s) =>
      String(s.ID_Subcontractor ?? "").toLowerCase().includes(q) ||
      String(s.Name ?? "").toLowerCase().includes(q) ||
      normalizeOrg(s.Organization).toLowerCase().includes(q) ||
      parseEmails(s.Email_Address).some((e) => e.toLowerCase().includes(q))
    )
  }, [rows, debouncedSearch])

  const handleLink = async (subcontractorId: string) => {
    if (!jobId || !subcontractorId) return
    setLinking(subcontractorId)
    try {
      const res = await apiFetch("/api/job-subcontractor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, subcontractorId, sync_podio: syncPodio, year: jobYear }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.error || "Failed to link")
      }
      onSubcontractorLinked()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLinking(null)
    }
  }

  if (!open) return null

  const canPrev = page > 1
  const canNext = page < totalPages

  return createPortal(
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div
        className="relative flex flex-col w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "calc(100vh - 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Link Subcontractor</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a subcontractor to link to this job
                {total > 0 && <span className="ml-1.5 font-semibold text-slate-500">· {total} total</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Podio sync toggle */}
            <button
              type="button"
              onClick={() => setSyncPodio((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                syncPodio
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
              }`}
              title={syncPodio ? "Podio sync ON — click to disable" : "Podio sync OFF — click to enable"}
            >
              {syncPodio
                ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500" />
                : <ZapOff className="h-4 w-4" />
              }
              <span className="text-xs font-semibold hidden sm:inline">
                Podio {syncPodio ? "ON" : "OFF"}
              </span>
              {syncPodio && jobYear && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {jobYear}
                </span>
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Controls ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, org, email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Active filter */}
            <button
              type="button"
              onClick={() => { setPage(1); setStatusFilter((s) => s === "Active" ? "" : "Active") }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                statusFilter === "Active"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {statusFilter === "Active" && <CheckCircle2 className="h-3.5 w-3.5" />}
              Active only
            </button>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
                disabled={!canPrev || loading}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                <span className="font-bold text-slate-800">{page}</span> / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))}
                disabled={!canNext || loading}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col h-48 items-center justify-center gap-3">
              <AlertCircle className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">No subcontractors found</p>
            </div>
          ) : (
            <table className="w-full min-w-[680px] border-collapse">
              <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                <tr>
                  {["ID", "Name", "Organization", "Email", "Score", "Status", ""].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 ${h === "" ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map((s) => {
                  const org = normalizeOrg(s.Organization)
                  const isLinking = linking === s.ID_Subcontractor
                  return (
                    <tr key={s.ID_Subcontractor} className="hover:bg-slate-50/70 transition-colors group">
                      {/* ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-400">{s.ID_Subcontractor}</span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 flex-shrink-0 text-[11px] font-bold">
                            {String(s.Name ?? "?")[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{s.Name || "—"}</span>
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="px-4 py-3">
                        {org ? (
                          <div className="flex items-center gap-1.5 max-w-[180px]">
                            <Building2 className="h-3 w-3 text-slate-300 flex-shrink-0" />
                            <span className="text-xs text-slate-500 truncate">{org}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <EmailList raw={s.Email_Address} />
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ScoreBadge score={s.Score} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={s.Status} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleLink(s.ID_Subcontractor)}
                          disabled={linking !== null}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                            isLinking
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                        >
                          {isLinking ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking…</>
                          ) : (
                            <><Link2 className="h-3.5 w-3.5" /> Link</>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{filteredRows.length}</span> of <span className="font-semibold text-slate-600">{total}</span> subcontractors
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
              disabled={!canPrev || loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))}
              disabled={!canNext || loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== "undefined" ? document.body : (null as any)
  )
}