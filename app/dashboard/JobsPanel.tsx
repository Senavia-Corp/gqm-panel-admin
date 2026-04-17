"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import {
  Download,
  DollarSign,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  Percent,
  AlertCircle,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { KpiCard } from "./components/KpiCard"
import { SectionCard } from "./components/SectionCard"
import { StatusBadge, statusRowBg } from "./components/StatusBadge"
import { EmptyState } from "./components/EmptyState"
import {
  KpiSkeleton,
  TableSkeleton,
  ChartSkeleton,
} from "./components/LoadingSkeleton"
import { MonthlyEvolutionChart } from "./components/charts/MonthlyEvolutionChart"
import { HorizontalBarChart } from "./components/charts/HorizontalBarChart"
import { StatusPieChart } from "./components/charts/StatusPieChart"

// ─── Types ────────────────────────────────────────────────────────────────────

type JobTab  = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

interface KpiSummary {
  job_count:           number
  paid_count:          number
  total_quoted:        number
  total_formula:       number
  total_adj_formula:   number
  total_final_sold:    number
  total_premium:       number
  avg_final_pct:       number   // 0–1
  avg_target_ret:      number   // 0–1
  final_vs_quoted_pct: number
  pct_label:           string
}

interface MonthlySale {
  month:             string   // "YYYY-MM"
  month_name:        string
  jobs:              number
  paid_jobs:         number
  quoted_target_sold:number
  formula:           number
  adj_formula:       number
  final_sold:        number
  premium_in_money:  number
  avg_final_pct:     number
  final_pct:         number
}

interface QuarterData {
  quarter:           string
  jobs:              number
  paid:              number
  quoted_target_sold:number
  formula:           number
  final_sold:        number
  premium_in_money:  number
  avg_final_pct:     number
}

interface RepPerf {
  rep:               string
  jobs:              number
  paid:              number
  quoted_target_sold:number
  final:             number
  premium_in_money:  number
  avg_final_pct:     number
}

interface StatusRow {
  status:            string
  count:             number
  pct:               number
  quoted_target_sold:number
  final:             number
  premium_in_money:  number
}

interface ServiceRow {
  service:           string
  count:             number
  final:             number
  premium_in_money:  number
  avg_final_pct:     number
  paid_jobs:         number
}

interface InProgressJob {
  job_id:            string
  type:              string
  client:            string
  rep:               string
  status:            string
  service:           string
  date:              string
  amount:            number
  quoted_target_sold:number
  premium_in_money:  number
}

interface ReadyToInvoiceJob {
  job_id:            string
  type:              string
  client:            string
  rep:               string
  status:            string
  service:           string
  date:              string
  amount:            number
}

interface RecentPurchase {
  purchase_id:  string
  description:  string
  status:       string
  amount:       number
  rep:          string
  date:         string
  job:          { job_id: string; type: string; client: string } | null
}

interface JobsStatusResponse {
  filters:           { type: string; year: number | null }
  kpi_summary:       KpiSummary
  monthly_sales:     MonthlySale[]
  quarterly:         QuarterData[]
  rep_label:         string
  rep_performance:   RepPerf[]
  status_breakdown:  StatusRow[]
  pipeline:          number
  service_type_sales:ServiceRow[]
  in_progress_jobs:  InProgressJob[]
  ready_to_invoice:  ReadyToInvoiceJob[]
  recent_purchases:  RecentPurchase[]
}

interface DetailJob {
  job_id:      string
  type:        string
  client:      string
  rep:         string
  status:      string
  service:     string
  date:        string
  formula:     number
  adj_formula: number
  target:      number
  final:       number
  pct:         number
  premium:     number
}

interface MemberPipelineItem {
  id:          string
  name:        string
  company_role:string | null
  job_count:   number
  total_quoted:number
  jobs:        Array<{ job_id: string; client: string; status: string; date: string; amount: number }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
const fmtK = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return fmt.format(v)
}
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const PAGE_SIZE = 50

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  jobTab:  JobTab
  yearTab: YearTab
  onDownloadReport: () => void
  isDownloadingReport: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobsPanel({
  jobTab,
  yearTab,
  onDownloadReport,
  isDownloadingReport,
}: Props) {
  const [loading, setLoading]           = useState(true)
  const [data, setData]                 = useState<JobsStatusResponse | null>(null)

  const [detailJobs, setDetailJobs]     = useState<DetailJob[]>([])
  const [detailPage, setDetailPage]     = useState(1)
  const [detailTotal, setDetailTotal]   = useState(0)
  const [detailLoading, setDetailLoading] = useState(false)

  const [pipeline, setPipeline]         = useState<MemberPipelineItem[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [timeView, setTimeView]         = useState<"monthly" | "quarterly">("monthly")

  // ── Main fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const qs = new URLSearchParams({ type: jobTab })
        if (yearTab !== "ALL") qs.set("year", yearTab)
        const res = await apiFetch(`/api/metrics/jobs/status?${qs}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const d: JobsStatusResponse = await res.json()
        setData(d)
      } catch (e) {
        console.error("[JobsPanel] main fetch error:", e)
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [jobTab, yearTab])

  // ── Detail jobs fetch (paged) ─────────────────────────────────────────────
  const fetchDetailJobs = useCallback(async (page: number) => {
    try {
      setDetailLoading(true)
      const qs = new URLSearchParams({ type: jobTab, page: String(page), limit: String(PAGE_SIZE) })
      if (yearTab !== "ALL") qs.set("year", yearTab)
      const res = await apiFetch(`/api/metrics/jobs/summary?${qs}`)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const d = await res.json()
      setDetailJobs(d.jobs ?? [])
      setDetailTotal(d.pagination?.total ?? d.jobs?.length ?? 0)
    } catch (e) {
      console.error("[JobsPanel] detail fetch error:", e)
      setDetailJobs([])
    } finally {
      setDetailLoading(false)
    }
  }, [jobTab, yearTab])

  useEffect(() => { setDetailPage(1) }, [jobTab, yearTab])
  useEffect(() => { fetchDetailJobs(detailPage) }, [detailPage, fetchDetailJobs])

  // ── Member pipeline fetch ─────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        setPipelineLoading(true)
        const qs = new URLSearchParams({ type: jobTab })
        if (yearTab !== "ALL") qs.set("year", yearTab)
        const res = await apiFetch(`/api/metrics/jobs/member-pipeline?${qs}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const d = await res.json()
        setPipeline(d.members ?? d ?? [])
      } catch (e) {
        console.error("[JobsPanel] pipeline fetch error:", e)
        setPipeline([])
      } finally {
        setPipelineLoading(false)
      }
    }
    run()
  }, [jobTab, yearTab])

  // ── Derived chart data ────────────────────────────────────────────────────
  const monthlyChartData = useMemo(
    () =>
      (data?.monthly_sales ?? []).map((m) => {
        const yr   = m.month?.slice(0, 4) ?? ""
        const name = (m.month_name ?? "").trim()
        const label = yearTab === "ALL"
          ? `${name.slice(0, 3)} '${yr.slice(2)}`
          : name || m.month
        return {
          label,
          quoted:        m.quoted_target_sold,
          final_sold:    m.final_sold,
          avg_final_pct: m.avg_final_pct,
        }
      }),
    [data, yearTab]
  )

  const quarterlyChartData = useMemo(
    () =>
      (data?.quarterly ?? []).map((q) => ({
        label:         q.quarter,
        quoted:        q.quoted_target_sold,
        final_sold:    q.final_sold,
        avg_final_pct: q.avg_final_pct,
      })),
    [data]
  )

  const repChartData = useMemo(
    () =>
      (data?.rep_performance ?? [])
        .slice(0, 10)
        .map((r) => ({
          label:     r.rep,
          value:     r.final,
          secondary: r.premium_in_money,
          badge:     fmtPct(r.avg_final_pct),
        }))
        .reverse(),
    [data]
  )

  const serviceChartData = useMemo(
    () =>
      [...(data?.service_type_sales ?? [])]
        .sort((a, b) => b.final - a.final)
        .map((s) => ({
          label:     s.service,
          value:     s.final,
          secondary: s.premium_in_money,
        })),
    [data]
  )

  const statusPieData = useMemo(
    () =>
      (data?.status_breakdown ?? []).map((s) => ({
        name:  s.status,
        value: s.count,
      })),
    [data]
  )

  const detailTotalPages = Math.max(1, Math.ceil(detailTotal / PAGE_SIZE))

  if (loading) {
    return (
      <div className="space-y-6">
        <KpiSkeleton count={8} />
        <ChartSkeleton height={320} />
        <TableSkeleton />
      </div>
    )
  }

  if (!data) {
    return <EmptyState message="Could not load jobs financial data. Please try again." />
  }

  const kpi = data.kpi_summary

  return (
    <div className="space-y-6">

      {/* ── 1. KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <KpiCard large title="Total Quoted"    value={fmtK(kpi.total_quoted)}    subtitle="Target sold pricing"      Icon={DollarSign}   accentClass="bg-slate-100 text-slate-700" />
        <KpiCard large title="Total Formula"   value={fmtK(kpi.total_formula)}   subtitle="Base costing"             Icon={BarChart2}    accentClass="bg-blue-100 text-blue-700" />
        <KpiCard large title="Total Final Sold" value={fmtK(kpi.total_final_sold)} subtitle="Actual revenue"          Icon={TrendingUp}   accentClass="bg-emerald-100 text-emerald-700" />
        <KpiCard large title="Total Premium $"  value={fmtK(kpi.total_premium)}   subtitle="Final Sold − Adj Formula" Icon={DollarSign}   accentClass="bg-amber-100 text-amber-700" valueClass="text-amber-700" />

        <KpiCard title="Avg Final %"      value={fmtPct(kpi.avg_final_pct)}   subtitle="Margin performance"        Icon={Percent}      accentClass="bg-violet-100 text-violet-700" />
        <KpiCard title="# Jobs PAID"      value={`${kpi.paid_count} / ${kpi.job_count}`} subtitle="of total jobs"  Icon={CheckCircle2} accentClass="bg-emerald-100 text-emerald-700" />
        <KpiCard title="Pipeline"         value={fmtK(data.pipeline ?? 0)}    subtitle="Active / uncollected"      Icon={Target}       accentClass="bg-orange-100 text-orange-700" valueClass="text-orange-700" />
        <KpiCard title="Avg Target Return" value={fmtPct(kpi.avg_target_ret)} subtitle="Strategic objective"       Icon={AlertCircle}  accentClass="bg-rose-100 text-rose-700" />
      </div>

      {/* ── 2. Monthly / Quarterly Evolution ─────────────────────────────── */}
      <SectionCard
        title="Financial Evolution"
        subtitle="Monthly and quarterly breakdown of quoted vs final sold"
        action={
          <div className="inline-flex rounded-lg border bg-gray-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeView("monthly")}
              className={["rounded px-3 py-1 font-medium transition", timeView === "monthly" ? "bg-white shadow text-gray-900" : "text-muted-foreground"].join(" ")}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setTimeView("quarterly")}
              className={["rounded px-3 py-1 font-medium transition", timeView === "quarterly" ? "bg-white shadow text-gray-900" : "text-muted-foreground"].join(" ")}
            >
              Quarterly
            </button>
          </div>
        }
      >
        {timeView === "monthly" ? (
          <>
            <MonthlyEvolutionChart data={monthlyChartData} height={300} />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Month</th>
                    <th className="px-3 py-2 font-medium text-right">Jobs</th>
                    <th className="px-3 py-2 font-medium text-right">Paid</th>
                    <th className="px-3 py-2 font-medium text-right">Quoted</th>
                    <th className="px-3 py-2 font-medium text-right">Formula</th>
                    <th className="px-3 py-2 font-medium text-right">Adj Formula</th>
                    <th className="px-3 py-2 font-medium text-right">Final Sold</th>
                    <th className="px-3 py-2 font-medium text-right">Premium $</th>
                    <th className="px-3 py-2 font-medium text-right">Avg Final %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly_sales.map((m) => {
                    const yr   = m.month?.slice(0, 4) ?? ""
                    const name = (m.month_name ?? "").trim()
                    const label = yearTab === "ALL" ? `${name} ${yr}` : (name || m.month)
                    return (
                    <tr key={m.month} className="border-b hover:bg-gray-50 transition">
                      <td className="px-3 py-2 font-medium">{label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.jobs}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.paid_jobs}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(m.quoted_target_sold)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(m.formula)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(m.adj_formula)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtK(m.final_sold)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700 font-semibold">{fmtK(m.premium_in_money)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(m.avg_final_pct)}</td>
                    </tr>
                    )
                  })}
                  {/* Totals row */}
                  {data.monthly_sales.length > 0 && (() => {
                    const totals = data.monthly_sales.reduce(
                      (acc, m) => ({
                        jobs: acc.jobs + m.jobs,
                        paid_jobs: acc.paid_jobs + m.paid_jobs,
                        quoted: acc.quoted + m.quoted_target_sold,
                        formula: acc.formula + m.formula,
                        adj_formula: acc.adj_formula + m.adj_formula,
                        final_sold: acc.final_sold + m.final_sold,
                        premium: acc.premium + m.premium_in_money,
                      }),
                      { jobs: 0, paid_jobs: 0, quoted: 0, formula: 0, adj_formula: 0, final_sold: 0, premium: 0 }
                    )
                    return (
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                        <td className="px-3 py-2">TOTAL</td>
                        <td className="px-3 py-2 text-right tabular-nums">{totals.jobs}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{totals.paid_jobs}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtK(totals.quoted)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtK(totals.formula)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtK(totals.adj_formula)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtK(totals.final_sold)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmtK(totals.premium)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">—</td>
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <MonthlyEvolutionChart data={quarterlyChartData} height={280} />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Quarter</th>
                    <th className="px-3 py-2 font-medium text-right">Jobs</th>
                    <th className="px-3 py-2 font-medium text-right">Paid</th>
                    <th className="px-3 py-2 font-medium text-right">Quoted</th>
                    <th className="px-3 py-2 font-medium text-right">Formula</th>
                    <th className="px-3 py-2 font-medium text-right">Final Sold</th>
                    <th className="px-3 py-2 font-medium text-right">Premium $</th>
                    <th className="px-3 py-2 font-medium text-right">Avg Final %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quarterly.map((q) => (
                    <tr key={q.quarter} className="border-b hover:bg-gray-50 transition">
                      <td className="px-3 py-2 font-medium">{q.quarter}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{q.jobs}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{q.paid}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(q.quoted_target_sold)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(q.formula)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtK(q.final_sold)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700 font-semibold">{fmtK(q.premium_in_money)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(q.avg_final_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── 3. In Progress Jobs ───────────────────────────────────────────── */}
      <SectionCard
        title="Jobs In Progress"
        subtitle={`${data.in_progress_jobs.length} active jobs`}
        action={
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
            Pipeline: {fmtK(data.pipeline ?? 0)}
          </span>
        }
      >
        {data.in_progress_jobs.length === 0 ? (
          <EmptyState message="No jobs currently in progress." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Job ID</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">Quoted</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.in_progress_jobs.map((j) => (
                  <tr key={j.job_id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-3 py-2 font-mono font-semibold text-gqm-green-dark">{j.job_id}</td>
                    <td className="px-3 py-2">{j.client}</td>
                    <td className="px-3 py-2">{j.rep}</td>
                    <td className="px-3 py-2"><StatusBadge status={j.status} /></td>
                    <td className="px-3 py-2">{j.service}</td>
                    <td className="px-3 py-2 tabular-nums">{j.date}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtK(j.quoted_target_sold)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-sky-700">{fmtK(j.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── 4. Ready to Invoice ───────────────────────────────────────────── */}
      <SectionCard
        title="Ready to Invoice"
        subtitle={`${data.ready_to_invoice.length} jobs completed pending invoicing`}
      >
        {data.ready_to_invoice.length === 0 ? (
          <EmptyState message="No jobs ready to invoice." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Job ID</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">Final Sold</th>
                </tr>
              </thead>
              <tbody>
                {data.ready_to_invoice.map((j) => (
                  <tr key={j.job_id} className="border-b hover:bg-emerald-50 transition">
                    <td className="px-3 py-2 font-mono font-semibold text-gqm-green-dark">{j.job_id}</td>
                    <td className="px-3 py-2">{j.client}</td>
                    <td className="px-3 py-2">{j.rep}</td>
                    <td className="px-3 py-2"><StatusBadge status={j.status} /></td>
                    <td className="px-3 py-2">{j.service}</td>
                    <td className="px-3 py-2 tabular-nums">{j.date}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">{fmtK(j.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── 5. Rep Performance + Status Distribution (2-col) ─────────────── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Rep Performance */}
        <SectionCard title="Rep Performance" subtitle="Total Final Sold & Avg Final %">
          {repChartData.length === 0 ? <EmptyState /> : (
            <>
              <HorizontalBarChart
                data={repChartData}
                primaryLabel="Final Sold"
                secondaryLabel="Premium $"
                primaryColor="#1e4d2b"
                secondaryColor="#f59e0b"
              />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Rep</th>
                      <th className="px-3 py-2 font-medium text-right">Jobs</th>
                      <th className="px-3 py-2 font-medium text-right">Paid</th>
                      <th className="px-3 py-2 font-medium text-right">Final Sold</th>
                      <th className="px-3 py-2 font-medium text-right">Avg %</th>
                      <th className="px-3 py-2 font-medium text-right">Premium $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.rep_performance]
                      .sort((a, b) => b.final - a.final)
                      .map((r) => (
                        <tr key={r.rep} className="border-b hover:bg-gray-50 transition">
                          <td className="px-3 py-2 font-medium">{r.rep}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.jobs}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.paid}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtK(r.final)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtPct(r.avg_final_pct)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmtK(r.premium_in_money)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>

        {/* Status Distribution */}
        <SectionCard
          title="Job Status Distribution"
          subtitle={`Pipeline (active): ${fmtK(data.pipeline ?? 0)}`}
        >
          {statusPieData.length === 0 ? <EmptyState /> : (
            <>
              <StatusPieChart data={statusPieData} height={360} />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium text-right">Jobs</th>
                      <th className="px-3 py-2 font-medium text-right">%</th>
                      <th className="px-3 py-2 font-medium text-right">Quoted</th>
                      <th className="px-3 py-2 font-medium text-right">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.status_breakdown.map((s) => (
                      <tr
                        key={s.status}
                        className="border-b transition"
                        style={{ background: statusRowBg(s.status) }}
                      >
                        <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{s.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(s.pct)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtK(s.quoted_target_sold)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtK(s.final)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* ── 6. Service Type Profitability ─────────────────────────────────── */}
      <SectionCard
        title="Profitability by Service Type"
        subtitle="Final Sold and Premium $ sorted by revenue"
      >
        {serviceChartData.length === 0 ? <EmptyState /> : (
          <div className="grid gap-6 md:grid-cols-2 items-start">
            <HorizontalBarChart
              data={serviceChartData}
              primaryLabel="Final Sold"
              secondaryLabel="Premium $"
              primaryColor="#1e4d2b"
              secondaryColor="#f59e0b"
            />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium text-right">Jobs</th>
                  <th className="px-3 py-2 font-medium text-right">Avg %</th>
                  <th className="px-3 py-2 font-medium text-right">Final Sold</th>
                  <th className="px-3 py-2 font-medium text-right">Premium $</th>
                </tr>
              </thead>
              <tbody>
                {[...data.service_type_sales]
                  .sort((a, b) => b.final - a.final)
                  .map((s) => (
                    <tr key={s.service} className="border-b hover:bg-gray-50 transition">
                      <td className="px-3 py-2 font-medium">{s.service}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(s.avg_final_pct)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtK(s.final)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmtK(s.premium_in_money)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── 7. P/Quote Pipeline per Member ───────────────────────────────── */}
      <SectionCard
        title="P/Quote Pipeline per Member"
        subtitle="Members with active pending/quote jobs"
      >
        {pipelineLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : pipeline.length === 0 ? (
          <EmptyState message="No P/Quote jobs in pipeline." />
        ) : (
          <div className="space-y-4">
            {pipeline.map((m) => (
              <div key={m.id} className="rounded-xl border bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.company_role ?? "—"}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 font-semibold">
                      {m.job_count} jobs
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-semibold">
                      {fmtK(m.total_quoted)}
                    </span>
                  </div>
                </div>
                {m.jobs?.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="pb-1 font-medium">Job ID</th>
                        <th className="pb-1 font-medium">Client</th>
                        <th className="pb-1 font-medium">Status</th>
                        <th className="pb-1 font-medium">Date</th>
                        <th className="pb-1 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.jobs.map((j, ji) => (
                        <tr key={`${m.id}-${j.job_id}-${ji}`} className="border-b last:border-0">
                          <td className="py-1 font-mono text-gqm-green-dark font-semibold">{j.job_id}</td>
                          <td className="py-1">{j.client}</td>
                          <td className="py-1"><StatusBadge status={j.status} /></td>
                          <td className="py-1 tabular-nums">{j.date}</td>
                          <td className="py-1 text-right tabular-nums font-semibold">{fmtK(j.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── 9. Material Purchase Status ───────────────────────────────────── */}
      <SectionCard
        title="Material Purchase Status"
        subtitle="Recent purchase orders linked to jobs"
      >
        {data.recent_purchases.length === 0 ? (
          <EmptyState message="No recent purchases found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">PO ID</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_purchases.map((p) => (
                  <tr key={p.purchase_id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-3 py-2 font-mono text-xs">{p.purchase_id}</td>
                    <td className="px-3 py-2 max-w-[180px] truncate">{p.description}</td>
                    <td className="px-3 py-2 font-mono text-gqm-green-dark font-semibold">{p.job?.job_id ?? "—"}</td>
                    <td className="px-3 py-2">{p.job?.client ?? "—"}</td>
                    <td className="px-3 py-2">{p.rep}</td>
                    <td className="px-3 py-2 tabular-nums">{p.date}</td>
                    <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtK(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── 10. Full Job Detail Table ─────────────────────────────────────── */}
      <SectionCard
        title="Full Job Inventory"
        subtitle="Complete list of jobs for the selected period"
        action={
          <Button
            onClick={onDownloadReport}
            disabled={isDownloadingReport}
            size="sm"
            className="bg-gqm-green-dark text-white hover:bg-gqm-green-dark/90"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {isDownloadingReport ? "Generating..." : "PDF Report"}
          </Button>
        }
      >
        {detailLoading ? (
          <TableSkeleton rows={10} cols={8} />
        ) : detailJobs.length === 0 ? (
          <EmptyState message="No jobs found for the selected filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Job ID</th>
                    <th className="px-3 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">Rep</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium text-right">Formula</th>
                    <th className="px-3 py-2 font-medium text-right">Adj Formula</th>
                    <th className="px-3 py-2 font-medium text-right">Target</th>
                    <th className="px-3 py-2 font-medium text-right">Final</th>
                    <th className="px-3 py-2 font-medium text-right">%</th>
                    <th className="px-3 py-2 font-medium text-right">Premium $</th>
                  </tr>
                </thead>
                <tbody>
                  {detailJobs.map((j) => (
                    <tr
                      key={j.job_id}
                      className="border-b transition"
                      style={{ background: statusRowBg(j.status) }}
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-gqm-green-dark">{j.job_id}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate">{j.client}</td>
                      <td className="px-3 py-2">{j.rep}</td>
                      <td className="px-3 py-2"><StatusBadge status={j.status} /></td>
                      <td className="px-3 py-2">{j.service}</td>
                      <td className="px-3 py-2 tabular-nums">{j.date}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(j.formula)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(j.adj_formula)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtK(j.target)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtK(j.final)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(j.pct)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700 font-semibold">{fmtK(j.premium)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {(detailPage - 1) * PAGE_SIZE + 1}–{Math.min(detailPage * PAGE_SIZE, detailTotal)} of {detailTotal} jobs
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={detailPage <= 1}
                  onClick={() => setDetailPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="tabular-nums">
                  {detailPage} / {detailTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={detailPage >= detailTotalPages}
                  onClick={() => setDetailPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

    </div>
  )
}
