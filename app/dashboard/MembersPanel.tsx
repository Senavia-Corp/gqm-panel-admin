"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Info,
  Medal,
  ChevronLeft,
  ChevronRight,
  Search,
  CircleUserRound,
  Briefcase,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  BarChart2,
} from "lucide-react"

import { KpiCard } from "./components/KpiCard"
import { EmptyState } from "./components/EmptyState"
import { TableSkeleton, CardCarouselSkeleton } from "./components/LoadingSkeleton"
import { useTranslations } from "@/components/providers/LocaleProvider"

type JobTab  = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

interface Props {
  jobTab:  JobTab
  yearTab: YearTab
}

// ─── Backend response types ───────────────────────────────────────────────────

interface MemberSummary {
  total_quotes:        number
  total_quoted_usd:    number
  inprogress_count:    number
  inprogress_usd:      number
  paid_count:          number
  paid_usd:            number
  avg_sale_per_job:    number
  avg_target_sold_pct: number  // 0–1
}

interface ApiMember {
  rank:   number
  member: { id: string; name: string; company_role?: string | null }
  summary: MemberSummary
  buckets?: {
    pending: number; in_progress: number; completed: number
    cancelled: number; closed: number; completed_pct: number
  }
  status_breakdown?: Record<string, number>
}

interface ApiResponse {
  type:       JobTab
  year:       number | null
  pagination: { page: number; limit: number; total_members: number; total_pages: number }
  members:    ApiMember[]
}

interface PendingVendorQuote {
  qid:         string
  date:        string
  client:      string
  description: string
}

interface QidByMonth {
  year:             number
  month:            number
  month_key:        string
  label:            string
  count:            number
  total_quoted_usd: number
}

interface MemberDetail {
  member:               { id: string; name: string; company_role?: string | null }
  communities_assigned: number
  pending_vendor_quotes:PendingVendorQuote[]
  qids_by_month:        QidByMonth[]
  summary:              MemberSummary
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtK = (v: number) => {
  if (!v) return "$0"
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(2)}`
}
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

function medalIcon(rank: number) {
  if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />
  return null
}

function hashToIndex(str: string, mod: number) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % mod
}

const AVATAR_THEMES = [
  { bg: "bg-blue-100",    icon: "text-blue-700"    },
  { bg: "bg-emerald-100", icon: "text-emerald-700" },
  { bg: "bg-violet-100",  icon: "text-violet-700"  },
  { bg: "bg-amber-100",   icon: "text-amber-700"   },
  { bg: "bg-rose-100",    icon: "text-rose-700"    },
  { bg: "bg-cyan-100",    icon: "text-cyan-700"    },
  { bg: "bg-indigo-100",  icon: "text-indigo-700"  },
  { bg: "bg-lime-100",    icon: "text-lime-700"    },
  { bg: "bg-fuchsia-100", icon: "text-fuchsia-700" },
  { bg: "bg-teal-100",    icon: "text-teal-700"    },
] as const

function getAvatarTheme(id: string) {
  return AVATAR_THEMES[hashToIndex(id, AVATAR_THEMES.length)]
}

const BG_HEX: Record<string, string> = {
  "bg-blue-100":    "#DBEAFE",
  "bg-emerald-100": "#D1FAE5",
  "bg-violet-100":  "#EDE9FE",
  "bg-amber-100":   "#FEF3C7",
  "bg-rose-100":    "#FFE4E6",
  "bg-cyan-100":    "#CFFAFE",
  "bg-indigo-100":  "#E0E7FF",
  "bg-lime-100":    "#ECFCCB",
  "bg-fuchsia-100": "#FAE8FF",
  "bg-teal-100":    "#CCFBF1",
}
const bgHex = (cls: string) => BG_HEX[cls] ?? "#E5E7EB"

// ─── Component ────────────────────────────────────────────────────────────────

export default function MembersPanel({ jobTab, yearTab }: Props) {
  const t = useTranslations("dashboard")
  const tCommon = useTranslations("common")
  const [isLoading,     setIsLoading]     = useState(true)
  const [page,          setPage]          = useState(1)
  const limit = 50

  const [members,       setMembers]       = useState<ApiMember[]>([])
  const [totalPages,    setTotalPages]    = useState(1)

  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [detail,        setDetail]        = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [search,        setSearch]        = useState("")

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
    setDetail(null)
  }, [jobTab, yearTab])

  // ── List fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)
        const qs = new URLSearchParams({ type: jobTab, page: String(page), limit: String(limit) })
        if (yearTab !== "ALL") qs.set("year", yearTab)
        const res = await apiFetch(`/api/metrics/members/acc-rep-selling?${qs}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: ApiResponse = await res.json()
        setMembers(data.members ?? [])
        setTotalPages(data.pagination?.total_pages ?? 1)
      } catch (e) {
        console.error("[MembersPanel] list error:", e)
        setMembers([])
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [jobTab, yearTab, page])

  // ── Individual detail fetch ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    const run = async () => {
      try {
        setDetailLoading(true)
        const qs = yearTab !== "ALL" ? `?year=${yearTab}` : ""
        const res = await apiFetch(`/api/metrics/members/${selectedId}${qs}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: MemberDetail = await res.json()
        setDetail(data)
      } catch (e) {
        console.error("[MembersPanel] detail error:", e)
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    }
    run()
  }, [selectedId, yearTab])

  const top10 = useMemo(() => members.slice(0, 10), [members])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => (m.member.name ?? "").toLowerCase().includes(q))
  }, [members, search])

  const selectedMember = useMemo(
    () => members.find((m) => m.member.id === selectedId) ?? null,
    [members, selectedId]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ===== Carousel ===================================================== */}
      <div className="mb-6 rounded-lg border-4 border-black bg-gqm-green-dark p-3 sm:p-6 relative">

        {/* Arrows: desktop only */}
        {(["left", "right"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            aria-label={`Scroll ${dir}`}
            onClick={() => {
              const el = document.getElementById("members-cards-scroller")
              if (el) el.scrollBy({ left: dir === "left" ? -316 : 316, behavior: "smooth" })
            }}
            className={[
              "hidden sm:flex absolute top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white",
              dir === "left" ? "left-2" : "right-2",
            ].join(" ")}
          >
            {dir === "left"
              ? <ChevronLeft  className="h-6 w-6 text-black" />
              : <ChevronRight className="h-6 w-6 text-black" />}
          </button>
        ))}

        <div
          id="members-cards-scroller"
          className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [scroll-snap-type:x_mandatory] scroll-smooth"
        >
          {isLoading ? (
            <CardCarouselSkeleton count={5} />
          ) : (
            members.map((m) => {
              const s      = m.summary
              const avatar = getAvatarTheme(m.member.id)
              return (
                <div
                  key={m.member.id}
                  className="flex-none w-full sm:w-[300px] [scroll-snap-align:start] rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <div className="p-5 flex-1 relative">
                    {m.rank >= 1 && m.rank <= 3 && (
                      <div className="absolute right-3 top-3">{medalIcon(m.rank)}</div>
                    )}

                    {/* Header */}
                    <div className="flex items-start gap-3 pr-8">
                      <div className={["h-11 w-11 shrink-0 rounded-full flex items-center justify-center", avatar.bg].join(" ")}>
                        <CircleUserRound className={["h-6 w-6", avatar.icon].join(" ")} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight truncate text-sm">{m.member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.member.company_role ?? "—"}</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="text-muted-foreground">{t("statTotalQuotes")}</div>
                      <div className="text-right font-semibold tabular-nums">{s?.total_quotes ?? 0}</div>

                      <div className="text-muted-foreground">{t("statDollarsQuoted")}</div>
                      <div className="text-right font-semibold tabular-nums">{fmtK(s?.total_quoted_usd ?? 0)}</div>

                      <div className="text-muted-foreground">{t("statInProgressCount")}</div>
                      <div className="text-right font-semibold tabular-nums">{s?.inprogress_count ?? 0}</div>

                      <div className="text-muted-foreground">{t("statDollarsInProgress")}</div>
                      <div className="text-right font-semibold tabular-nums text-sky-700">{fmtK(s?.inprogress_usd ?? 0)}</div>

                      <div className="text-muted-foreground">{t("statPaidJobsCount")}</div>
                      <div className="text-right font-semibold tabular-nums">{s?.paid_count ?? 0}</div>

                      <div className="text-muted-foreground">{t("statDollarsPaid")}</div>
                      <div className="text-right font-semibold tabular-nums text-emerald-700">{fmtK(s?.paid_usd ?? 0)}</div>

                      <div className="text-muted-foreground">{t("statAvgSalePerJob")}</div>
                      <div className="text-right font-semibold tabular-nums">{fmtK(s?.avg_sale_per_job ?? 0)}</div>

                      <div className="text-muted-foreground">{t("statAvgTargetPct")}</div>
                      <div className="text-right font-semibold tabular-nums">{fmtPct(s?.avg_target_sold_pct ?? 0)}</div>
                    </div>
                  </div>

                  {/* Footer bar */}
                  <div className="px-5 py-2.5 mt-auto text-sm font-semibold text-black" style={{ backgroundColor: "#37D260" }}>
                    {fmtPct(s?.avg_target_sold_pct ?? 0)} {t("statAvgTargetSold")}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="bg-white h-8 px-2 sm:px-3" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">{t("prevPage")}</span>
          </Button>
          <span className="text-white text-sm tabular-nums">{page} / {Math.max(1, totalPages)}</span>
          <Button variant="outline" size="sm" className="bg-white h-8 px-2 sm:px-3" disabled={page >= Math.max(1, totalPages) || isLoading} onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))}>
            <ChevronRight className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">{t("nextPage")}</span>
          </Button>
        </div>
      </div>

      {/* ===== Bottom grid: Top 10 + Individual Stats ======================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

        {/* Top 10 by paid */}
        <div className="rounded-lg bg-gqm-green-dark p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h2 className="text-white text-base sm:text-lg font-semibold">{t("top10PaidJobs")}</h2>
              <p className="text-white/70 text-xs sm:text-sm mt-0.5">{t("top10Subtitle")}</p>
            </div>
            <div title={t("paidJobsCountTooltip")} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Info className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            {top10.length === 0 && !isLoading ? (
              <p className="text-white/70 text-sm">{t("noData")}</p>
            ) : (
              top10.map((m) => {
                const paid   = m.summary?.paid_count ?? 0
                const max    = top10[0]?.summary?.paid_count ?? 1
                const pct    = max > 0 ? Math.round((paid / max) * 100) : 0
                const avatar = getAvatarTheme(m.member.id)
                return (
                  <div
                    key={m.member.id}
                    className="grid items-center gap-2 sm:gap-3 [grid-template-columns:32px_minmax(0,1fr)_64px] sm:[grid-template-columns:44px_200px_1fr]"
                  >
                    <div className="flex justify-center">
                      {m.rank <= 3
                        ? medalIcon(m.rank)
                        : <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/10 text-white text-xs flex items-center justify-center">{m.rank}</div>}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={["h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0", avatar.bg].join(" ")}>
                        <CircleUserRound className={["h-4 w-4 sm:h-5 sm:w-5", avatar.icon].join(" ")} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-xs sm:text-sm truncate">{m.member.name}</div>
                        <div className="text-white/70 text-xs truncate hidden sm:block">{m.member.company_role ?? "—"}</div>
                      </div>
                    </div>
                    <div className="w-full">
                      <div className="h-8 sm:h-9 rounded-lg bg-white/95 overflow-hidden relative">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${bgHex(avatar.bg)} 100%)`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2 sm:pr-3">
                          <span className="text-xs sm:text-sm font-semibold tabular-nums text-black">{paid}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Individual stats */}
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold">{t("individualMemberStats")}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {selectedMember ? `${t("detailsFor")} ${selectedMember.member.name}` : t("selectMemberBelow")}
              </p>
            </div>
            {selectedId && (
              <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); setDetail(null) }}>
                {tCommon("back")}
              </Button>
            )}
          </div>

          {!selectedId ? (
            <>
              <div className="mt-4 relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchMembers")} className="pl-9" />
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((m) => {
                  const avatar = getAvatarTheme(m.member.id)
                  return (
                    <button
                      key={m.member.id}
                      type="button"
                      onClick={() => setSelectedId(m.member.id)}
                      className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 hover:shadow-sm transition flex flex-col"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight text-sm">{m.member.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{m.member.company_role ?? "—"}</div>
                        </div>
                        <div className={["h-9 w-9 rounded-full flex items-center justify-center shrink-0", avatar.bg].join(" ")}>
                          <CircleUserRound className={["h-4 w-4", avatar.icon].join(" ")} />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">{t("statQuotes")}</span>
                        <span className="text-right font-semibold">{m.summary?.total_quotes ?? 0}</span>
                        <span className="text-muted-foreground">{t("statDollarsPaid")}</span>
                        <span className="text-right font-semibold text-emerald-700">{fmtK(m.summary?.paid_usd ?? 0)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : detailLoading ? (
            <div className="mt-6 space-y-3">
              <TableSkeleton rows={4} cols={2} />
            </div>
          ) : detail ? (
            <div className="mt-5 space-y-5">
              {/* KPI chips */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard title={t("statTotalQuotes")}       value={String(detail.summary.total_quotes)}        Icon={Briefcase}    accentClass="bg-slate-100 text-slate-700" />
                <KpiCard title={t("statDollarsQuoted")}     value={fmtK(detail.summary.total_quoted_usd)}      Icon={DollarSign}   accentClass="bg-blue-100 text-blue-700" />
                <KpiCard title={t("statDollarsInProgress")} value={fmtK(detail.summary.inprogress_usd)}        Icon={Clock}        accentClass="bg-sky-100 text-sky-700" />
                <KpiCard title={t("statDollarsPaid")}       value={fmtK(detail.summary.paid_usd)}              Icon={CheckCircle2} accentClass="bg-emerald-100 text-emerald-700" />
                <KpiCard title={t("statAvgSalePerJob")}     value={fmtK(detail.summary.avg_sale_per_job)}      Icon={TrendingUp}   accentClass="bg-amber-100 text-amber-700" />
                <KpiCard title={t("statAvgTargetPct")}      value={fmtPct(detail.summary.avg_target_sold_pct)} Icon={BarChart2}    accentClass="bg-violet-100 text-violet-700" />
              </div>

              {/* Communities assigned */}
              <div className="flex items-center justify-between rounded-xl border p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t("communitiesAssigned")}
                </div>
                <span className="text-2xl font-bold tabular-nums">{detail.communities_assigned}</span>
              </div>

              {/* Pending vendor quotes */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-amber-500" />
                  {t("qidsWithPendingVendorQuote")}
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">
                    {detail.pending_vendor_quotes.length}
                  </span>
                </h3>
                {detail.pending_vendor_quotes.length === 0 ? (
                  <EmptyState message={t("noPendingVendorQuotes")} />
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-2">
                      {detail.pending_vendor_quotes.map((q) => (
                        <div key={q.qid} className="rounded-lg border bg-white p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-semibold text-gqm-green-dark">{q.qid}</span>
                            <span className="tabular-nums text-muted-foreground">{q.date}</span>
                          </div>
                          <p className="font-medium truncate">{q.client}</p>
                          <p className="text-muted-foreground truncate">{q.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                            <th className="px-2 py-1.5 font-medium">QID</th>
                            <th className="px-2 py-1.5 font-medium">{t("colDate")}</th>
                            <th className="px-2 py-1.5 font-medium">{t("colClient")}</th>
                            <th className="px-2 py-1.5 font-medium">{t("colDescription")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.pending_vendor_quotes.map((q) => (
                            <tr key={q.qid} className="border-b hover:bg-gray-50 transition">
                              <td className="px-2 py-1.5 font-mono font-semibold text-gqm-green-dark">{q.qid}</td>
                              <td className="px-2 py-1.5 tabular-nums">{q.date}</td>
                              <td className="px-2 py-1.5">{q.client}</td>
                              <td className="px-2 py-1.5 text-muted-foreground max-w-[160px] truncate">{q.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* QIDs by month */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-violet-500" />
                  {t("qidsCreatedPerMonth")}
                </h3>
                {detail.qids_by_month.length === 0 ? (
                  <EmptyState message={t("noMonthlyData")} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                          <th className="px-2 py-1.5 font-medium">{t("colMonth")}</th>
                          <th className="px-2 py-1.5 font-medium text-right">{t("colQidsCreated")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.qids_by_month.map((row) => (
                          <tr key={row.month_key} className="border-b hover:bg-gray-50 transition">
                            <td className="px-2 py-1.5 font-medium">{row.label || row.month_key}</td>
                            <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState message={t("errorLoadMemberDetails")} />
          )}
        </div>
      </div>
    </>
  )
}
