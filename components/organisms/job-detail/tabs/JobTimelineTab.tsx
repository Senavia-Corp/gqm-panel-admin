"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { RefreshCw, Activity, Download } from "lucide-react"
import { TimelineItem, type TLActivityEntry } from "@/components/molecules/TimelineItem"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type TLPeriod = "day" | "week" | "month"

const TL_PERIODS: { value: TLPeriod; label: string }[] = [
  { value: "day",   label: "Today"      },
  { value: "week",  label: "This Week"  },
  { value: "month", label: "This Month" },
]

interface TimelineState {
  entries:     TLActivityEntry[]
  total:       number
  page:        number
  loading:     boolean
  loadingMore: boolean
  error:       string | null
}

const PAGE_LIMIT = 15

// ─── PDF Popover ──────────────────────────────────────────────────────────────

function PDFPopover({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0]
  const [period,      setPeriod]      = useState<TLPeriod>("month")
  const [refDate,     setRefDate]     = useState(today)
  const [downloading, setDownloading] = useState(false)
  const [dlError,     setDlError]     = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  async function handleDownload() {
    setDownloading(true)
    setDlError(null)
    try {
      const params = new URLSearchParams({ job_id: jobId, period, ref_date: refDate })
      const res    = await apiFetch(`/api/metrics/timeline/reports/pdf?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Error ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `timeline_${jobId}_${period}_${refDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e: any) {
      setDlError(e?.message ?? "Failed to generate PDF")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
        background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "16px", minWidth: "220px",
      }}
    >
      <div style={{ position: "absolute", top: "-6px", right: "18px", width: "11px", height: "11px", background: "#fff", border: "1px solid #E5E7EB", transform: "rotate(45deg)", borderBottom: "none", borderRight: "none" }} />
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px", marginTop: 0 }}>
        Download PDF Report
      </p>
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        {TL_PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)} style={{ flex: 1, padding: "5px 0", fontSize: "11px", fontWeight: period === p.value ? 600 : 400, borderRadius: "6px", border: `1.5px solid ${period === p.value ? "#0B2E1E" : "#D1D5DB"}`, background: period === p.value ? "#0B2E1E" : "transparent", color: period === p.value ? "#fff" : "#374151", cursor: "pointer", transition: "all 0.12s ease" }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: "4px" }}>
        <label style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>
          Reference date
        </label>
        <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} style={{ width: "100%", border: "1.5px solid #D1D5DB", borderRadius: "7px", padding: "7px 10px", fontSize: "12px", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fff" }} />
        <p style={{ fontSize: "10px", color: "#9CA3AF", margin: "4px 0 12px" }}>
          Covers the {period} containing this date.
        </p>
      </div>
      {dlError && (
        <p style={{ fontSize: "11px", color: "#DC2626", margin: "0 0 8px", background: "#FEF2F2", padding: "6px 8px", borderRadius: "6px" }}>
          ⚠ {dlError}
        </p>
      )}
      <button onClick={handleDownload} disabled={downloading} style={{ width: "100%", padding: "9px", background: downloading ? "#9CA3AF" : "linear-gradient(135deg, #0B2E1E, #1A5C3A)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: downloading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.15s ease" }}>
        {downloading ? (
          <><span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "tl-spin 0.7s linear infinite" }} />Generating…</>
        ) : <>⬇ Download PDF</>}
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JobTimelineTab({ jobId }: { jobId: string }) {
  const [tl, setTl] = useState<TimelineState>({
    entries: [], total: 0, page: 1, loading: true, loadingMore: false, error: null,
  })
  const [showPDF, setShowPDF] = useState(false)

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    if (!jobId) return
    setTl(prev => ({ ...prev, loading: !append && page === 1, loadingMore: append, error: null }))
    try {
      const res  = await apiFetch(`/api/timeline/job/${encodeURIComponent(jobId)}?page=${page}&limit=${PAGE_LIMIT}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
      const entries: TLActivityEntry[] = data?.results ?? data ?? []
      const total:   number            = data?.total   ?? entries.length
      setTl(prev => ({
        entries:     append ? [...prev.entries, ...entries] : entries,
        total, page, loading: false, loadingMore: false, error: null,
      }))
    } catch (e: any) {
      setTl(prev => ({ ...prev, loading: false, loadingMore: false, error: e?.message ?? "Failed to load timeline" }))
    }
  }, [jobId])

  useEffect(() => { fetchPage(1, false) }, [fetchPage])

  const hasMore        = tl.entries.length < tl.total
  const handleLoadMore = () => { if (!tl.loadingMore && hasMore) fetchPage(tl.page + 1, true) }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Activity Timeline</p>
            <p className="text-[11px] text-slate-400">
              {tl.loading ? "Loading…" : tl.total > 0 ? `${tl.total} event${tl.total !== 1 ? "s" : ""} recorded` : "No events yet"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => fetchPage(1, false)}
            disabled={tl.loading}
            title="Refresh timeline"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${tl.loading ? "animate-spin" : ""}`} />
          </button>

          {/* PDF */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowPDF(v => !v)}
              title="Download PDF report"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="h-3 w-3" />
              PDF
            </button>
            {showPDF && jobId && <PDFPopover jobId={jobId} onClose={() => setShowPDF(false)} />}
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {!tl.loading && tl.error && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-6 py-3">
          <span className="text-red-500">⚠</span>
          <p className="flex-1 text-xs text-red-700">{tl.error}</p>
          <button onClick={() => fetchPage(1, false)} className="text-[11px] font-semibold text-blue-600">
            Retry
          </button>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-6">

        {/* Loading skeleton */}
        {tl.loading && (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: "72px", borderRadius: "10px", background: `linear-gradient(90deg, #F3F4F6 0%, #E5E7EB ${40 + i * 8}%, #F3F4F6 100%)`, animation: "tl-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!tl.loading && !tl.error && tl.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Activity className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No activity recorded yet</p>
            <p className="text-xs text-slate-400">Events will appear here as changes happen on this job.</p>
          </div>
        )}

        {/* Entries */}
        {!tl.loading && tl.entries.length > 0 && (
          <div>
            {tl.entries.map((entry, idx) => (
              <TimelineItem
                key={entry.ID_TLActivity}
                entry={entry}
                isLast={idx === tl.entries.length - 1 && !hasMore}
                animationDelay={idx < PAGE_LIMIT ? idx * 30 : 0}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={tl.loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tl.loadingMore ? (
                    <><RefreshCw className="h-3 w-3 animate-spin" />Loading…</>
                  ) : (
                    `Load more (${tl.total - tl.entries.length} remaining)`
                  )}
                </button>
              </div>
            )}

            {/* All-loaded indicator */}
            {!hasMore && tl.entries.length > 0 && (
              <p className="pt-4 text-center text-[10px] text-slate-300">
                All {tl.total} event{tl.total !== 1 ? "s" : ""} loaded
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes tl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes tl-spin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
