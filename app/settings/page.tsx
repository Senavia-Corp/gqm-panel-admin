"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type JobType   = "ALL" | "QID" | "PTL" | "PAR"
type DocType   = "all" | "invoices" | "bills" | "invoice_payments" | "bill_payments"
type TLPeriod  = "day" | "week" | "month"
type ReportCat = "jobs" | "financial" | "timeline" | "commission"

interface ReportFilters {
  category:  ReportCat
  jobType:   JobType
  year:      string
  month:     string
  docType:   DocType
  rep:       string
  clientId:  string
  // timeline-specific
  tlJobId:   string
  tlPeriod:  TLPeriod
  tlRefDate: string
  // commission-specific
  commMembers: string[]
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

const YEARS = ["ALL", "2026", "2025", "2024", "2023"]

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
    rep:       "ALL",
    clientId:  "ALL",
    tlJobId:   "",
    tlPeriod:  "month",
    tlRefDate: today,
    commMembers: [],
  })

  const [members,      setMembers]      = useState<any[]>([])
  const [membersTotal, setMembersTotal] = useState(0)
  const [membersPage,  setMembersPage]  = useState(1)
  const [membersQ,     setMembersQ]     = useState("")
  const [membersLoading, setMembersLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])

  const MEMBERS_LIMIT = 15
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loading,     setLoading]     = useState(false)
  const [loadingJson, setLoadingJson] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)

  const loadMembers = useCallback(async (page: number, q: string) => {
    setMembersLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(MEMBERS_LIMIT) })
      if (q.trim()) params.set("q", q.trim())
      const res = await apiFetch(`/api/members/table?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.results ?? [])
        setMembersTotal(data.total ?? 0)
      }
    } catch (err) {
      console.error("Error fetching members:", err)
    } finally {
      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  // Initial load — clients only; members load on demand when tab is opened
  useEffect(() => {
    async function fetchClients() {
      try {
        const cRes = await apiFetch("/api/clients")
        if (cRes.ok) {
          const cData = await cRes.json()
          setClients(Array.isArray(cData) ? cData : cData.results || [])
        }
      } catch (err) {
        console.error("Error fetching clients:", err)
      }
    }
    fetchClients()
  }, [])

  // Load members whenever commission tab is visible
  useEffect(() => {
    if (filters.category === "commission") {
      loadMembers(membersPage, membersQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category])

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
    } else if (filters.category === "commission") {
      if (filters.year !== "ALL") p.set("year", filters.year)
      if (filters.month !== "ALL") p.set("month", MONTHS.find(m => m.value === filters.month)?.label || "")
      filters.commMembers.forEach(mId => p.append("member_id", mId))
    } else {
      p.set("type", filters.jobType)
      if (filters.year  !== "ALL") p.set("year",  filters.year)
      if (filters.month !== "ALL") p.set("month", filters.month)
      if (filters.category === "financial") {
        if (filters.rep !== "ALL") p.set("rep", filters.rep)
        if (filters.clientId !== "ALL") p.set("client_id", filters.clientId)
      }
    }
    return p.toString()
  }

  async function handleDownloadReport() {
    const isTimeline = filters.category === "timeline"
    const isCommission = filters.category === "commission"

    if (isTimeline && !filters.tlJobId.trim()) {
      setError("Job ID is required for Timeline reports.")
      return
    }
    if (isCommission && filters.commMembers.length === 0) {
      setError("Please select at least one member.")
      return
    }

    setLoading(true); setError(null); setSuccess(false)
    try {
      const endpoint =
        filters.category === "financial"  ? "/api/financial/reports/pdf"  :
        filters.category === "timeline"   ? "/api/metrics/timeline/reports/pdf" :
        filters.category === "commission" ? "/api/commission/excel" :
                                            "/api/reports/jobs"
      
      const res = await apiFetch(`${endpoint}?${buildParams()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || body?.detail || `Error ${res.status}`)
      }
      
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      
      const ext = isCommission ? "xlsx" : "pdf"
      const dateStr = new Date().toISOString().split("T")[0]
      
      if (isTimeline) {
        a.download = `timeline_${filters.tlJobId}_${filters.tlPeriod}_${filters.tlRefDate}.${ext}`
      } else if (isCommission) {
        a.download = `commissions_report_${filters.year}_${filters.month}.${ext}`
      } else {
        a.download = `report_${filters.category}_${filters.year}.${ext}`
      }

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
    if (filters.category === "jobs" || filters.category === "commission") return
    if (filters.category === "timeline" && !filters.tlJobId.trim()) {
      setError("Job ID is required for Timeline reports.")
      return
    }
    setLoadingJson(true); setError(null)
    try {
      const endpoint = filters.category === "timeline"
        ? "/api/metrics/timeline/summary"
        : "/api/financial/summary"
      const res  = await apiFetch(`${endpoint}?${buildParams()}`)
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
  const isTimeline   = filters.category === "timeline"
  const isFinancial  = filters.category === "financial"
  const isCommission = filters.category === "commission"

  const repLabel    = filters.rep === "ALL" ? "All Reps" : filters.rep
  const clientLabel = filters.clientId === "ALL" ? "All Clients" : (clients.find(c => c.ID_Client === filters.clientId)?.Client_Community ?? filters.clientId)

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
                    { value: "financial", label: "Jobs Financial Report", icon: "💰", desc: "Quoted, Sold, Pct & Profitability" },
                    { value: "jobs",      label: "Jobs Status",         icon: "🏗️",  desc: "Pipeline & Status breakdown" },
                    { value: "timeline",  label: "Job Activity",        icon: "🕐",  desc: "Timeline audit per job"      },
                    { value: "commission", label: "Member Commissions", icon: "🎟️", desc: "Calculated earnings & history" },
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
              ) : isCommission ? (
                <>
                  {/* ══ COMMISSION FILTERS ═════════════════════════════════ */}
                  
                  {/* Step 2: Member selection */}
                  <section style={{ marginBottom: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                      2 · Select Members
                    </p>

                    {/* Search bar */}
                    <div style={{ position: "relative", marginBottom: "10px" }}>
                      <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "14px", pointerEvents: "none" }}>🔍</span>
                      <input
                        type="text"
                        placeholder="Search member..."
                        value={membersQ}
                        onChange={e => {
                          const q = e.target.value
                          setMembersQ(q)
                          setMembersPage(1)
                          if (debounceRef.current) clearTimeout(debounceRef.current)
                          debounceRef.current = setTimeout(() => loadMembers(1, q), 350)
                        }}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          border: "1.5px solid #D1D5DB", borderRadius: "8px",
                          padding: "7px 12px 7px 32px", fontSize: "13px",
                          color: "#111827", background: "#fff", outline: "none",
                        }}
                      />
                    </div>

                    {/* Checkbox grid */}
                    <div style={{ 
                      minHeight: "120px",
                      border: "1.5px solid #E5E7EB", borderRadius: "10px",
                      padding: "12px", background: "#FAFAFA",
                      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px",
                      position: "relative",
                    }}>
                      {membersLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} style={{
                            height: "30px", borderRadius: "6px",
                            background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
                            backgroundSize: "200% 100%",
                            animation: "shimmer 1.2s infinite",
                          }} />
                        ))
                      ) : members.length === 0 ? (
                        <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#9CA3AF", fontSize: "13px", margin: "16px 0" }}>
                          No members found.
                        </p>
                      ) : (
                        members.map(m => {
                          const isSelected = filters.commMembers.includes(m.ID_Member)
                          return (
                            <label key={m.ID_Member} style={{ 
                              display: "flex", alignItems: "center", gap: "8px", 
                              padding: "5px 10px", borderRadius: "6px",
                              background: isSelected ? "#fff" : "transparent",
                              border: `1px solid ${isSelected ? "#0B2E1E" : "transparent"}`,
                              cursor: "pointer", transition: "all 0.12s ease"
                            }}>
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    set("commMembers", filters.commMembers.filter(id => id !== m.ID_Member))
                                  } else {
                                    set("commMembers", [...filters.commMembers, m.ID_Member])
                                  }
                                }}
                                style={{ accentColor: "#0B2E1E", flexShrink: 0 }}
                              />
                              <span style={{ fontSize: "13px", color: isSelected ? "#0B2E1E" : "#374151", fontWeight: isSelected ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {m.Member_Name}
                              </span>
                            </label>
                          )
                        })
                      )}
                    </div>

                    {/* Footer: selection helpers + pagination */}
                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button 
                          onClick={() => set("commMembers", [...new Set([...filters.commMembers, ...members.map(m => m.ID_Member)])])}
                          style={{ fontSize: "11px", color: "#0B2E1E", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                        >
                          + Add page
                        </button>
                        <button 
                          onClick={() => set("commMembers", [])}
                          style={{ fontSize: "11px", color: "#6B7280", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                        >
                          Clear all
                        </button>
                        {filters.commMembers.length > 0 && (
                          <span style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>
                            {filters.commMembers.length} selected
                          </span>
                        )}
                      </div>

                      {/* Pagination */}
                      {membersTotal > MEMBERS_LIMIT && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            onClick={() => { const p = membersPage - 1; setMembersPage(p); loadMembers(p, membersQ) }}
                            disabled={membersPage <= 1 || membersLoading}
                            style={{
                              padding: "3px 10px", fontSize: "12px", borderRadius: "6px",
                              border: "1.5px solid #D1D5DB", background: "#fff",
                              cursor: membersPage <= 1 ? "not-allowed" : "pointer",
                              color: membersPage <= 1 ? "#D1D5DB" : "#374151",
                            }}
                          >‹</button>
                          <span style={{ fontSize: "12px", color: "#6B7280" }}>
                            {membersPage} / {Math.ceil(membersTotal / MEMBERS_LIMIT)}
                          </span>
                          <button
                            onClick={() => { const p = membersPage + 1; setMembersPage(p); loadMembers(p, membersQ) }}
                            disabled={membersPage >= Math.ceil(membersTotal / MEMBERS_LIMIT) || membersLoading}
                            style={{
                              padding: "3px 10px", fontSize: "12px", borderRadius: "6px",
                              border: "1.5px solid #D1D5DB", background: "#fff",
                              cursor: membersPage >= Math.ceil(membersTotal / MEMBERS_LIMIT) ? "not-allowed" : "pointer",
                              color: membersPage >= Math.ceil(membersTotal / MEMBERS_LIMIT) ? "#D1D5DB" : "#374151",
                            }}
                          >›</button>
                        </div>
                      )}
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
                      <div style={{ minWidth: "180px" }}>
                        <SelectField
                          label="Month"
                          value={filters.month}
                          onChange={v => set("month", v)}
                          options={MONTHS}
                        />
                      </div>
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
                ) : isCommission ? (
                  <>
                    <PreviewTag label="Members" value={filters.commMembers.length === 0 ? "None" : filters.commMembers.length === members.length ? "All" : `${filters.commMembers.length} selected`} />
                    <PreviewTag label="Year"    value={yearLabel} />
                    <PreviewTag label="Month"   value={monthLabel} />
                    <PreviewTag label="Report"  value="Commissions (Excel)" />
                  </>
                ) : (
                  <>
                    <PreviewTag label="Type"  value={filters.jobType} />
                    <PreviewTag label="Year"  value={yearLabel} />
                    <PreviewTag label="Month" value={monthLabel} />
                    {isFinancial && (
                      <>
                        <PreviewTag label="Rep"    value={repLabel} />
                        <PreviewTag label="Client" value={clientLabel} />
                      </>
                    )}
                    <PreviewTag label="Report" value={isFinancial ? "Jobs Financial" : "Jobs"} />
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
                  onClick={handleDownloadReport}
                  disabled={loading}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "8px",
                    padding:      "12px 28px",
                    background:   loading ? "#6B7280" : isCommission ? "linear-gradient(135deg, #1A5C3A, #059669)" : "linear-gradient(135deg, #0B2E1E, #1A5C3A)",
                    color:        "#fff",
                    border:       "none",
                    borderRadius: "10px",
                    fontSize:     "14px",
                    fontWeight:   600,
                    cursor:       loading ? "not-allowed" : "pointer",
                    transition:   "all 0.15s ease",
                    boxShadow:    loading ? "none" : isCommission ? "0 2px 8px rgba(5,150,105,0.3)" : "0 2px 8px rgba(11,46,30,0.3)",
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
                      {isCommission ? "Generating Excel…" : "Generating PDF…"}
                    </>
                  ) : (
                    <> {isCommission ? "⬇ Download Excel Report" : "⬇ Download PDF Report"} </>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  )
}