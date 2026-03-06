"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"

// ─── Types ────────────────────────────────────────────────────────────────────

type JobType   = "ALL" | "QID" | "PTL" | "PAR"
type DocType   = "all" | "invoices" | "bills" | "invoice_payments" | "bill_payments"
type TLPeriod  = "day" | "week" | "month"
type ReportCat = "jobs" | "financial" | "timeline"

interface ReportFilters {
  category:  ReportCat
  jobType:   JobType
  year:      string
  month:     string
  docType:   DocType
  // timeline-specific
  tlJobId:   string
  tlPeriod:  TLPeriod
  tlRefDate: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_TYPES: { value: JobType; label: string; color: string }[] = [
  { value: "ALL", label: "All Types",  color: "#0B2E1E" },
  { value: "QID", label: "QID",        color: "#059669" },
  { value: "PTL", label: "PTL",        color: "#2563EB" },
  { value: "PAR", label: "PAR",        color: "#7C3AED" },
]

const DOC_TYPES: { value: DocType; label: string; icon: string }[] = [
  { value: "all",              label: "All Documents",    icon: "⊞" },
  { value: "invoices",         label: "Invoices",         icon: "📄" },
  { value: "bills",            label: "Bills",            icon: "🧾" },
  { value: "invoice_payments", label: "Inv. Payments",    icon: "💳" },
  { value: "bill_payments",    label: "Bill Payments",    icon: "💰" },
]

const MONTHS = [
  { value: "ALL", label: "All Months" },
  { value: "1",  label: "January"   }, { value: "2",  label: "February"  },
  { value: "3",  label: "March"     }, { value: "4",  label: "April"     },
  { value: "5",  label: "May"       }, { value: "6",  label: "June"      },
  { value: "7",  label: "July"      }, { value: "8",  label: "August"    },
  { value: "9",  label: "September" }, { value: "10", label: "October"   },
  { value: "11", label: "November"  }, { value: "12", label: "December"  },
]

const YEARS = ["ALL", "2025", "2026"]

const TL_PERIODS: { value: TLPeriod; label: string; desc: string }[] = [
  { value: "day",   label: "Day",   desc: "Activity for a single day"  },
  { value: "week",  label: "Week",  desc: "Activity for a 7-day week"  },
  { value: "month", label: "Month", desc: "Activity for a full month"  },
]

// ─── Small sub-components ─────────────────────────────────────────────────────

function FilterChip({
  active, onClick, children, accent,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; accent?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background:   active ? (accent ?? "#0B2E1E") : "transparent",
        color:        active ? "#fff" : "#374151",
        border:       `1.5px solid ${active ? (accent ?? "#0B2E1E") : "#D1D5DB"}`,
        borderRadius: "8px",
        padding:      "6px 16px",
        fontSize:     "13px",
        fontWeight:   active ? 600 : 400,
        cursor:       "pointer",
        transition:   "all 0.15s ease",
        whiteSpace:   "nowrap",
      }}
    >
      {children}
    </button>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border:       "1.5px solid #D1D5DB",
          borderRadius: "8px",
          padding:      "8px 12px",
          fontSize:     "13px",
          color:        "#111827",
          background:   "#fff",
          cursor:       "pointer",
          outline:      "none",
          appearance:   "none",
          backgroundImage:    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat:   "no-repeat",
          backgroundPosition: "right 10px center",
          paddingRight:       "30px",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function PreviewTag({ label, value }: { label: string; value: string }) {
  return (
    <span style={{
      display:      "inline-flex", alignItems: "center", gap: "4px",
      background:   "#F0FDF4", border: "1px solid #BBF7D0",
      borderRadius: "6px", padding: "2px 10px",
      fontSize:     "12px", color: "#065F46",
    }}>
      <span style={{ color: "#9CA3AF", fontSize: "10px" }}>{label}:</span>
      <strong>{value}</strong>
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  const today = new Date().toISOString().split("T")[0]

  const [filters, setFilters] = useState<ReportFilters>({
    category:  "financial",
    jobType:   "ALL",
    year:      "2026",
    month:     "ALL",
    docType:   "all",
    tlJobId:   "",
    tlPeriod:  "month",
    tlRefDate: today,
  })

  const [loading,     setLoading]     = useState(false)
  const [loadingJson, setLoadingJson] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  if (!user) return null

  // ── Helpers ────────────────────────────────────────────────────────────────

  function set<K extends keyof ReportFilters>(key: K, val: ReportFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: val }))
    setError(null)
    setSuccess(false)
  }

  function buildParams() {
    const p = new URLSearchParams()
    if (filters.category === "timeline") {
      p.set("job_id", filters.tlJobId.trim())
      p.set("period", filters.tlPeriod)
      if (filters.tlRefDate) p.set("ref_date", filters.tlRefDate)
    } else {
      p.set("type", filters.jobType)
      if (filters.year  !== "ALL") p.set("year",  filters.year)
      if (filters.month !== "ALL") p.set("month", filters.month)
      if (filters.category === "financial") p.set("doc_type", filters.docType)
    }
    return p.toString()
  }

  async function handleDownloadPDF() {
    if (filters.category === "timeline" && !filters.tlJobId.trim()) {
      setError("Job ID is required for Timeline reports.")
      return
    }
    setLoading(true); setError(null); setSuccess(false)
    try {
      const endpoint =
        filters.category === "financial" ? "/api/financial/reports/pdf"  :
        filters.category === "timeline"  ? "/api/metrics/timeline/reports/pdf" :
                                           "/api/reports/jobs"
      const res = await fetch(`${endpoint}?${buildParams()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? body?.detail ?? `Error ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = filters.category === "timeline"
        ? `timeline_${filters.tlJobId}_${filters.tlPeriod}_${filters.tlRefDate}.pdf`
        : `report_${filters.category}_${filters.jobType}_${filters.year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function handlePreviewJSON() {
    if (filters.category === "jobs") return
    if (filters.category === "timeline" && !filters.tlJobId.trim()) {
      setError("Job ID is required for Timeline reports.")
      return
    }
    setLoadingJson(true); setError(null)
    try {
      const endpoint = filters.category === "timeline"
        ? "/api/metrics/timeline/summary"
        : "/api/financial/summary"
      const res  = await fetch(`${endpoint}?${buildParams()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? data?.detail ?? `Error ${res.status}`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      window.open(URL.createObjectURL(blob), "_blank")
    } catch (e: any) {
      setError(e.message ?? "Unknown error")
    } finally {
      setLoadingJson(false)
    }
  }

  // ── Derived display values ──────────────────────────────────────────────────

  const yearLabel  = filters.year  === "ALL" ? "All Years"  : filters.year
  const monthLabel = filters.month === "ALL" ? "All Months" : MONTHS.find(m => m.value === filters.month)?.label ?? filters.month
  const docLabel   = DOC_TYPES.find(d => d.value === filters.docType)?.label ?? "All"
  const isTimeline  = filters.category === "timeline"
  const isFinancial = filters.category === "financial"

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Page header */}
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#0B2E1E", margin: 0 }}>
              Settings
            </h1>
            <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "4px" }}>
              Manage preferences and generate reports.
            </p>
          </div>

          {/* ── Report Generator card ─────────────────────────────────────── */}
          <div style={{
            background:   "#fff",
            border:       "1px solid #E5E7EB",
            borderRadius: "16px",
            overflow:     "hidden",
            boxShadow:    "0 1px 4px rgba(0,0,0,0.06)",
          }}>

            {/* Card header stripe */}
            <div style={{
              background:  "linear-gradient(135deg, #0B2E1E 0%, #0F3A27 60%, #1A5C3A 100%)",
              padding:     "20px 28px",
              display:     "flex",
              alignItems:  "center",
              gap:         "14px",
            }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "rgba(242,140,0,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "20px",
              }}>
                📊
              </div>
              <div>
                <h2 style={{ color: "#fff", fontSize: "17px", fontWeight: 700, margin: 0 }}>
                  Report Generator
                </h2>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", margin: 0 }}>
                  Configure filters and download PDF reports
                </p>
              </div>
            </div>

            <div style={{ padding: "28px" }}>

              {/* ── Step 1: Report category ───────────────────────────── */}
              <section style={{ marginBottom: "28px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  1 · Report Type
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {([
                    { value: "financial", label: "Financial Documents", icon: "💼", desc: "Invoices, Bills & Payments"   },
                    { value: "jobs",      label: "Jobs Status",         icon: "🏗️",  desc: "Pipeline & Status breakdown" },
                    { value: "timeline",  label: "Job Activity",        icon: "🕐",  desc: "Timeline audit per job"      },
                  ] as const).map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => set("category", cat.value)}
                      style={{
                        display:      "flex",
                        alignItems:   "center",
                        gap:          "12px",
                        padding:      "14px 20px",
                        border:       `2px solid ${filters.category === cat.value ? "#0B2E1E" : "#E5E7EB"}`,
                        borderRadius: "12px",
                        background:   filters.category === cat.value ? "#F0FDF4" : "#FAFAFA",
                        cursor:       "pointer",
                        transition:   "all 0.15s ease",
                        minWidth:     "200px",
                      }}
                    >
                      <span style={{ fontSize: "22px" }}>{cat.icon}</span>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>
                          {cat.label}
                        </p>
                        <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>{cat.desc}</p>
                      </div>
                      {filters.category === cat.value && (
                        <span style={{ marginLeft: "auto", color: "#059669", fontSize: "16px" }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <div style={{ height: "1px", background: "#F3F4F6", marginBottom: "28px" }} />

              {/* ══ TIMELINE FILTERS ══════════════════════════════════════ */}
              {isTimeline ? (
                <>
                  {/* Step 2: Job ID */}
                  <section style={{ marginBottom: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                      2 · Job ID
                    </p>
                    <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "12px", marginTop: 0 }}>
                      Enter the exact Job ID whose activity you want to report on{" "}
                      <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: "4px", fontSize: "11px" }}>
                        e.g. QID6-0001
                      </code>
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "300px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Job ID
                      </label>
                      <input
                        type="text"
                        value={filters.tlJobId}
                        onChange={e => set("tlJobId", e.target.value)}
                        placeholder="e.g. QID6-0001"
                        style={{
                          border: "1.5px solid #D1D5DB", borderRadius: "8px",
                          padding: "8px 12px", fontSize: "13px", color: "#111827",
                          background: "#fff", outline: "none",
                        }}
                      />
                    </div>
                  </section>

                  <div style={{ height: "1px", background: "#F3F4F6", marginBottom: "28px" }} />

                  {/* Step 3: Period */}
                  <section style={{ marginBottom: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                      3 · Period
                    </p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {TL_PERIODS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => set("tlPeriod", p.value)}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "flex-start",
                            gap: "2px", padding: "12px 18px",
                            border:       `2px solid ${filters.tlPeriod === p.value ? "#0B2E1E" : "#E5E7EB"}`,
                            borderRadius: "10px",
                            background:   filters.tlPeriod === p.value ? "#F0FDF4" : "#FAFAFA",
                            cursor: "pointer", transition: "all 0.15s ease", minWidth: "110px",
                          }}
                        >
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{p.label}</span>
                          <span style={{ fontSize: "10px", color: "#9CA3AF" }}>{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <div style={{ height: "1px", background: "#F3F4F6", marginBottom: "28px" }} />

                  {/* Step 4: Reference date */}
                  <section style={{ marginBottom: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                      4 · Reference Date
                    </p>
                    <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "12px", marginTop: 0 }}>
                      The report will cover the <strong>{filters.tlPeriod}</strong> that contains this date.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "200px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={filters.tlRefDate}
                        onChange={e => set("tlRefDate", e.target.value)}
                        style={{
                          border: "1.5px solid #D1D5DB", borderRadius: "8px",
                          padding: "8px 12px", fontSize: "13px", color: "#111827",
                          background: "#fff", outline: "none",
                        }}
                      />
                    </div>
                  </section>
                </>
              ) : (
                <>
                  {/* ══ FINANCIAL / JOBS FILTERS (unchanged) ══════════════ */}

                  {/* Step 2: Job type */}
                  <section style={{ marginBottom: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                      2 · Job Type
                    </p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {JOB_TYPES.map(jt => (
                        <FilterChip
                          key={jt.value}
                          active={filters.jobType === jt.value}
                          accent={jt.color}
                          onClick={() => set("jobType", jt.value)}
                        >
                          {jt.label}
                        </FilterChip>
                      ))}
                    </div>
                  </section>

                  <div style={{ height: "1px", background: "#F3F4F6", marginBottom: "28px" }} />

                  {/* Step 3: Time filters */}
                  <section style={{ marginBottom: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                      3 · Time Range
                    </p>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <div style={{ minWidth: "150px" }}>
                        <SelectField
                          label="Year"
                          value={filters.year}
                          onChange={v => set("year", v)}
                          options={YEARS.map(y => ({ value: y, label: y === "ALL" ? "All Years" : y }))}
                        />
                      </div>
                      {isFinancial && (
                        <div style={{ minWidth: "180px" }}>
                          <SelectField
                            label="Month"
                            value={filters.month}
                            onChange={v => set("month", v)}
                            options={MONTHS}
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Step 4: Document type (financial only) */}
                  {isFinancial && (
                    <>
                      <div style={{ height: "1px", background: "#F3F4F6", marginBottom: "28px" }} />
                      <section style={{ marginBottom: "28px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                          4 · Document Type
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {DOC_TYPES.map(dt => (
                            <FilterChip
                              key={dt.value}
                              active={filters.docType === dt.value}
                              onClick={() => set("docType", dt.value)}
                            >
                              {dt.icon} {dt.label}
                            </FilterChip>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}

              <div style={{ height: "1px", background: "#F3F4F6", marginBottom: "24px" }} />

              {/* ── Preview row ───────────────────────────────────────── */}
              <div style={{
                background:   "#F9FAFB",
                border:       "1px solid #E5E7EB",
                borderRadius: "10px",
                padding:      "14px 18px",
                marginBottom: "24px",
                display:      "flex",
                alignItems:   "center",
                gap:          "8px",
                flexWrap:     "wrap",
              }}>
                <span style={{ fontSize: "12px", color: "#9CA3AF", marginRight: "4px" }}>Selected:</span>
                {isTimeline ? (
                  <>
                    <PreviewTag label="Job"    value={filters.tlJobId || "—"} />
                    <PreviewTag label="Period" value={filters.tlPeriod} />
                    <PreviewTag label="Date"   value={filters.tlRefDate || today} />
                    <PreviewTag label="Report" value="Activity Timeline" />
                  </>
                ) : (
                  <>
                    <PreviewTag label="Type"  value={filters.jobType} />
                    <PreviewTag label="Year"  value={yearLabel} />
                    <PreviewTag label="Month" value={monthLabel} />
                    {isFinancial && <PreviewTag label="Docs" value={docLabel} />}
                    <PreviewTag label="Report" value={isFinancial ? "Financial" : "Jobs"} />
                  </>
                )}
              </div>

              {/* ── Error / success banners ───────────────────────────── */}
              {error && (
                <div style={{
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "13px", color: "#991B1B",
                }}>
                  <span>⚠️</span> {error}
                </div>
              )}
              {success && (
                <div style={{
                  background: "#F0FDF4", border: "1px solid #BBF7D0",
                  borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "13px", color: "#065F46",
                }}>
                  <span>✅</span> Report downloaded successfully!
                </div>
              )}

              {/* ── Action buttons ────────────────────────────────────── */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>

                <button
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "8px",
                    padding:      "12px 28px",
                    background:   loading ? "#6B7280" : "linear-gradient(135deg, #0B2E1E, #1A5C3A)",
                    color:        "#fff",
                    border:       "none",
                    borderRadius: "10px",
                    fontSize:     "14px",
                    fontWeight:   600,
                    cursor:       loading ? "not-allowed" : "pointer",
                    transition:   "all 0.15s ease",
                    boxShadow:    loading ? "none" : "0 2px 8px rgba(11,46,30,0.3)",
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: "14px", height: "14px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }} />
                      Generating PDF…
                    </>
                  ) : (
                    <> ⬇ Download PDF Report </>
                  )}
                </button>

                {/* JSON preview — financial & timeline only */}
                {(isFinancial || isTimeline) && (
                  <button
                    onClick={handlePreviewJSON}
                    disabled={loadingJson}
                    style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          "8px",
                      padding:      "12px 22px",
                      background:   "transparent",
                      color:        loadingJson ? "#9CA3AF" : "#0B2E1E",
                      border:       `1.5px solid ${loadingJson ? "#D1D5DB" : "#0B2E1E"}`,
                      borderRadius: "10px",
                      fontSize:     "14px",
                      fontWeight:   500,
                      cursor:       loadingJson ? "not-allowed" : "pointer",
                      transition:   "all 0.15s ease",
                    }}
                  >
                    {loadingJson ? "Loading…" : "{ } Preview JSON"}
                  </button>
                )}
              </div>

            </div>
          </div>

        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}