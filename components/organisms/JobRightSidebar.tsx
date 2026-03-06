"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientCard } from "@/components/organisms/ClientCard"
import { TimelineItem, type TLActivityEntry } from "@/components/molecules/TimelineItem"
import { TechnicianJobSidebar } from "@/components/organisms/TechnicianJobSidebar"
import { mapClientDetailsToClient } from "@/lib/mappers/client.mapper"
import type { JobDTO, UserRole } from "@/lib/types"

// ── Types ─────────────────────────────────────────────────────────────────────

type TLPeriod = "day" | "week" | "month"

type Props = {
  role: UserRole
  job:  JobDTO
}

interface TimelineState {
  entries:     TLActivityEntry[]
  total:       number
  page:        number
  loading:     boolean
  loadingMore: boolean
  error:       string | null
}

const PAGE_LIMIT = 10

// ── PDF Popover ───────────────────────────────────────────────────────────────

const TL_PERIODS: { value: TLPeriod; label: string }[] = [
  { value: "day",   label: "Today"      },
  { value: "week",  label: "This Week"  },
  { value: "month", label: "This Month" },
]

function PDFPopover({
  jobId,
  onClose,
}: {
  jobId: string
  onClose: () => void
}) {
  const today   = new Date().toISOString().split("T")[0]
  const [period,      setPeriod]      = useState<TLPeriod>("month")
  const [refDate,     setRefDate]     = useState(today)
  const [downloading, setDownloading] = useState(false)
  const [dlError,     setDlError]     = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
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
      const res    = await fetch(`/api/metrics/timeline/reports/pdf?${params}`)
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
        position:     "absolute",
        top:          "calc(100% + 8px)",
        right:        0,
        zIndex:       50,
        background:   "#fff",
        border:       "1px solid #E5E7EB",
        borderRadius: "12px",
        boxShadow:    "0 8px 24px rgba(0,0,0,0.12)",
        padding:      "16px",
        minWidth:     "220px",
      }}
    >
      {/* Arrow tip */}
      <div style={{
        position:     "absolute", top: "-6px", right: "18px",
        width:        "11px",     height:      "11px",
        background:   "#fff",
        border:       "1px solid #E5E7EB",
        transform:    "rotate(45deg)",
        borderBottom: "none",
        borderRight:  "none",
      }} />

      <p style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px", marginTop: 0 }}>
        Download PDF Report
      </p>

      {/* Period chips */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        {TL_PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              flex:         1,
              padding:      "5px 0",
              fontSize:     "11px",
              fontWeight:   period === p.value ? 600 : 400,
              borderRadius: "6px",
              border:       `1.5px solid ${period === p.value ? "#0B2E1E" : "#D1D5DB"}`,
              background:   period === p.value ? "#0B2E1E" : "transparent",
              color:        period === p.value ? "#fff" : "#374151",
              cursor:       "pointer",
              transition:   "all 0.12s ease",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Reference date */}
      <div style={{ marginBottom: "4px" }}>
        <label style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>
          Reference date
        </label>
        <input
          type="date"
          value={refDate}
          onChange={e => setRefDate(e.target.value)}
          style={{
            width:        "100%",
            border:       "1.5px solid #D1D5DB",
            borderRadius: "7px",
            padding:      "7px 10px",
            fontSize:     "12px",
            color:        "#111827",
            outline:      "none",
            boxSizing:    "border-box",
            background:   "#fff",
          }}
        />
        <p style={{ fontSize: "10px", color: "#9CA3AF", margin: "4px 0 12px" }}>
          Covers the {period} containing this date.
        </p>
      </div>

      {/* Error */}
      {dlError && (
        <p style={{ fontSize: "11px", color: "#DC2626", margin: "0 0 8px", background: "#FEF2F2", padding: "6px 8px", borderRadius: "6px" }}>
          ⚠ {dlError}
        </p>
      )}

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          width:          "100%",
          padding:        "9px",
          background:     downloading ? "#9CA3AF" : "linear-gradient(135deg, #0B2E1E, #1A5C3A)",
          color:          "#fff",
          border:         "none",
          borderRadius:   "8px",
          fontSize:       "13px",
          fontWeight:     600,
          cursor:         downloading ? "not-allowed" : "pointer",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "6px",
          transition:     "all 0.15s ease",
        }}
      >
        {downloading ? (
          <>
            <span style={{
              width: "12px", height: "12px",
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff", borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }} />
            Generating…
          </>
        ) : (
          <>⬇ Download PDF</>
        )}
      </button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JobRightSidebar({ role, job }: Props) {

  if (role === "LEAD_TECHNICIAN") {
    return (
      <div className="space-y-6">
        <TechnicianJobSidebar job={job} subcontractor={job?.subcontractors?.[0]} />
      </div>
    )
  }

  const jobId = (job as any)?.ID_Jobs ?? (job as any)?.id ?? null

  const [tl, setTl] = useState<TimelineState>({
    entries:     [],
    total:       0,
    page:        1,
    loading:     true,
    loadingMore: false,
    error:       null,
  })

  const [showPDF, setShowPDF] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Fetcher ────────────────────────────────────────────────────────────────

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    if (!jobId) return

    setTl(prev => ({
      ...prev,
      loading:     !append && page === 1,
      loadingMore:  append,
      error:        null,
    }))

    try {
      const res  = await fetch(`/api/timeline/job/${encodeURIComponent(jobId)}?page=${page}&limit=${PAGE_LIMIT}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)

      const entries: TLActivityEntry[] = data?.results ?? data ?? []
      const total:   number            = data?.total   ?? entries.length

      setTl(prev => ({
        entries:     append ? [...prev.entries, ...entries] : entries,
        total,
        page,
        loading:     false,
        loadingMore: false,
        error:       null,
      }))
    } catch (e: any) {
      setTl(prev => ({
        ...prev,
        loading:     false,
        loadingMore: false,
        error:       e?.message ?? "Failed to load timeline",
      }))
    }
  }, [jobId])

  useEffect(() => { fetchPage(1, false) }, [fetchPage])

  const hasMore        = tl.entries.length < tl.total
  const handleLoadMore = () => { if (!tl.loadingMore && hasMore) fetchPage(tl.page + 1, true) }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Client card */}
      {job.client ? <ClientCard client={mapClientDetailsToClient(job.client)} /> : null}

      {/* Timeline card */}
      <Card style={{ overflow: "visible" }}>
        <CardHeader style={{ paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

            {/* Left: title + count badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CardTitle style={{ fontSize: "15px", fontWeight: 700, color: "#0B2E1E" }}>
                Activity Timeline
              </CardTitle>
              {tl.total > 0 && (
                <span style={{
                  fontSize: "11px", fontWeight: 600, color: "#6B7280",
                  background: "#F3F4F6", borderRadius: "10px", padding: "2px 8px",
                }}>
                  {tl.total} {tl.total === 1 ? "event" : "events"}
                </span>
              )}
            </div>

            {/* Right: PDF button + popover */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowPDF(v => !v)}
                title="Download activity report as PDF"
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "5px",
                  padding:      "5px 11px",
                  fontSize:     "11px",
                  fontWeight:   600,
                  color:        "#0B2E1E",
                  background:   showPDF ? "#F0FDF4" : "transparent",
                  border:       "1.5px solid #D1FAE5",
                  borderRadius: "7px",
                  cursor:       "pointer",
                  transition:   "all 0.15s ease",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 11L3 6h3V1h4v5h3L8 11z" fill="#0B2E1E"/>
                  <path d="M2 13h12v2H2v-2z" fill="#0B2E1E"/>
                </svg>
                PDF
              </button>

              {showPDF && jobId && (
                <PDFPopover
                  jobId={jobId}
                  onClose={() => setShowPDF(false)}
                />
              )}
            </div>

          </div>
        </CardHeader>

        <CardContent style={{ paddingTop: 0 }}>

          {/* Loading skeleton */}
          {tl.loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{
                  height: "64px", borderRadius: "10px",
                  background: `linear-gradient(90deg, #F3F4F6 0%, #E5E7EB ${40 + i * 10}%, #F3F4F6 100%)`,
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }} />
              ))}
            </div>
          )}

          {/* Error */}
          {!tl.loading && tl.error && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "8px", padding: "10px 12px",
              fontSize: "12px", color: "#991B1B",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span>⚠</span> {tl.error}
              <button
                onClick={() => fetchPage(1, false)}
                style={{ marginLeft: "auto", fontSize: "11px", color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!tl.loading && !tl.error && tl.entries.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF", fontSize: "12px" }}>
              <div style={{ fontSize: "22px", marginBottom: "6px" }}>📋</div>
              No activity recorded yet
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
                  animationDelay={idx < PAGE_LIMIT ? idx * 40 : 0}
                />
              ))}

              {hasMore && (
                <div ref={bottomRef} style={{ textAlign: "center", paddingTop: "10px" }}>
                  <button
                    onClick={handleLoadMore}
                    disabled={tl.loadingMore}
                    style={{
                      fontSize: "11px", fontWeight: 600,
                      color:    tl.loadingMore ? "#9CA3AF" : "#0B2E1E",
                      background: "none",
                      border:   `1px solid ${tl.loadingMore ? "#E5E7EB" : "#D1FAE5"}`,
                      borderRadius: "6px", padding: "5px 14px",
                      cursor:   tl.loadingMore ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tl.loadingMore ? "Loading…" : `Load more (${tl.total - tl.entries.length} remaining)`}
                  </button>
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}