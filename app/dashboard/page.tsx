"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import {
  Briefcase,
  DollarSign,
  CheckCircle,
  Clock,
  Calculator,
  Users,
  Trophy,
  TrendingUp,
  Badge,
  AlertCircle,
  File,
  Workflow,
  ConstructionIcon,
  WalletIcon,
  Download,
  CalendarDays,
} from "lucide-react"
import type { User } from "@/lib/types"
import { LeadTechnicianDashboard } from "@/components/organisms/LeadTechnicianDashboard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import JobsPanel from "./JobsPanel"
import ClientsPanel from "./ClientsPanel"
import MembersPanel from "./MembersPanel"
import WeeklyTasksPanel from "./WeeklyTasksPanel"

type DashboardView = "jobs" | "clients" | "members" | "tasks"
type JobTab = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

interface ClientMetrics {
  totalClients: number
  topClient: string
  bestRatedClient: string
  totalRevenue: number
  totalBuilderCost: number
}

interface StatusData {
  name: string
  value: number
  color: string
  percentage: number
}

interface ClientDistribution {
  name: string
  value: number
  color: string
  percentage: number
}

type JobsStatusMetricsResponse = {
  type: JobTab
  total: number
  rows: Array<{ status: string; count: number; pct: number }>
  unknown_status?: { count: number; pct: number; statuses: string[] }
  null_status?: { count: number; pct: number }
}


export default function DashboardPage() {
  const router = useRouter()
  const [view, setView] = useState<DashboardView>("jobs")
  const [jobTab, setJobTab] = useState<JobTab>("ALL")
  const [yearTab, setYearTab] = useState<YearTab>("ALL")

  const [user, setUser] = useState<User | null>(null)

  // Jobs metrics desde endpoint nuevo
  const [jobsMetrics, setJobsMetrics] = useState<JobsStatusMetricsResponse | null>(null)
  const [isLoadingJobsMetrics, setIsLoadingJobsMetrics] = useState(true)

  // Charts
  const [statusDistribution, setStatusDistribution] = useState<StatusData[]>([])

  const [clientMetrics, setClientMetrics] = useState<ClientMetrics>({
    totalClients: 0,
    topClient: "N/A",
    bestRatedClient: "N/A",
    totalRevenue: 0,
    totalBuilderCost: 0,
  })

  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [clientDistribution, setClientDistribution] = useState<ClientDistribution[]>([])

  // Reports
  const [isDownloadingReport, setIsDownloadingReport] = useState(false)

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token")
    const userData    = localStorage.getItem("user_data")
    const loginTime   = localStorage.getItem("login_time")

    if (!accessToken || !userData) {
      router.push("/login")
      return
    }

    if (loginTime) {
      const elapsedTime = Date.now() - Number.parseInt(loginTime)
      const ONE_HOUR    = 60 * 60 * 1000
      if (elapsedTime >= ONE_HOUR) {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("token_type")
        localStorage.removeItem("user_id")
        localStorage.removeItem("user_type")
        localStorage.removeItem("user_data")
        localStorage.removeItem("login_time")
        router.push("/login")
        return
      }
    }

    setUser(JSON.parse(userData))
  }, [router])

  useEffect(() => {
    const fetchJobsMetrics = async () => {
      try {
        setIsLoadingJobsMetrics(true)

        const qs = new URLSearchParams({ type: jobTab })
        if (yearTab !== "ALL") qs.set("year", yearTab)

        const res = await fetch(`/api/metrics/jobs/status?${qs.toString()}`)
        if (!res.ok) throw new Error(`Failed metrics/jobs/status: ${res.status}`)

        const data: JobsStatusMetricsResponse = await res.json()
        setJobsMetrics(data)

        const chartData: StatusData[] = (data.rows || []).map((r) => ({
          name:       r.status,
          value:      r.count,
          color:      "",
          percentage: r.pct,
        }))

        chartData.sort((a, b) => b.value - a.value)
        setStatusDistribution(chartData)
      } catch (err) {
        console.error("[dashboard] jobs metrics error:", err)
        setJobsMetrics(null)
        setStatusDistribution([])
      } finally {
        setIsLoadingJobsMetrics(false)
      }
    }

    if (view === "jobs") fetchJobsMetrics()
  }, [jobTab, yearTab, view])

  useEffect(() => {
    const fetchClientMetrics = async () => {
      try {
        setIsLoadingClients(true)

        const response = await fetch("/api/clients")
        if (!response.ok) throw new Error(`Failed to fetch clients: ${response.status}`)

        const data       = await response.json()
        const allClients = data.results || []
        const totalClients = allClients.length

        let topClient = "N/A"
        let maxJobs   = 0
        allClients.forEach((client: any) => {
          const jobCount = client.jobs?.length || 0
          if (jobCount > maxJobs) {
            maxJobs   = jobCount
            topClient = client.Parent_Company || client.Client_Community || "Unknown"
          }
        })

        let bestRatedClient = "N/A"
        let maxRevenue      = 0
        allClients.forEach((client: any) => {
          const clientRevenue = (client.jobs || []).reduce((sum: number, job: any) => {
            if (job.Job_status?.toLowerCase() !== "archived") {
              const premium = Number.parseFloat(job.Gqm_premium_in_money) || 0
              return sum + premium
            }
            return sum
          }, 0)

          if (clientRevenue > maxRevenue) {
            maxRevenue      = clientRevenue
            bestRatedClient = client.Parent_Company || client.Client_Community || "Unknown"
          }
        })

        let totalRevenue     = 0
        let totalBuilderCost = 0
        let totalJobCount    = 0

        allClients.forEach((client: any) => {
          ;(client.jobs || []).forEach((job: any) => {
            if (job.Job_status?.toLowerCase() !== "archived") {
              totalJobCount++
              const premium = Number.parseFloat(job.Gqm_premium_in_money)      || 0
              const cost    = Number.parseFloat(job.Gqm_adj_formula_pricing)    || 0
              totalRevenue     += premium
              totalBuilderCost += cost
            }
          })
        })

        const clientDistData: ClientDistribution[] = allClients.map((client: any) => {
          const jobCount = (client.jobs || []).filter(
            (job: any) => job.Job_status?.toLowerCase() !== "archived"
          ).length
          return {
            name:       client.Parent_Company || client.Client_Community || "Unknown",
            value:      jobCount,
            color:      "",
            percentage: totalJobCount > 0 ? (jobCount / totalJobCount) * 100 : 0,
          }
        })

        const filteredDistData = clientDistData
          .filter((c) => c.value > 0)
          .sort((a, b) => b.value - a.value)

        setClientMetrics({ totalClients, topClient, bestRatedClient, totalRevenue, totalBuilderCost })
        setClientDistribution(filteredDistData)
      } catch (error) {
        console.error("[v0] Error fetching client metrics:", error)
        setClientMetrics({
          totalClients: 0, topClient: "N/A", bestRatedClient: "N/A",
          totalRevenue: 0, totalBuilderCost: 0,
        })
        setClientDistribution([])
      } finally {
        setIsLoadingClients(false)
      }
    }

    fetchClientMetrics()
  }, [])

  const jobsCards = useMemo(() => {
    if (!jobsMetrics) return []

    const cards = [{
      key:   "total",
      name:  "Total Jobs",
      value: String(jobsMetrics.total ?? 0),
      pct:   100,
      icon:  Briefcase,
    }]

    const icons = [
      Briefcase, Clock, CheckCircle, DollarSign, Calculator,
      Users, Trophy, TrendingUp, Badge, AlertCircle,
      File, Workflow, ConstructionIcon, WalletIcon,
    ]

    const rows = jobsMetrics.rows || []
    for (let i = 0; i < rows.length; i++) {
      const r    = rows[i]
      const Icon = icons[(i + 1) % icons.length]
      cards.push({
        key:   r.status,
        name:  r.status,
        value: String(r.count ?? 0),
        pct:   Number(r.pct ?? 0),
        icon:  Icon,
      })
    }

    return cards
  }, [jobsMetrics])

  if (!user) return null

  const handleDownloadJobsReport = async () => {
    try {
      setIsDownloadingReport(true)

      const qs  = new URLSearchParams({ type: jobTab })
      if (yearTab !== "ALL") qs.set("year", yearTab)

      const res = await fetch(`/api/reports/jobs?${qs.toString()}`, {
        method:  "GET",
        headers: { Accept: "application/pdf" },
      })

      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? ""
        if (ct.includes("application/json")) {
          const err = await res.json()
          throw new Error(err?.detail ?? `Failed to download report: ${res.status}`)
        }
        throw new Error(`Failed to download report: ${res.status}`)
      }

      const blob        = await res.blob()
      const disposition = res.headers.get("content-disposition") ?? ""
      const match       = disposition.match(/filename="([^"]+)"/i)
      const filename    = match?.[1] ?? `jobs_report_${jobTab}_${yearTab}.pdf`

      const url = window.URL.createObjectURL(blob)
      const a   = document.createElement("a")
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[dashboard] download report error:", err)
      alert(err instanceof Error ? err.message : "Failed to download report")
    } finally {
      setIsDownloadingReport(false)
    }
  }

  // ── Lead Technician view ──────────────────────────────────────────────────
  if (user.role === "LEAD_TECHNICIAN") {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <LeadTechnicianDashboard />
          </main>
        </div>
      </div>
    )
  }

  // ── Whether the year/jobType toolbar is shown ─────────────────────────────
  const showFilters = view === "jobs" || view === "clients" || view === "members"

  // ── GQM Member Dashboard ──────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>

            <div className="flex items-center justify-between gap-4">
              {/* ── View selector ── */}
              <div className="inline-flex rounded-lg border bg-white p-1">
                <Button
                  variant={view === "jobs" ? "default" : "ghost"}
                  className={view === "jobs" ? "bg-gqm-green text-white" : ""}
                  onClick={() => setView("jobs")}
                >
                  <span className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    Jobs
                  </span>
                </Button>
                <Button
                  variant={view === "clients" ? "default" : "ghost"}
                  className={view === "clients" ? "bg-gqm-green text-white" : ""}
                  onClick={() => setView("clients")}
                >
                  <span className="flex items-center gap-2">
                    <ConstructionIcon className="h-4 w-4" />
                    Clients
                  </span>
                </Button>
                <Button
                  variant={view === "members" ? "default" : "ghost"}
                  className={view === "members" ? "bg-gqm-green text-white" : ""}
                  onClick={() => setView("members")}
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Members
                  </span>
                </Button>

                {/* ── NEW: Tasks tab ── */}
                <Button
                  variant={view === "tasks" ? "default" : "ghost"}
                  className={view === "tasks" ? "bg-gqm-green text-white" : ""}
                  onClick={() => setView("tasks")}
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Weekly Tasks
                  </span>
                </Button>
              </div>

              {/* ── Year + JobType filters (hidden on tasks view) ── */}
              {showFilters && (
                <div className="flex items-center gap-3">

                  {/* Download report button — only on jobs */}
                  {view === "jobs" && (
                    <Button
                      onClick={handleDownloadJobsReport}
                      disabled={isDownloadingReport}
                      className="h-10 rounded-xl bg-gqm-green-dark text-white hover:bg-gqm-green-dark/90"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        {isDownloadingReport ? "Downloading..." : "Download Report"}
                      </span>
                    </Button>
                  )}

                  {/* Year selector */}
                  <Select value={yearTab} onValueChange={(v) => setYearTab(v as YearTab)}>
                    <SelectTrigger className="h-10 w-[140px] rounded-xl border bg-white px-3">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Job Type Tabs */}
                  <Tabs value={jobTab} onValueChange={(v) => setJobTab(v as JobTab)}>
                    <TabsList className="h-10 rounded-xl border bg-white p-1">
                      <TabsTrigger
                        value="ALL"
                        className="h-8 min-w-[90px] rounded-lg px-6 text-sm font-semibold data-[state=active]:bg-gqm-green-dark data-[state=active]:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />All
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="QID"
                        className="h-8 min-w-[90px] rounded-lg px-6 text-sm font-semibold data-[state=active]:bg-gqm-green-dark data-[state=active]:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <File className="h-4 w-4" />QID
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="PTL"
                        className="h-8 min-w-[90px] rounded-lg px-6 text-sm font-semibold data-[state=active]:bg-gqm-green-dark data-[state=active]:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <ConstructionIcon className="h-4 w-4" />PTL
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="PAR"
                        className="h-8 min-w-[90px] rounded-lg px-6 text-sm font-semibold data-[state=active]:bg-gqm-green-dark data-[state=active]:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <WalletIcon className="h-4 w-4" />PAR
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
          </div>

          {/* ── Panel content ── */}
          {view === "jobs" ? (
            <JobsPanel
              isLoadingJobsMetrics={isLoadingJobsMetrics}
              jobsCards={jobsCards}
              statusDistribution={statusDistribution}
            />
          ) : view === "clients" ? (
            <ClientsPanel jobTab={jobTab} yearTab={yearTab} />
          ) : view === "members" ? (
            <MembersPanel jobTab={jobTab} yearTab={yearTab} />
          ) : (
            <WeeklyTasksPanel />
          )}
        </main>
      </div>
    </div>
  )
}