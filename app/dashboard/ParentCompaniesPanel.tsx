"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  BarChart2,
  Users,
  Info,
} from "lucide-react"

import { KpiCard } from "./components/KpiCard"
import { SectionCard } from "./components/SectionCard"
import { EmptyState } from "./components/EmptyState"
import { CardCarouselSkeleton, TableSkeleton } from "./components/LoadingSkeleton"

type JobTab  = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

interface Props { jobTab: JobTab; yearTab: YearTab }

// ─── Backend types ────────────────────────────────────────────────────────────

interface DashboardStats {
  total_amount_of_quotes: number
  dollars_quoted:         number
  in_progress_jobs_count: number
  dollars_in_progress:    number
  paid_jobs_count:        number
  dollars_paid:           number
  ave_target_sold_pct:    number   // 0–1
}

interface TopCommunity {
  name:      string
  total_jobs:number
  paid_jobs: number
  revenue:   number
}

interface CommunityAssignment {
  member_name: string
  community:   string
  revenue:     number
  job_count:   number
}

interface ParentCo {
  rank_closed:          number
  rank_revenue:         number
  client: {
    id:      string
    name:    string
    address: string
  }
  dashboard_stats:      DashboardStats
  communities_count:    number
  top_communities:      TopCommunity[]
  community_assignments:CommunityAssignment[]
}

interface ApiResponse {
  pagination: { page: number; limit: number; total_parent_mgmt_cos?: number; total_pages: number }
  parent_mgmt_cos: ParentCo[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtK = (v: number) => {
  if (!v) return "$0"
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(2)}`
}
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

function hashToIndex(str: string, mod: number) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % mod
}

const ACCENT_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
] as const

const getAccent = (id: string) => ACCENT_COLORS[hashToIndex(id, ACCENT_COLORS.length)]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParentCompaniesPanel({ jobTab, yearTab }: Props) {
  const [isLoading,  setIsLoading]  = useState(true)
  const [page,       setPage]       = useState(1)
  const limit = 25

  const [items,      setItems]      = useState<ParentCo[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search,     setSearch]     = useState("")
  const [orderBy,    setOrderBy]    = useState<"closed" | "revenue">("closed")

  // Reset on filter change
  useEffect(() => { setPage(1); setSelectedId(null) }, [jobTab, yearTab, orderBy])

  // Fetch
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)
        const qs = new URLSearchParams({ type: jobTab, page: String(page), limit: String(limit), order_by: orderBy, include_status_breakdown: "0" })
        if (yearTab !== "ALL") qs.set("year", yearTab)
        const res = await apiFetch(`/api/metrics/parent-mgmt-co?${qs}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: ApiResponse = await res.json()
        setItems(data.parent_mgmt_cos ?? [])
        setTotalPages(data.pagination?.total_pages ?? 1)
      } catch (e) {
        console.error("[ParentCompaniesPanel] error:", e)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [jobTab, yearTab, page, orderBy])

  const selected = useMemo(() => items.find((i) => i.client.id === selectedId) ?? null, [items, selectedId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.client.name.toLowerCase().includes(q))
  }, [items, search])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ===== Carousel ===================================================== */}
      <div className="mb-6 rounded-lg border-4 border-black bg-gqm-green-dark p-6 relative">
        {(["left", "right"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            aria-label={`Scroll ${dir}`}
            onClick={() => {
              const el = document.getElementById("parent-co-scroller")
              if (el) el.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" })
            }}
            className={[
              "absolute top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white",
              dir === "left" ? "left-2" : "right-2",
            ].join(" ")}
          >
            {dir === "left" ? <ChevronLeft className="h-6 w-6 text-black" /> : <ChevronRight className="h-6 w-6 text-black" />}
          </button>
        ))}

        <div
          id="parent-co-scroller"
          className="flex gap-4 overflow-x-auto pb-2 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0"
        >
          {isLoading ? (
            <CardCarouselSkeleton count={5} />
          ) : (
            items.map((co) => {
              const s      = co.dashboard_stats
              const accent = getAccent(co.client.id)
              return (
                <div
                  key={co.client.id}
                  className="flex-none w-[300px] rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <div className="p-5 flex-1">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={["h-10 w-10 shrink-0 rounded-full flex items-center justify-center", accent].join(" ")}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight text-sm truncate">{co.client.name}</p>
                        <p className="text-xs text-muted-foreground">{co.communities_count} communities</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="text-muted-foreground">Total Quotes</div>
                      <div className="text-right font-semibold tabular-nums">{s.total_amount_of_quotes}</div>

                      <div className="text-muted-foreground">$ Quoted</div>
                      <div className="text-right font-semibold tabular-nums">{fmtK(s.dollars_quoted)}</div>

                      <div className="text-muted-foreground"># In Progress</div>
                      <div className="text-right font-semibold tabular-nums">{s.in_progress_jobs_count}</div>

                      <div className="text-muted-foreground">$ In Progress</div>
                      <div className="text-right font-semibold tabular-nums text-sky-700">{fmtK(s.dollars_in_progress)}</div>

                      <div className="text-muted-foreground"># Paid Jobs</div>
                      <div className="text-right font-semibold tabular-nums">{s.paid_jobs_count}</div>

                      <div className="text-muted-foreground">$ Paid</div>
                      <div className="text-right font-semibold tabular-nums text-emerald-700">{fmtK(s.dollars_paid)}</div>

                      <div className="text-muted-foreground">Avg Target %</div>
                      <div className="text-right font-semibold tabular-nums">{fmtPct(s.ave_target_sold_pct)}</div>
                    </div>
                  </div>

                  <div className="px-5 py-2.5 mt-auto text-sm font-semibold text-black" style={{ backgroundColor: "#37D260" }}>
                    {fmtPct(s.ave_target_sold_pct)} Avg Target Sold
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="inline-flex rounded-lg border bg-white/10 p-1 text-xs">
            {(["closed", "revenue"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setOrderBy(v)}
                className={[
                  "rounded px-3 py-1 font-medium transition capitalize",
                  orderBy === v ? "bg-white text-gray-900 shadow" : "text-white/80",
                ].join(" ")}
              >
                By {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-white" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <span className="text-white text-sm">Page {page} / {Math.max(1, totalPages)}</span>
            <Button variant="outline" className="bg-white" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </div>

      {/* ===== Bottom: Picker + Detail ====================================== */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Picker */}
        <SectionCard title="All Parent Companies" subtitle="Click to see individual stats">
          <div className="relative mb-4">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies..." className="pl-9" />
          </div>
          {isLoading ? (
            <TableSkeleton rows={6} cols={3} />
          ) : (
            <div className="space-y-2">
              {filtered.map((co) => {
                const s      = co.dashboard_stats
                const accent = getAccent(co.client.id)
                const isSelected = selectedId === co.client.id
                return (
                  <button
                    key={co.client.id}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : co.client.id)}
                    className={[
                      "w-full rounded-xl border p-3 text-left transition hover:shadow-sm",
                      isSelected ? "border-gqm-green-dark bg-emerald-50" : "border-gray-200 bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={["h-9 w-9 shrink-0 rounded-full flex items-center justify-center", accent].join(" ")}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{co.client.name}</div>
                        <div className="text-xs text-muted-foreground">{co.communities_count} communities</div>
                      </div>
                      <div className="text-right text-xs shrink-0">
                        <div className="font-semibold text-emerald-700">{fmtK(s.dollars_paid)}</div>
                        <div className="text-muted-foreground">{s.paid_jobs_count} paid</div>
                      </div>
                    </div>
                  </button>
                )
              })}
              {filtered.length === 0 && <EmptyState message="No companies found." />}
            </div>
          )}
        </SectionCard>

        {/* Detail */}
        <SectionCard
          title={selected ? selected.client.name : "Individual Statistics"}
          subtitle={selected ? selected.client.address || "Select a company to see details" : "Select a company on the left"}
          action={selected ? (
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>Clear</Button>
          ) : undefined}
        >
          {!selected ? (
            <EmptyState message="Select a parent company to see detailed stats." />
          ) : (
            <div className="space-y-5">
              {/* KPI chips */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard title="Total Quotes"  value={String(selected.dashboard_stats.total_amount_of_quotes)} Icon={Briefcase}    accentClass="bg-slate-100 text-slate-700" />
                <KpiCard title="$ Quoted"      value={fmtK(selected.dashboard_stats.dollars_quoted)}           Icon={DollarSign}   accentClass="bg-blue-100 text-blue-700" />
                <KpiCard title="$ In Progress" value={fmtK(selected.dashboard_stats.dollars_in_progress)}      Icon={Clock}        accentClass="bg-sky-100 text-sky-700" />
                <KpiCard title="$ Paid"        value={fmtK(selected.dashboard_stats.dollars_paid)}             Icon={CheckCircle2} accentClass="bg-emerald-100 text-emerald-700" />
                <KpiCard title="Avg Target %" value={fmtPct(selected.dashboard_stats.ave_target_sold_pct)}     Icon={BarChart2}    accentClass="bg-violet-100 text-violet-700" />
                <KpiCard title="Communities"   value={String(selected.communities_count)}                       Icon={Users}        accentClass="bg-amber-100 text-amber-700" />
              </div>

              {/* Top communities */}
              {selected.top_communities?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Top Communities
                  </h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                        <th className="px-2 py-1.5 font-medium">Community</th>
                        <th className="px-2 py-1.5 font-medium text-right">Total Jobs</th>
                        <th className="px-2 py-1.5 font-medium text-right">Paid Jobs</th>
                        <th className="px-2 py-1.5 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.top_communities.map((c, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50 transition">
                          <td className="px-2 py-1.5 font-medium">{c.name}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{c.total_jobs}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{c.paid_jobs}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-emerald-700">{fmtK(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Community assignments by member */}
              {selected.community_assignments?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Community Assignment by Member
                  </h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                        <th className="px-2 py-1.5 font-medium">Member</th>
                        <th className="px-2 py-1.5 font-medium">Community</th>
                        <th className="px-2 py-1.5 font-medium text-right">Jobs</th>
                        <th className="px-2 py-1.5 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.community_assignments.map((a, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50 transition">
                          <td className="px-2 py-1.5 font-medium">{a.member_name}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{a.community}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{a.job_count}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-emerald-700">{fmtK(a.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}
