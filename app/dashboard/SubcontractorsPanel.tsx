"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  HardHat,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  Clock,
  Wrench,
  FileText,
  Star,
  AlertTriangle,
} from "lucide-react"

import { KpiCard } from "./components/KpiCard"
import { SectionCard } from "./components/SectionCard"
import { StatusBadge } from "./components/StatusBadge"
import { EmptyState } from "./components/EmptyState"
import { CardCarouselSkeleton, TableSkeleton } from "./components/LoadingSkeleton"
import { useTranslations } from "@/components/providers/LocaleProvider"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubItem {
  rank:             number
  subcontractor: {
    id:            string
    name:          string
    organization:  string | null
    specialty:     string | null
    score:         number | null
    status:        string | null
    coverage_area: string[] | null
  }
  active_tasks_count:number
  has_overlap:       boolean
  skills_count:      number
  total_paid_usd:    number
}

interface SubListResponse {
  pagination:   { page: number; limit: number; total_pages: number }
  subcontractors: SubItem[]
}

interface ActiveTask {
  task_id:       string
  task_name:     string
  description:   string
  status:        string
  priority:      string
  start_date:    string | null
  delivery_date: string | null
  technician:    { id: string; name: string }
  job:           { job_id: string; type: string; status: string; project_name: string } | null
}

interface BillingPeriod {
  year:           number
  month:          number
  month_key:      string
  label:          string
  payments_count: number
  paid_usd:       number
}

interface PendingBill {
  bill_id:          string
  vendor_customer:  string
  total_amount:     number
  balance_amount:   number
  percentage_paid:  number | null
  due_date:         string | null
  notes:            string | null
  order:            { order_id: string; title: string } | null
}

interface SubDetail {
  subcontractor: {
    id:           string
    name:         string
    organization: string | null
    specialty:    string | null
    score:        number | null
    status:       string | null
    email?:       string | null
    phone?:       string | null
    coverage_area?: string[]
  }
  active_tasks: {
    count:       number
    has_overlap: boolean
    tasks:       ActiveTask[]
  }
  billing: {
    totals:    { total_billed: number; total_paid: number; balance_pending: number; bill_count: number }
    by_period: BillingPeriod[]
  }
  pending_bills: {
    count: number
    bills: PendingBill[]
  }
}

interface TradeGroup {
  division_trade: string | null
  skill_id:       string
  skill_name:     string
  total_subs:     number
  subcontractors: Array<{ id: string; name: string; organization: string | null; score: number | null }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtK = (v: number) => {
  if (!v) return "$0"
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(2)}`
}

function hashToIndex(str: string, mod: number) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % mod
}

const ACCENT_COLORS = [
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-lime-100 text-lime-700",
] as const
const getAccent = (id: string) => ACCENT_COLORS[hashToIndex(id, ACCENT_COLORS.length)]

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type SubTab = "list" | "trade"

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubcontractorsPanel() {
  const t = useTranslations("dashboard")
  const tCommon = useTranslations("common")
  const [tab,          setTab]         = useState<SubTab>("list")

  // List state
  const [isLoading,       setIsLoading]      = useState(true)
  const [page,            setPage]           = useState(1)
  const limit = 25
  const [items,           setItems]          = useState<SubItem[]>([])
  const [totalPages,      setTotalPages]     = useState(1)
  const [search,          setSearch]         = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Detail state
  const [selectedId,   setSelectedId]  = useState<string | null>(null)
  const [detail,       setDetail]      = useState<SubDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // By-trade state
  const [tradeGroups,  setTradeGroups] = useState<TradeGroup[]>([])
  const [tradeLoading, setTradeLoading] = useState(false)

  // ── Debounce search → reset page to 1 on new query ───────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setDebouncedSearch(search.trim())
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // ── List fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)
        const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
        if (debouncedSearch) qs.set("search", debouncedSearch)
        const res = await apiFetch(`/api/metrics/subcontractors?${qs}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: SubListResponse = await res.json()
        setItems(data.subcontractors ?? [])
        setTotalPages(data.pagination?.total_pages ?? 1)
      } catch (e) {
        console.error("[SubcontractorsPanel] list error:", e)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [page, debouncedSearch])

  // ── Detail fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    const run = async () => {
      try {
        setDetailLoading(true)
        const res = await apiFetch(`/api/metrics/subcontractors/${selectedId}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: SubDetail = await res.json()
        setDetail(data)
      } catch (e) {
        console.error("[SubcontractorsPanel] detail error:", e)
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    }
    run()
  }, [selectedId])

  // ── By-trade fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "trade") return
    if (tradeGroups.length > 0) return  // already loaded
    const run = async () => {
      try {
        setTradeLoading(true)
        const res = await apiFetch("/api/metrics/subcontractors/by-trade")
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = await res.json()
        setTradeGroups(data.trades ?? [])
      } catch (e) {
        console.error("[SubcontractorsPanel] by-trade error:", e)
        setTradeGroups([])
      } finally {
        setTradeLoading(false)
      }
    }
    run()
  }, [tab, tradeGroups.length])


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="inline-flex rounded-lg border bg-white p-1">
        {(["list", "trade"] as SubTab[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => { setTab(tabKey); setSelectedId(null) }}
            className={[
              "rounded-md px-5 py-2 text-sm font-medium transition",
              tab === tabKey ? "bg-gqm-green-dark text-white shadow" : "text-muted-foreground hover:text-gray-900",
            ].join(" ")}
          >
            {tabKey === "list" ? t("tabSubcontractors") : t("tabTechPerTrade")}
          </button>
        ))}
      </div>

      {tab === "list" ? (
        <>
          {/* ===== Carousel ================================================= */}
          <div className="rounded-lg border-4 border-black bg-gqm-green-dark p-6 relative">
            {(["left", "right"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={`Scroll ${dir}`}
                onClick={() => {
                  const el = document.getElementById("subs-scroller")
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
              id="subs-scroller"
              className="flex gap-4 overflow-x-auto pb-2 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0"
            >
              {isLoading ? (
                <CardCarouselSkeleton count={5} />
              ) : (
                items.map((sub) => {
                  const s      = sub.subcontractor
                  const accent = getAccent(s.id)
                  return (
                    <div
                      key={s.id}
                      className="flex-none w-[280px] rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                    >
                      <div className="p-5 flex-1">
                        <div className="flex items-start gap-3 mb-4">
                          <div className={["h-10 w-10 shrink-0 rounded-full flex items-center justify-center", accent].join(" ")}>
                            <HardHat className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate leading-tight">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.specialty ?? s.organization ?? <span className="italic opacity-50">No Organization</span>}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div className="text-muted-foreground">{t("colStatus")}</div>
                          <div className="text-right">
                            {s.status ? <StatusBadge status={s.status} /> : <span className="italic opacity-50">{t("noStatus")}</span>}
                          </div>

                          <div className="text-muted-foreground">{t("kpiActiveTasks")}</div>
                          <div className="text-right font-semibold tabular-nums">{sub.active_tasks_count}</div>

                          <div className="text-muted-foreground">Skills</div>
                          <div className="text-right font-semibold tabular-nums">{sub.skills_count}</div>

                          <div className="text-muted-foreground">{t("score")}</div>
                          <div className="text-right font-semibold tabular-nums">
                            {s.score != null ? `${s.score}/10` : <span className="italic opacity-50">{t("noScore")}</span>}
                          </div>

                          <div className="text-muted-foreground">{t("colTotalPaid")}</div>
                          <div className="text-right font-semibold tabular-nums text-emerald-700">{fmtK(sub.total_paid_usd)}</div>
                        </div>

                        {sub.has_overlap && (
                          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {t("scheduleOverlap")}
                          </div>
                        )}
                      </div>

                      <div className="px-5 py-2.5 mt-auto text-sm font-semibold text-black" style={{ backgroundColor: "#37D260" }}>
                        {fmtK(sub.total_paid_usd)} {t("colTotalPaid")}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" className="bg-white" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t("prevPage")}</Button>
              <span className="text-white text-sm">{page} / {Math.max(1, totalPages)}</span>
              <Button variant="outline" className="bg-white" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{t("nextPage")}</Button>
            </div>
          </div>

          {/* ===== Bottom: Picker + Detail ================================== */}
          <div className="grid gap-6 md:grid-cols-2">

            {/* Picker */}
            <SectionCard title={t("allSubcontractors")} subtitle={t("allSubcontractorsSubtitle")}>
              <div className="relative mb-4">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchByNameOrSpecialty")} className="pl-9" />
              </div>
              {isLoading ? (
                <TableSkeleton rows={6} cols={3} />
              ) : (
                <div className="space-y-2">
                  {items.map((sub) => {
                    const s      = sub.subcontractor
                    const accent = getAccent(s.id)
                    const isSel  = selectedId === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedId(isSel ? null : s.id)}
                        className={[
                          "w-full rounded-xl border p-3 text-left transition hover:shadow-sm",
                          isSel ? "border-gqm-green-dark bg-emerald-50" : "border-gray-200 bg-white hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className={["h-9 w-9 shrink-0 rounded-full flex items-center justify-center", accent].join(" ")}>
                            <HardHat className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {s.specialty ?? <span className="italic opacity-50">{t("noSpecialty")}</span>}
                            </div>
                          </div>
                          <div className="text-right text-xs shrink-0">
                            <div className="font-semibold text-emerald-700">{fmtK(sub.total_paid_usd)}</div>
                            <div className="text-muted-foreground">{sub.active_tasks_count} {tCommon("active")}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {items.length === 0 && <EmptyState message={t("noSubcontractorsFound")} />}
                </div>
              )}
            </SectionCard>

            {/* Detail */}
            <SectionCard
              title={detail?.subcontractor.name ?? t("individualStats")}
              subtitle={detail?.subcontractor.specialty ?? t("selectSubcontractorLeft")}
              action={selectedId ? <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>{t("clear")}</Button> : undefined}
            >
              {!selectedId ? (
                <EmptyState message={t("selectSubcontractorDetail")} />
              ) : detailLoading ? (
                <TableSkeleton rows={5} cols={2} />
              ) : !detail ? (
                <EmptyState message={t("errorLoadSubDetails")} />
              ) : (
                <div className="space-y-5">
                  {/* KPI chips */}
                  <div className="grid grid-cols-2 gap-3">
                    <KpiCard title={t("kpiActiveTasks")}  value={String(detail.active_tasks.count)}        Icon={Clock}        accentClass="bg-sky-100 text-sky-700" />
                    <KpiCard title={t("colTotalPaid")}   value={fmtK(detail.billing.totals.total_paid)}  Icon={DollarSign}   accentClass="bg-emerald-100 text-emerald-700" />
                    <KpiCard title={t("kpiBills")}       value={String(detail.billing.totals.bill_count)} Icon={FileText}    accentClass="bg-violet-100 text-violet-700" />
                    <KpiCard title={t("kpiPendingBills")} value={String(detail.pending_bills.count)}      Icon={CheckCircle2} accentClass="bg-amber-100 text-amber-700" />
                  </div>

                  {detail.subcontractor.score != null && (
                    <div className="flex items-center gap-2 rounded-xl border bg-gray-50 px-4 py-3">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">{t("score")}</span>
                      <span className="ml-auto text-xl font-bold tabular-nums">{detail.subcontractor.score}/10</span>
                    </div>
                  )}

                  {/* Active tasks */}
                  {detail.active_tasks.tasks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-sky-600" />
                        {t("inProgressJobs")}
                        {detail.active_tasks.has_overlap && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 font-normal">
                            <AlertTriangle className="h-3 w-3" /> {t("overlap")}
                          </span>
                        )}
                      </h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                            <th className="px-2 py-1.5 font-medium">{t("colTask")}</th>
                            <th className="px-2 py-1.5 font-medium">{t("colJob")}</th>
                            <th className="px-2 py-1.5 font-medium">{t("colStatus")}</th>
                            <th className="px-2 py-1.5 font-medium">{t("colDue")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.active_tasks.tasks.map((task) => (
                            <tr key={task.task_id} className="border-b hover:bg-gray-50 transition">
                              <td className="px-2 py-1.5 font-medium max-w-[120px] truncate">{task.task_name}</td>
                              <td className="px-2 py-1.5 font-mono font-semibold text-gqm-green-dark">{task.job?.job_id ?? "—"}</td>
                              <td className="px-2 py-1.5"><StatusBadge status={task.status} /></td>
                              <td className="px-2 py-1.5 tabular-nums">{task.delivery_date ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Billing by period */}
                  {detail.billing.by_period.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        {t("paidPerPeriod")}
                      </h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                            <th className="px-2 py-1.5 font-medium">{t("colPeriod")}</th>
                            <th className="px-2 py-1.5 font-medium text-right">{t("colInvoices")}</th>
                            <th className="px-2 py-1.5 font-medium text-right">{t("colTotalPaid")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.billing.by_period.map((b) => (
                            <tr key={b.month_key} className="border-b hover:bg-gray-50 transition">
                              <td className="px-2 py-1.5 font-medium">{b.label}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums">{b.payments_count}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-emerald-700">{fmtK(b.paid_usd)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* POs released (pending bills) */}
                  {detail.pending_bills.bills.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-600" />
                        {t("posReleased")}
                        <span className="rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 text-xs">{detail.pending_bills.count}</span>
                      </h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                            <th className="px-2 py-1.5 font-medium">{t("colBillId")}</th>
                            <th className="px-2 py-1.5 font-medium">{t("colOrder")}</th>
                            <th className="px-2 py-1.5 font-medium">{t("colDueDate")}</th>
                            <th className="px-2 py-1.5 font-medium text-right">{t("colBalance")}</th>
                            <th className="px-2 py-1.5 font-medium text-right">{t("colTotal")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.pending_bills.bills.map((b) => (
                            <tr key={b.bill_id} className="border-b hover:bg-gray-50 transition">
                              <td className="px-2 py-1.5 font-mono text-xs">{b.bill_id}</td>
                              <td className="px-2 py-1.5 font-mono font-semibold text-gqm-green-dark">{b.order?.title ?? "—"}</td>
                              <td className="px-2 py-1.5 tabular-nums">{b.due_date ?? "—"}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-amber-700">{fmtK(b.balance_amount)}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{fmtK(b.total_amount)}</td>
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
      ) : (
        /* ===== Tech per Trade ============================================== */
        <SectionCard title={t("techsPerTrade")} subtitle={t("techsPerTradeSubtitle")}>
          {tradeLoading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : tradeGroups.length === 0 ? (
            <EmptyState message={t("noTradeData")} />
          ) : (
            <div className="space-y-4">
              {tradeGroups.map((group, gi) => (
                <div key={gi} className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-violet-600 shrink-0" />
                      <span className="font-semibold text-sm">
                        {group.division_trade || (group.skill_name !== "—" ? group.skill_name : null) || t("unknown")}
                      </span>
                      {group.skill_name && group.skill_name !== "—" && group.division_trade && group.skill_name !== group.division_trade && (
                        <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs">
                          {group.skill_name}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium">
                      {group.total_subs} {t("subs")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.subcontractors.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow-sm"
                      >
                        <HardHat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{sub.name}</span>
                        {sub.score != null && (
                          <span className="flex items-center gap-0.5 text-yellow-600">
                            <Star className="h-3 w-3" />
                            {sub.score}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
