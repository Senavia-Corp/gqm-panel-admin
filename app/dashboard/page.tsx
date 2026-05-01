"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import {
  Briefcase,
  Users,
  File,
  ConstructionIcon,
  WalletIcon,
  Download,
  CalendarDays,
  Building2,
  HardHat,
  Megaphone,
} from "lucide-react"
import type { User } from "@/lib/types"
import { LeadTechnicianDashboard } from "@/components/organisms/LeadTechnicianDashboard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { logout } from "@/lib/auth-utils"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"

import JobsPanel from "./JobsPanel"
import ClientsPanel from "./ClientsPanel"
import ParentCompaniesPanel from "./ParentCompaniesPanel"
import MembersPanel from "./MembersPanel"
import SubcontractorsPanel from "./SubcontractorsPanel"
import WeeklyTasksPanel from "./WeeklyTasksPanel"
import OpportunitiesPanel from "./OpportunitiesPanel"

type DashboardView = "jobs" | "parent-companies" | "clients" | "members" | "subcontractors" | "tasks" | "opportunities"
type JobTab  = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

export default function DashboardPage() {
  const router = useRouter()
  const t = useTranslations("dashboard")
  const [view,    setView]    = useState<DashboardView>("jobs")
  const [jobTab,  setJobTab]  = useState<JobTab>("ALL")
  const [yearTab, setYearTab] = useState<YearTab>("ALL")
  const [user,    setUser]    = useState<User | null>(null)

  const [isDownloadingReport, setIsDownloadingReport] = useState(false)

  const { hasPermission } = usePermissions()
  const canReadJobs    = hasPermission("job:read")
  const canReadClients = hasPermission("client:read") || hasPermission("parent_mgmt_co:read")
  const canReadMembers = hasPermission("member:read")

  useEffect(() => {
    if (!canReadJobs) {
      if (canReadClients) setView("clients")
      else if (canReadMembers) setView("members")
      else setView("tasks")
    }
  }, [canReadJobs, canReadClients, canReadMembers])

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token")
    const userData    = localStorage.getItem("user_data")
    if (!accessToken || !userData) { logout(); return }
    try { setUser(JSON.parse(userData)) } catch { logout() }
  }, [router])

  const handleDownloadJobsReport = async () => {
    try {
      setIsDownloadingReport(true)
      const qs = new URLSearchParams({ type: jobTab })
      if (yearTab !== "ALL") qs.set("year", yearTab)

      const res = await apiFetch(`/api/financial/reports/pdf?${qs.toString()}`, {
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
      alert(err instanceof Error ? err.message : t("errorLoadJobsData"))
    } finally {
      setIsDownloadingReport(false)
    }
  }

  if (!user) return null

  if (user.role === "LEAD_TECHNICIAN") {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            <LeadTechnicianDashboard />
          </main>
        </div>
      </div>
    )
  }

  const showFilters = view === "jobs" || view === "parent-companies" || view === "clients" || view === "members"

  const navBtn = (v: DashboardView, label: string, Icon: React.ElementType) => (
    <Button
      variant={view === v ? "default" : "ghost"}
      className={view === v ? "bg-gqm-green text-white" : ""}
      onClick={() => setView(v)}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    </Button>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 sm:mb-6">
            <h1 className="mb-3 sm:mb-4 text-xl sm:text-3xl font-bold">{t("title")}</h1>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
              {/* ── View selector ── */}
              <div className="overflow-x-auto pb-1 sm:pb-0">
                <div className="inline-flex min-w-max rounded-lg border bg-white p-1 gap-0.5">
                  {canReadJobs    && navBtn("jobs",             t("viewJobs"),             File)}
                  {canReadClients && navBtn("parent-companies", t("viewParentCompanies"),  Building2)}
                  {canReadClients && navBtn("clients",          t("viewClients"),          ConstructionIcon)}
                  {canReadMembers && navBtn("members",          t("viewMembers"),          Users)}
                  {canReadJobs    && navBtn("subcontractors",   t("viewSubcontractors"),   HardHat)}
                  {navBtn("tasks", t("viewWeeklyTasks"), CalendarDays)}
                  {navBtn("opportunities", t("viewOpportunities"), Megaphone)}
                </div>
              </div>

              {/* ── Filters ── */}
              {showFilters && (
                <div className="overflow-x-auto pb-1 sm:pb-0">
                  <div className="inline-flex min-w-max items-center gap-2 sm:gap-3">
                    {view === "jobs" && (
                      <Button
                        onClick={handleDownloadJobsReport}
                        disabled={isDownloadingReport}
                        className="h-10 rounded-xl bg-gqm-green-dark text-white hover:bg-gqm-green-dark/90"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">{isDownloadingReport ? t("downloading") : t("downloadReport")}</span>
                          <span className="sm:hidden">{isDownloadingReport ? "…" : "PDF"}</span>
                        </span>
                      </Button>
                    )}

                    {/* Year selector */}
                    <Select value={yearTab} onValueChange={(v) => setYearTab(v as YearTab)}>
                      <SelectTrigger className="h-10 w-[110px] sm:w-[140px] rounded-xl border bg-white px-3">
                        <SelectValue placeholder={t("colYear") || "Year"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("all_m")}</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Job Type Tabs */}
                    <Tabs value={jobTab} onValueChange={(v) => setJobTab(v as JobTab)}>
                      <TabsList className="h-10 rounded-xl border bg-white p-1">
                        {([
                          { v: "ALL", Icon: Briefcase,        label: t("all_m")  },
                          { v: "QID", Icon: File,             label: "QID"  },
                          { v: "PTL", Icon: ConstructionIcon, label: "PTL"  },
                          { v: "PAR", Icon: WalletIcon,       label: "PAR"  },
                        ] as const).map(({ v, Icon, label }) => (
                          <TabsTrigger
                            key={v}
                            value={v}
                            className="h-8 min-w-[60px] sm:min-w-[80px] rounded-lg px-2 sm:px-4 text-xs sm:text-sm font-semibold data-[state=active]:bg-gqm-green-dark data-[state=active]:text-white"
                          >
                            <span className="flex items-center gap-1 sm:gap-1.5">
                              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{label}
                            </span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Panel content ── */}
          {view === "jobs" ? (
            <JobsPanel
              jobTab={jobTab}
              yearTab={yearTab}
              onDownloadReport={handleDownloadJobsReport}
              isDownloadingReport={isDownloadingReport}
            />
          ) : view === "parent-companies" ? (
            <ParentCompaniesPanel jobTab={jobTab} yearTab={yearTab} />
          ) : view === "clients" ? (
            <ClientsPanel jobTab={jobTab} yearTab={yearTab} />
          ) : view === "members" ? (
            <MembersPanel jobTab={jobTab} yearTab={yearTab} />
          ) : view === "subcontractors" ? (
            <SubcontractorsPanel />
          ) : view === "opportunities" ? (
            <OpportunitiesPanel />
          ) : (
            <WeeklyTasksPanel />
          )}
        </main>
      </div>
    </div>
  )
}
