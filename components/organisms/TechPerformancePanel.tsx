"use client"

import { useState, useEffect, useMemo } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"
import {
  TrendingUp,
  Briefcase,
  DollarSign,
  CheckCircle,
  Clock,
  Activity,
  AlertCircle,
  Unlink,
  Loader2,
  Info,
  ChevronRight,
  Target
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface TechPerformancePanelProps {
  subcontractorId: string
}

export default function TechPerformancePanel({ subcontractorId }: TechPerformancePanelProps) {
  const t = useTranslations("dashboard")
  const ts = useTranslations("subcontractors") // Reuse some tooltips if needed
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const res = await apiFetch(`/api/subcontractors/${subcontractorId}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e.message || "Failed to load performance data")
      } finally {
        setLoading(false)
      }
    }
    if (subcontractorId) fetchData()
  }, [subcontractorId])

  const metrics = useMemo(() => {
    if (!data) return null

    const jobs = data.jobs || []
    const orders = data.orders || []

    const jobCounts = {
      completed: 0,
      inProgress: 0,
      other: 0,
    }

    const COMPLETED_STATUS = ["PAID", "PAID", "COMPLETED P. INV / POS", "COMPLETED PVI / POS", "COMPLETED PVI", "INVOICED"]
    const IN_PROGRESS_STATUS = ["SCHEDULED / WORK IN PROGRESS", "ASSIGNED-IN PROGRESS", "IN PROGRESS"]

    jobs.forEach((j: any) => {
      const s = (j.Job_status || "").toUpperCase()
      if (COMPLETED_STATUS.includes(s)) jobCounts.completed++
      else if (IN_PROGRESS_STATUS.includes(s)) jobCounts.inProgress++
      else jobCounts.other++
    })

    let settled = 0
    let pending = 0
    let unlinked = 0
    let totalCollected = 0
    let totalPendingAmount = 0

    orders.forEach((order: any) => {
      const bills = (order.financial_docs || []).filter(
        (d: any) => d.Type_of_document === "Bill" && !d.is_voided
      )

      if (bills.length === 0) {
        unlinked++
      } else {
        const allPaid = bills.every((b: any) => (b.Percentage_Paid ?? 0) >= 100)
        if (allPaid) settled++
        else pending++

        bills.forEach((b: any) => {
          const total = Number(b.Total_Amount || 0)
          const balance = Number(b.Balance_Amount || 0)
          totalCollected += (total - balance)
          totalPendingAmount += balance
        })
      }
    })

    return {
      jobCounts,
      paymentStatus: { settled, pending, unlinked },
      financials: { totalCollected, totalPendingAmount },
      score: data.Score || 0,
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-red-100 bg-red-50 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-red-600">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-semibold">{t("error")}</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  const fmtMoney = (val: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val)

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Performance Score Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-xs">
                  {t("scoreLegend")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <svg className="h-24 w-24 -rotate-90">
                <circle
                  cx="48" cy="48" r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-100"
                />
                <circle
                  cx="48" cy="48" r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * metrics.score) / 300}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    metrics.score >= 250 ? "text-emerald-500" : metrics.score >= 150 ? "text-amber-500" : "text-rose-500"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">{metrics.score}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ 300</span>
              </div>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-700">{t("performanceScore")}</p>
          </div>
        </div>

        {/* Collected Money Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition-all hover:shadow-md lg:col-span-1">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-50 opacity-50" />
          <div className="relative flex flex-col h-full">
            <div className="mb-auto flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-emerald-300 hover:text-emerald-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-xs">
                    {t("collectedTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70">{t("totalCollected")}</p>
              <h3 className="text-2xl font-black text-emerald-700">{fmtMoney(metrics.financials.totalCollected)}</h3>
            </div>
          </div>
        </div>

        {/* Pending Money Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition-all hover:shadow-md lg:col-span-1">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-50 opacity-50" />
          <div className="relative flex flex-col h-full">
            <div className="mb-auto flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-amber-300 hover:text-amber-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-xs">
                    {t("pendingAmountTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70">{t("totalPendingAmount")}</p>
              <h3 className="text-2xl font-black text-amber-700">{fmtMoney(metrics.financials.totalPendingAmount)}</h3>
            </div>
          </div>
        </div>

        {/* Global Stats Brief */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all hover:shadow-md lg:col-span-1">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-500/5 to-transparent" />
          <div className="relative flex flex-col h-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/70">{t("viewJobs")}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t("dashCompleted")}</span>
                <span className="text-sm font-bold text-slate-900">{metrics.jobCounts.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t("dashInProgress")}</span>
                <span className="text-sm font-bold text-slate-900">{metrics.jobCounts.inProgress}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Total</span>
                <span className="text-sm font-black text-blue-600">{data.jobs?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Jobs vs Payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Jobs Distribution Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t("jobsDistribution")}</h3>
              <p className="text-xs text-slate-400">{t("techJobsSubtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricBox 
              icon={CheckCircle} 
              color="emerald" 
              label={t("dashCompleted")} 
              value={metrics.jobCounts.completed} 
              total={data.jobs?.length || 1}
              tooltip={ts("tooltipCompleted")}
            />
            <MetricBox 
              icon={Clock} 
              color="amber" 
              label={t("dashInProgress")} 
              value={metrics.jobCounts.inProgress} 
              total={data.jobs?.length || 1}
              tooltip={ts("tooltipInProgress")}
            />
            <MetricBox 
              icon={Activity} 
              color="slate" 
              label={t("dashOther")} 
              value={metrics.jobCounts.other} 
              total={data.jobs?.length || 1}
              tooltip={ts("tooltipOther")}
            />
          </div>
        </div>

        {/* Payments Status Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t("paymentsStatus")}</h3>
              <p className="text-xs text-slate-400">{t("dashPayments")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricBox 
              icon={CheckCircle} 
              color="emerald" 
              label={t("dashSettled")} 
              value={metrics.paymentStatus.settled} 
              total={data.orders?.length || 1}
              tooltip={ts("tooltipSettled")}
            />
            <MetricBox 
              icon={AlertCircle} 
              color="rose" 
              label={t("dashPendingPay")} 
              value={metrics.paymentStatus.pending} 
              total={data.orders?.length || 1}
              tooltip={ts("tooltipPendingPay")}
            />
            <MetricBox 
              icon={Unlink} 
              color="slate" 
              label={t("dashUnlinked")} 
              value={metrics.paymentStatus.unlinked} 
              total={data.orders?.length || 1}
              tooltip={ts("tooltipUnlinked")}
            />
          </div>
        </div>
      </div>

      {/* Footer Banner/Call to action */}
      <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 shadow-lg transition-all hover:shadow-xl">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 blur-3xl" />
        <div className="relative flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="max-w-3xl">
              <h4 className="text-lg font-bold text-white">{t("maintenanceImproving")}</h4>
              <p className="text-sm text-emerald-50/90 leading-relaxed">{t("maintenanceSubtitle")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricBox({ 
  icon: Icon, 
  color, 
  label, 
  value, 
  total,
  tooltip
}: { 
  icon: any, 
  color: "emerald" | "amber" | "rose" | "slate", 
  label: string, 
  value: number, 
  total: number,
  tooltip?: string
}) {
  const colors = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
    rose: "border-rose-100 bg-rose-50 text-rose-600",
    slate: "border-slate-100 bg-slate-50 text-slate-500",
  }

  const textColors = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    slate: "text-slate-700",
  }

  const pct = Math.round((value / total) * 100)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("group flex flex-col items-center rounded-2xl border p-4 transition-all hover:shadow-md", colors[color])}>
            <Icon className="mb-2 h-6 w-6" />
            <span className={cn("text-2xl font-black leading-none", textColors[color])}>{value}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/5">
              <div 
                className={cn("h-full transition-all duration-1000", {
                  "bg-emerald-500": color === "emerald",
                  "bg-amber-500": color === "amber",
                  "bg-rose-500": color === "rose",
                  "bg-slate-400": color === "slate",
                })}
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>
            <span className="mt-1 text-[10px] font-bold opacity-40">{pct}%</span>
          </div>
        </TooltipTrigger>
        {tooltip && <TooltipContent className="max-w-[200px] text-xs">{tooltip}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  )
}
