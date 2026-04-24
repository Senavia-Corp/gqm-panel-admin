"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Megaphone, Plus, RefreshCcw, Loader2, AlertCircle, Search, X, Users,
  CheckCircle2, XCircle, ExternalLink, Calendar
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import type { Opportunity } from "@/lib/types"

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

function formatDate(val: string | null | undefined) {
  if (!val) return "—"
  const datePart = val.split("T")[0]
  if (!datePart) return "—"
  const [y, m, d] = datePart.split("-").map(Number)
  if (!y || !m || !d) return "—"
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d))
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 border-slate-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
}

export function JobOpportunitiesSection({ jobId, userRole }: { jobId: string; userRole?: string }) {
  const router = useRouter()

  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const dq = useDebounce(q, 350)
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async (search: string) => {
    if (!jobId) return
    abortRef.current?.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({ page: "1", limit: "50", job_id: jobId })
      if (search) qs.set("q", search)
      const res = await apiFetch(`/api/opportunities?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const results: Opportunity[] = Array.isArray(data.results) ? data.results : []
      setOpportunities(results)
      setTotal(typeof data.total === "number" ? data.total : results.length)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError("Could not load opportunities for this job.")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load(dq) }, [dq, load])

  const handleCreateNew = () => {
    const returnTo = encodeURIComponent(`/jobs/${jobId}?tab=subcontractors`)
    router.push(`/opportunities/create?job_id=${encodeURIComponent(jobId)}&returnTo=${returnTo}`)
  }

  const handleOpenOpp = (id: string) => {
    const returnTo = encodeURIComponent(`/jobs/${jobId}?tab=subcontractors`)
    router.push(`/opportunities/${id}?returnTo=${returnTo}`)
  }

  return (
    <div className="space-y-5 pt-8 mt-8 border-t border-slate-200">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
            <Megaphone className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Job Opportunities</h2>
            <p className="text-xs text-slate-400">{total} opportunit{total !== 1 ? "ies" : "y"} linked to this job</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(dq)}
            className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {userRole !== "LEAD_TECHNICIAN" && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> New Opportunity
            </button>
          )}
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search opportunities…"
          className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading && opportunities.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
          <p className="text-sm font-semibold text-slate-700">Could not load opportunities</p>
          <p className="mt-1 text-xs text-red-500">{error}</p>
          <button
            onClick={() => load(dq)}
            className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : total === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Megaphone className="mx-auto mb-3 h-9 w-9 text-slate-200" />
          <p className="text-sm font-semibold text-slate-600">No opportunities linked to this job</p>
          <p className="mt-1 text-xs text-slate-400">
            {q ? "Try adjusting your search" : "Create a new opportunity to attract subcontractors"}
          </p>
          {!q && userRole !== "LEAD_TECHNICIAN" && (
            <button
              onClick={handleCreateNew}
              className="mt-4 flex items-center gap-1.5 mx-auto rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Opportunity
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pb-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
            </div>
          )}
          {opportunities.map(opp => (
            <div key={opp.ID_Opportunities} className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md transition-all overflow-hidden flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Megaphone className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <span className="text-sm font-bold text-slate-800 truncate">{opp.Project_name || "Untitled Opportunity"}</span>
                  {opp.State === true
                    ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Active</span>
                    : opp.State === false
                    ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500"><XCircle className="h-3 w-3" /> Inactive</span>
                    : null
                  }
                  {opp.Priority && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[opp.Priority] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {opp.Priority}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="font-mono text-slate-400">{opp.ID_Opportunities}</span>
                  {opp.Start_Date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Starts: {formatDate(opp.Start_Date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                <div className="text-center bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                  <p className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Applicants</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">{opp.applicants_count ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center flex-shrink-0">
                <button
                  onClick={() => handleOpenOpp(opp.ID_Opportunities)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                  title="Open opportunity"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
