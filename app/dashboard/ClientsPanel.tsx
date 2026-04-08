"use client"

import React, { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Info,
  Medal,
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  Home,
  Lock,
  DollarSign,
  ClipboardList,
  Timer,
  CheckCircle2,
  XCircle,
} from "lucide-react"

type JobTab = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

type Props = {
  jobTab: JobTab
  yearTab: YearTab
}

type RankOrder = "closed" | "revenue"
type EntityMode = "PARENT" | "CLIENT"

type RevenueBlock = { all: number; qid: number; ptl: number; par: number }

type ApiBuckets = {
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  closed: number
  completed_pct: number
}

type ApiTotals = { all: number; qid: number; ptl: number; par: number }

type ApiEntityCommon = {
  totals: ApiTotals
  buckets: ApiBuckets
  bucket_by_type?: Record<string, ApiBuckets>
  revenue: RevenueBlock
  rank_closed: number
  rank_revenue: number
  status_breakdown?: Record<string, number>
}

type ApiClientRow = ApiEntityCommon & {
  client: { id: string; name: string; address?: string | null }
}

type ApiParentRow = ApiEntityCommon & {
  parent_mgmt_co: { id: string; name: string; hq?: string | null }
}

type ClientsResponse = {
  type: JobTab
  year: number | null
  order_by: RankOrder
  pagination: { page: number; limit: number; total_clients: number; total_pages: number }
  clients: ApiClientRow[]
}

type ParentsResponse = {
  type: JobTab
  year: number | null
  order_by: RankOrder
  pagination: { page: number; limit: number; total_parent_mgmt_cos: number; total_pages: number }
  parent_mgmt_cos: ApiParentRow[]
}

const PENDING_HELP =
  "Pending includes: Assigned/P. Quote, Waiting for Approval, HOLD, Received-Stand By."
const INPROGRESS_HELP =
  "In Progress includes: Scheduled / Work in Progress, Assigned-In progress, In Progress."
const COMPLETED_HELP =
  "Completed includes: Completed P. INV / POs, Invoiced, PAID, Warranty, Completed PVI, Paid."
const CANCELLED_HELP = "Cancelled includes: Cancelled."
const CLOSED_HELP = 'Closed Jobs are jobs with status "PAID" (QID/PAR) or "Paid" (PTL).'
const REVENUE_HELP =
  "Revenue is calculated using Gqm_final_sold_pricing for QID/PTL, and Gqm_target_sold_pricing for PAR."

function medalIcon(rank: number) {
  if (rank === 1) return <Medal className="h-6 w-6 text-yellow-500" />
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />
  return null
}

function hashToIndex(str: string, mod: number) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % mod
}

function getAvatarTheme(id: string) {
  const themes = [
    { bg: "bg-blue-100", icon: "text-blue-700" },
    { bg: "bg-emerald-100", icon: "text-emerald-700" },
    { bg: "bg-violet-100", icon: "text-violet-700" },
    { bg: "bg-amber-100", icon: "text-amber-700" },
    { bg: "bg-rose-100", icon: "text-rose-700" },
    { bg: "bg-cyan-100", icon: "text-cyan-700" },
    { bg: "bg-indigo-100", icon: "text-indigo-700" },
    { bg: "bg-lime-100", icon: "text-lime-700" },
    { bg: "bg-fuchsia-100", icon: "text-fuchsia-700" },
    { bg: "bg-teal-100", icon: "text-teal-700" },
  ] as const

  return themes[hashToIndex(id, themes.length)]
}

function avatarBgToHex(bgClass: string) {
  const map: Record<string, string> = {
    "bg-blue-100": "#DBEAFE",
    "bg-emerald-100": "#D1FAE5",
    "bg-violet-100": "#EDE9FE",
    "bg-amber-100": "#FEF3C7",
    "bg-rose-100": "#FFE4E6",
    "bg-cyan-100": "#CFFAFE",
    "bg-indigo-100": "#E0E7FF",
    "bg-lime-100": "#ECFCCB",
    "bg-fuchsia-100": "#FAE8FF",
    "bg-teal-100": "#CCFBF1",
  }
  return map[bgClass] ?? "#E5E7EB"
}

function StatChip({
  label,
  value,
  Icon,
  accentClass,
}: {
  label: string
  value: number | string
  Icon: React.ElementType
  accentClass: string
}) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={["inline-flex h-8 w-8 items-center justify-center rounded-lg", accentClass].join(" ")}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function formatMoney(n: number) {
  const safe = Number.isFinite(n) ? n : 0
  return safe.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

type NormalizedRow = {
  id: string
  name: string
  address: string
  totals: ApiTotals
  buckets: ApiBuckets
  revenue: RevenueBlock
  rankClosed: number
  rankRevenue: number
  statusBreakdown?: Record<string, number>
}

export default function ClientsPanel({ jobTab, yearTab }: Props) {
  const { hasPermission } = usePermissions()
  const canReadParents = hasPermission("parent_mgmt_co:read")
  const canReadClients = hasPermission("client:read")

  // Default mode based on permissions
  const [entityMode, setEntityMode] = useState<EntityMode>(canReadParents ? "PARENT" : "CLIENT")
  const [orderBy, setOrderBy] = useState<RankOrder>("closed") // default as requested

  // If permissions change or initial load, ensure entityMode is valid
  useEffect(() => {
    if (entityMode === "PARENT" && !canReadParents && canReadClients) {
      setEntityMode("CLIENT")
    } else if (entityMode === "CLIENT" && !canReadClients && canReadParents) {
      setEntityMode("PARENT")
    }
  }, [canReadParents, canReadClients])

  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 50

  const [rows, setRows] = useState<NormalizedRow[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // extra fetch: top10 revenue always
  const [topRevenue, setTopRevenue] = useState<NormalizedRow[]>([])
  const [isLoadingTopRevenue, setIsLoadingTopRevenue] = useState(true)

  // ✅ NEW: top10 closed always (left bottom card must not change with toggle)
  const [topClosed, setTopClosed] = useState<NormalizedRow[]>([])
  const [isLoadingTopClosed, setIsLoadingTopClosed] = useState(true)

  // individual section
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // reset when filters/toggles change
  useEffect(() => {
    setPage(1)
    setSelectedId(null)
    setSearch("")
  }, [jobTab, yearTab, entityMode, orderBy])

  const fetchEntity = async (opts: { entityMode: EntityMode; orderBy: RankOrder; page: number; limit: number }) => {
    const qs = new URLSearchParams({
      type: jobTab,
      page: String(opts.page),
      limit: String(opts.limit),
      include_status_breakdown: "1",
      order_by: opts.orderBy,
    })
    if (yearTab !== "ALL") qs.set("year", yearTab)

    const url =
      opts.entityMode === "PARENT"
        ? `/api/metrics/parent-mgmt-co?${qs.toString()}`
        : `/api/metrics/clients?${qs.toString()}`

    const res = await apiFetch(url, { cache: "no-store" })
    if (!res.ok) throw new Error(`Failed clients metrics: ${res.status}`)
    return res.json()
  }

  // main list fetch (carousel + pagination) -> this DOES follow orderBy toggle
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)

        const data: ClientsResponse | ParentsResponse = await fetchEntity({ entityMode, orderBy, page, limit })

        if ("clients" in data) {
          const normalized: NormalizedRow[] = (data.clients ?? []).map((r) => ({
            id: r.client.id,
            name: r.client.name,
            address: r.client.address ?? "—",
            totals: r.totals,
            buckets: r.buckets,
            revenue: r.revenue,
            rankClosed: r.rank_closed,
            rankRevenue: r.rank_revenue,
            statusBreakdown: r.status_breakdown,
          }))
          setRows(normalized)
          setTotalPages(data.pagination?.total_pages ?? 1)
        } else {
          const normalized: NormalizedRow[] = (data.parent_mgmt_cos ?? []).map((r) => ({
            id: r.parent_mgmt_co.id,
            name: r.parent_mgmt_co.name,
            address: r.parent_mgmt_co.hq ?? "—",
            totals: r.totals,
            buckets: r.buckets,
            revenue: r.revenue,
            rankClosed: r.rank_closed,
            rankRevenue: r.rank_revenue,
            statusBreakdown: r.status_breakdown,
          }))
          setRows(normalized)
          setTotalPages(data.pagination?.total_pages ?? 1)
        }
      } catch (e) {
        console.error("[clients] metrics error:", e)
        setRows([])
        setTotalPages(1)
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [jobTab, yearTab, entityMode, orderBy, page])

  // top 10 revenue (always revenue)
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoadingTopRevenue(true)
        const data: ClientsResponse | ParentsResponse = await fetchEntity({
          entityMode,
          orderBy: "revenue",
          page: 1,
          limit: 10,
        })

        if ("clients" in data) {
          setTopRevenue(
            (data.clients ?? []).map((r) => ({
              id: r.client.id,
              name: r.client.name,
              address: r.client.address ?? "—",
              totals: r.totals,
              buckets: r.buckets,
              revenue: r.revenue,
              rankClosed: r.rank_closed,
              rankRevenue: r.rank_revenue,
              statusBreakdown: r.status_breakdown,
            }))
          )
        } else {
          setTopRevenue(
            (data.parent_mgmt_cos ?? []).map((r) => ({
              id: r.parent_mgmt_co.id,
              name: r.parent_mgmt_co.name,
              address: r.parent_mgmt_co.hq ?? "—",
              totals: r.totals,
              buckets: r.buckets,
              revenue: r.revenue,
              rankClosed: r.rank_closed,
              rankRevenue: r.rank_revenue,
              statusBreakdown: r.status_breakdown,
            }))
          )
        }
      } catch (e) {
        console.error("[clients] top revenue error:", e)
        setTopRevenue([])
      } finally {
        setIsLoadingTopRevenue(false)
      }
    }

    run()
  }, [jobTab, yearTab, entityMode])

  // ✅ NEW: top 10 closed (always closed) -> left bottom card fixed
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoadingTopClosed(true)
        const data: ClientsResponse | ParentsResponse = await fetchEntity({
          entityMode,
          orderBy: "closed",
          page: 1,
          limit: 10,
        })

        if ("clients" in data) {
          setTopClosed(
            (data.clients ?? []).map((r) => ({
              id: r.client.id,
              name: r.client.name,
              address: r.client.address ?? "—",
              totals: r.totals,
              buckets: r.buckets,
              revenue: r.revenue,
              rankClosed: r.rank_closed,
              rankRevenue: r.rank_revenue,
              statusBreakdown: r.status_breakdown,
            }))
          )
        } else {
          setTopClosed(
            (data.parent_mgmt_cos ?? []).map((r) => ({
              id: r.parent_mgmt_co.id,
              name: r.parent_mgmt_co.name,
              address: r.parent_mgmt_co.hq ?? "—",
              totals: r.totals,
              buckets: r.buckets,
              revenue: r.revenue,
              rankClosed: r.rank_closed,
              rankRevenue: r.rank_revenue,
              statusBreakdown: r.status_breakdown,
            }))
          )
        }
      } catch (e) {
        console.error("[clients] top closed error:", e)
        setTopClosed([])
      } finally {
        setIsLoadingTopClosed(false)
      }
    }

    run()
  }, [jobTab, yearTab, entityMode])

  const selected = useMemo(() => rows.find((x) => x.id === selectedId) ?? null, [rows, selectedId])

  const pageLabel = useMemo(() => {
    const safe = Math.max(1, totalPages)
    return `Page ${page} / ${safe}`
  }, [page, totalPages])

  const filteredForPicker = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => (r.name ?? "").toLowerCase().includes(q))
  }, [rows, search])

  const InfoTitle = useMemo(() => {
    return [PENDING_HELP, INPROGRESS_HELP, COMPLETED_HELP, CANCELLED_HELP, CLOSED_HELP, REVENUE_HELP].join("\n")
  }, [])

  const RankTitle = useMemo(() => {
    if (orderBy === "closed") return "Ranking by closed jobs"
    return "Ranking by revenue"
  }, [orderBy])

  const entityLabel = entityMode === "PARENT" ? "Parent Companies" : "Clients"

  if (!canReadParents && !canReadClients) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground bg-white">
        <Lock className="h-10 w-10 mb-4 opacity-20" />
        <h3 className="text-lg font-semibold text-slate-900">Access Denied</h3>
        <p className="max-w-xs mt-2">You do not have permissions to view client or company metrics.</p>
      </div>
    )
  }

  return (
    <>
      {/* ===== 1) Carousel cards (summary) ===== */}
      <div className="mb-6 bg-gqm-green-dark rounded-lg p-6 border-4 border-black relative">
        {/* Toggles row (inside the cards area) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border bg-white p-1">
            {canReadParents && (
              <Button
                variant={entityMode === "PARENT" ? "default" : "ghost"}
                className={entityMode === "PARENT" ? "bg-gqm-green text-white" : ""}
                onClick={() => setEntityMode("PARENT")}
              >
                Parent Companies
              </Button>
            )}
            {canReadClients && (
              <Button
                variant={entityMode === "CLIENT" ? "default" : "ghost"}
                className={entityMode === "CLIENT" ? "bg-gqm-green text-white" : ""}
                onClick={() => setEntityMode("CLIENT")}
              >
                Clients
              </Button>
            )}
          </div>

          <div className="inline-flex rounded-lg border bg-white p-1">
            <Button
              variant={orderBy === "closed" ? "default" : "ghost"}
              className={orderBy === "closed" ? "bg-gqm-green text-white" : ""}
              onClick={() => setOrderBy("closed")}
            >
              Closed Rank
            </Button>
            <Button
              variant={orderBy === "revenue" ? "default" : "ghost"}
              className={orderBy === "revenue" ? "bg-gqm-green text-white" : ""}
              onClick={() => setOrderBy("revenue")}
            >
              Revenue Rank
            </Button>
          </div>
        </div>

        {/* Left arrow */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("clients-cards-scroller")
            if (!el) return
            el.scrollBy({ left: -340, behavior: "smooth" })
          }}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
        >
          <ChevronLeft className="h-6 w-6 text-black" />
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("clients-cards-scroller")
            if (!el) return
            el.scrollBy({ left: 340, behavior: "smooth" })
          }}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
        >
          <ChevronRight className="h-6 w-6 text-black" />
        </button>

        <div
          id="clients-cards-scroller"
          className="
            flex gap-4 overflow-x-auto pb-2 pr-2
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:h-0
            [&::-webkit-scrollbar]:w-0
          "
          style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
        >
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex-none w-[360px] rounded-xl bg-white overflow-hidden">
                  <div className="p-6">
                    <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mb-3" />
                    <div className="h-3 w-64 bg-gray-100 rounded animate-pulse mb-5" />
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                      {Array.from({ length: 6 }).map((__, i) => (
                        <div key={i} className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                  <div className="px-6 py-3" style={{ backgroundColor: "#37D260" }}>
                    <div className="h-4 w-44 bg-black/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            rows.map((r) => {
              const rank = orderBy === "closed" ? r.rankClosed : r.rankRevenue
              const pct = Number(r.buckets?.completed_pct ?? 0)
              const avatar = getAvatarTheme(r.id)
              const EntityIcon = entityMode === "PARENT" ? Building2 : Home

              return (
                <div
                  key={r.id}
                  className="flex-none w-[360px] rounded-xl bg-white overflow-hidden border-0 shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <div className="p-6 relative flex-1">
                    {/* Info tooltip */}
                    <div className="absolute left-3 top-3">
                      <div
                        title={InfoTitle}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
                      >
                        <Info className="h-4 w-4 text-gray-700" />
                      </div>
                    </div>

                    {/* Medal top 3 */}
                    {rank >= 1 && rank <= 3 && <div className="absolute right-3 top-3">{medalIcon(rank)}</div>}

                    {/* Header */}
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-start pt-8">
                      <div className="min-w-0 pr-1">
                        <p className="text-lg font-semibold leading-tight truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.address || "—"}</p>
                      </div>

                      <div className={["h-12 w-12 rounded-full flex items-center justify-center", avatar.bg].join(" ")}>
                        <EntityIcon className={["h-6 w-6", avatar.icon].join(" ")} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Total Jobs</div>
                      <div className="text-right font-semibold tabular-nums">{r.totals?.all ?? 0}</div>

                      <div className="text-muted-foreground">Pending Jobs</div>
                      <div className="text-right font-semibold tabular-nums">{r.buckets?.pending ?? 0}</div>

                      <div className="text-muted-foreground">In Progress</div>
                      <div className="text-right font-semibold tabular-nums">{r.buckets?.in_progress ?? 0}</div>

                      <div className="text-muted-foreground">Completed</div>
                      <div className="text-right font-semibold tabular-nums">{r.buckets?.completed ?? 0}</div>

                      <div className="text-muted-foreground">Cancelled</div>
                      <div className="text-right font-semibold tabular-nums">{r.buckets?.cancelled ?? 0}</div>

                      <div className="text-muted-foreground">Revenue</div>
                      <div className="text-right font-semibold tabular-nums">{formatMoney(r.revenue?.all ?? 0)}</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 mt-auto" style={{ backgroundColor: "#37D260" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-black">{pct.toFixed(2)}% of Jobs Completed</div>
                      <div className="text-xs font-semibold text-black/80">{RankTitle}</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="bg-white"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="text-white text-sm">{pageLabel}</span>
          <Button
            variant="outline"
            className="bg-white"
            disabled={page >= Math.max(1, totalPages) || isLoading}
            onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* ===== 2) Bottom grid: Top10 Closed + Top10 Revenue ===== */}
      <div className="grid gap-6 mb-6 md:grid-cols-2">
        {/* ✅ Left: top10 CLOSED ALWAYS (does NOT change with orderBy toggle) */}
        <div className="bg-gqm-green-dark rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-lg font-semibold">Top 10 {entityLabel} with most closed Jobs</h2>
              <p className="text-white/80 text-sm mt-1">Ranking by closed jobs</p>
            </div>

            <div
              title={CLOSED_HELP}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
            >
              <Info className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {topClosed.length === 0 && !isLoadingTopClosed ? (
              <p className="text-white/80 text-sm">No data.</p>
            ) : (
              topClosed.map((r) => {
                const rank = r.rankClosed
                const metric = r.buckets?.closed ?? 0
                const maxMetric = topClosed[0]?.buckets?.closed ?? 1
                const pct = maxMetric > 0 ? Math.round((metric / maxMetric) * 100) : 0

                const avatar = getAvatarTheme(r.id)
                const barColor = avatarBgToHex(avatar.bg)
                const EntityIcon = entityMode === "PARENT" ? Building2 : Home

                return (
                  <div key={r.id} className="grid items-center gap-3 [grid-template-columns:44px_260px_1fr]">
                    <div className="flex justify-center">
                      {rank <= 3 ? (
                        medalIcon(rank)
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white/10 text-white text-xs flex items-center justify-center">
                          {rank}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={["h-10 w-10 rounded-full flex items-center justify-center shrink-0", avatar.bg].join(
                          " "
                        )}
                      >
                        <EntityIcon className={["h-5 w-5", avatar.icon].join(" ")} />
                      </div>

                      <div className="min-w-0 leading-tight">
                        <div className="text-white font-semibold text-sm truncate">{r.name}</div>
                        <div className="text-white/75 text-xs truncate">{r.address || "—"}</div>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="h-10 rounded-lg bg-white/95 overflow-hidden relative">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundImage: `linear-gradient(90deg,
                              rgba(255,255,255,0) 0%,
                              rgba(255,255,255,0) 20%,
                              ${barColor} 100%
                            )`,
                            opacity: 1,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <span className="text-sm font-semibold tabular-nums text-black">{metric}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: top 10 revenue always (white background) */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Top 10 {entityLabel} by Revenue</h2>
              <p className="text-sm text-muted-foreground mt-1">Ranking by revenue</p>
            </div>

            <div title={REVENUE_HELP} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <Info className="h-4 w-4 text-gray-700" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {topRevenue.length === 0 && !isLoadingTopRevenue ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              topRevenue.map((r) => {
                const rank = r.rankRevenue
                const metric = r.revenue?.all ?? 0
                const maxMetric = topRevenue[0]?.revenue?.all ?? 1
                const pct = maxMetric > 0 ? Math.round((metric / maxMetric) * 100) : 0

                const avatar = getAvatarTheme(r.id)
                const barColor = avatarBgToHex(avatar.bg)
                const EntityIcon = entityMode === "PARENT" ? Building2 : Home

                return (
                  <div key={r.id} className="grid items-center gap-3 [grid-template-columns:44px_260px_1fr]">
                    <div className="flex justify-center">
                      {rank <= 3 ? (
                        medalIcon(rank)
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-800 text-xs flex items-center justify-center">
                          {rank}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={["h-10 w-10 rounded-full flex items-center justify-center shrink-0", avatar.bg].join(
                          " "
                        )}
                      >
                        <EntityIcon className={["h-5 w-5", avatar.icon].join(" ")} />
                      </div>

                      <div className="min-w-0 leading-tight">
                        <div className="font-semibold text-sm truncate">{r.name}</div>
                        <div className="text-muted-foreground text-xs truncate">{r.address || "—"}</div>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="h-10 rounded-lg bg-gray-50 overflow-hidden relative border">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundImage: `linear-gradient(90deg,
                              rgba(255,255,255,0) 0%,
                              rgba(255,255,255,0) 20%,
                              ${barColor} 100%
                            )`,
                            opacity: 1,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <span className="text-sm font-semibold tabular-nums text-gray-900">{formatMoney(metric)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ===== 3) Individual Statistics (full width like cards area) ===== */}
      <div className="mb-6 bg-gqm-green-dark rounded-lg p-6 border-4 border-black">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white text-lg font-semibold">Individual {entityLabel} Statistics</h2>
            <p className="text-white/80 text-sm mt-1">
              {selected
                ? "Detailed breakdown for this selection"
                : `Search and select a ${entityMode === "PARENT" ? "parent company" : "client"} to see detailed data`}
            </p>
          </div>

          {selected && (
            <Button variant="outline" className="bg-white" onClick={() => setSelectedId(null)}>
              Back
            </Button>
          )}
        </div>

        {!selected ? (
          <>
            <div className="mt-4 relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${entityMode === "PARENT" ? "parent companies" : "clients"}...`}
                className="pl-9 bg-white"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredForPicker.map((r) => {
                const avatar = getAvatarTheme(r.id)
                const EntityIcon = entityMode === "PARENT" ? Building2 : Home
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className="rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-gray-50 hover:shadow-sm transition flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold leading-tight truncate">{r.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground leading-snug whitespace-normal break-words">
                          {r.address || "—"}
                        </div>
                      </div>

                      <div
                        className={["h-10 w-10 rounded-full flex items-center justify-center shrink-0", avatar.bg].join(
                          " "
                        )}
                      >
                        <EntityIcon className={["h-5 w-5", avatar.icon].join(" ")} />
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="text-muted-foreground">Total jobs: </span>
                      <span className="font-semibold tabular-nums">{r.totals?.all ?? 0}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* pagination (same state as the carousel) */}
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                className="bg-white"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-white text-sm">{pageLabel}</span>
              <Button
                variant="outline"
                className="bg-white"
                disabled={page >= Math.max(1, totalPages) || isLoading}
                onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-xl border border-black/20 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{selected.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground whitespace-normal break-words">
                    {selected.address || "—"}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    Closed Rank #{selected.rankClosed} • Revenue Rank #{selected.rankRevenue}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatChip
                  label="Total"
                  value={selected.totals?.all ?? 0}
                  Icon={ClipboardList}
                  accentClass="bg-slate-100 text-slate-700"
                />
                <StatChip
                  label="Closed"
                  value={selected.buckets?.closed ?? 0}
                  Icon={Lock}
                  accentClass="bg-emerald-100 text-emerald-700"
                />
                <StatChip
                  label="Pending"
                  value={selected.buckets?.pending ?? 0}
                  Icon={Timer}
                  accentClass="bg-amber-100 text-amber-700"
                />
                <StatChip
                  label="In Progress"
                  value={selected.buckets?.in_progress ?? 0}
                  Icon={CheckCircle2}
                  accentClass="bg-blue-100 text-blue-700"
                />
                <StatChip
                  label="Completed"
                  value={selected.buckets?.completed ?? 0}
                  Icon={CheckCircle2}
                  accentClass="bg-violet-100 text-violet-700"
                />
                <StatChip
                  label="Cancelled"
                  value={selected.buckets?.cancelled ?? 0}
                  Icon={XCircle}
                  accentClass="bg-rose-100 text-rose-700"
                />
                <StatChip
                  label="Revenue"
                  value={formatMoney(selected.revenue?.all ?? 0)}
                  Icon={DollarSign}
                  accentClass="bg-emerald-100 text-emerald-700"
                />
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 text-white">
                    <Info className="h-4 w-4 text-white/80" />
                    Jobs per Status
                  </h3>
                  <p className="text-sm text-white/80 mt-1">Detailed breakdown of statuses for this selection.</p>
                </div>

                <div title={InfoTitle} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Info className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {selected.statusBreakdown && Object.keys(selected.statusBreakdown).length > 0 ? (
                  Object.entries(selected.statusBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-lg border border-black/10 bg-white p-3 hover:bg-gray-50 transition"
                      >
                        <span className="text-sm">{status}</span>
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold tabular-nums text-gray-900">
                          {count}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="rounded-lg border border-black/10 bg-white p-3 text-sm text-muted-foreground">
                    No status breakdown available. (Ensure backend returns status_breakdown with include_status_breakdown=1)
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}