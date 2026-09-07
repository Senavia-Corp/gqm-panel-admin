"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Megaphone,
  Briefcase,
  File,
  ConstructionIcon,
  WalletIcon,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarDays,
  Award,
  TrendingUp,
} from "lucide-react"
import { useTranslations } from "@/components/providers/LocaleProvider"
import OpportunitiesPanel from "@/app/dashboard/OpportunitiesPanel"
import WeeklyTasksPanel from "@/app/dashboard/WeeklyTasksPanel"
import TechCertificatesPanel from "@/components/organisms/TechCertificatesPanel"
import TechPerformancePanel from "@/components/organisms/TechPerformancePanel"
import { roleSlugFromCookie } from "@/lib/role-map"

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardView = "jobs" | "tasks" | "opportunities" | "certificates" | "performance"
type JobTab  = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"
type StatusTab = "ALL" | string

interface TechJob {
  job_id:    string
  type:      string
  status:    string
  service:   string
  date:      string
  client:    string
  location?: string | null
}

// ─── Status badge helper ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  "Assigned/P. Quote":              "bg-blue-100 text-blue-700 border border-blue-200",
  "Waiting for Approval":           "bg-yellow-100 text-yellow-700 border border-yellow-200",
  "Scheduled / Work in Progress":   "bg-green-100 text-green-700 border border-green-200",
  "In Progress":                    "bg-green-100 text-green-700 border border-green-200",
  "Assigned-In progress":           "bg-green-100 text-green-700 border border-green-200",
  "Cancelled":                      "bg-red-100 text-red-700 border border-red-200",
  "Completed P. INV / POs":         "bg-purple-100 text-purple-700 border border-purple-200",
  "Completed PVI":                  "bg-purple-100 text-purple-700 border border-purple-200",
  "Invoiced":                       "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "HOLD":                           "bg-orange-100 text-orange-700 border border-orange-200",
  "PAID":                           "bg-emerald-100 text-emerald-800 border border-emerald-300",
  "Paid":                           "bg-emerald-100 text-emerald-800 border border-emerald-300",
  "Warranty":                       "bg-indigo-100 text-indigo-700 border border-indigo-200",
  "Archived":                       "bg-gray-100 text-gray-500 border border-gray-200",
  "Received-Stand By":              "bg-sky-100 text-sky-700 border border-sky-200",
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border border-gray-200"
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${cls}`}>
      {status}
    </span>
  )
}

const JOB_TYPE_COLORS: Record<string, string> = {
  QID: "bg-violet-100 text-violet-700 border border-violet-200",
  PTL: "bg-cyan-100 text-cyan-700 border border-cyan-200",
  PAR: "bg-rose-100 text-rose-700 border border-rose-200",
}

// ─── Jobs section ─────────────────────────────────────────────────────────────

function TechJobsPanel({
  subcontractorId,
  jobTab,
  yearTab,
  statusTab,
}: {
  subcontractorId: string
  jobTab: JobTab
  yearTab: YearTab
  statusTab: StatusTab
}) {
  const t = useTranslations("dashboard")
  const [jobs, setJobs]         = useState<TechJob[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const LIMIT = 20

  const fetchJobs = useCallback(async (pg: number) => {
    try {
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams({
        subcontractor_id: subcontractorId,
        page: String(pg),
        limit: String(LIMIT),
      })
      if (jobTab !== "ALL") qs.set("type", jobTab)
      if (yearTab !== "ALL") qs.set("year", yearTab)
      if (statusTab !== "ALL") qs.set("status", statusTab)

      const res = await apiFetch(`/api/metrics/jobs/summary?${qs}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json()
      // backend returns { jobs: [...], pagination: { total } }
      const rawJobs: any[] = data.jobs ?? data ?? []
      setJobs(rawJobs.map((j) => ({
        job_id:   j.job_id,
        type:     j.type,
        status:   j.status,
        service:  j.service,
        date:     j.date,
        client:   j.client,
        location: j.location ?? null,
      })))
      setTotal(data.pagination?.total ?? rawJobs.length)
    } catch (e) {
      setError(t("errorLoadJobsData"))
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [subcontractorId, jobTab, yearTab, statusTab, t])

  useEffect(() => { setPage(1) }, [jobTab, yearTab, statusTab])
  useEffect(() => { fetchJobs(page) }, [page, fetchJobs])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-gray-50/60">
        <h2 className="text-base font-bold text-gray-900">{t("techJobsSection")}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{t("techJobsSubtitle")}</p>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t("loadingJobs")}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">{t("techNoJobs")}</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {jobs.map((j) => (
                <div key={j.job_id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/jobs/${j.job_id}`}
                      className="font-mono text-sm font-bold text-gqm-green-dark hover:underline"
                    >
                      {j.job_id}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${JOB_TYPE_COLORS[j.type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {j.type}
                    </span>
                  </div>
                  {j.location && (
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="truncate">{j.location}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <StatusBadge status={j.status} />
                    <Link href={`/jobs/${j.job_id}`}>
                      <Button size="icon" variant="ghost" className="h-7 w-7 bg-gqm-yellow hover:bg-gqm-yellow/80">
                        <Eye className="h-3.5 w-3.5 text-gqm-green-dark" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full min-w-[600px] text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">{t("colJobId")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colType")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colLocation")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colStatus")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colService")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colDate")}</th>
                  <th className="px-4 py-2.5 font-medium text-center">{t("dialogViewJob")}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.job_id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-semibold text-gqm-green-dark">
                      <Link href={`/jobs/${j.job_id}`} className="hover:underline">{j.job_id}</Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${JOB_TYPE_COLORS[j.type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {j.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      {j.location ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                          <span className="truncate">{j.location}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={j.status} /></td>
                    <td className="px-4 py-2.5 text-gray-500">{j.service}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-500">{j.date}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Link href={`/jobs/${j.job_id}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 bg-gqm-yellow hover:bg-gqm-yellow/80">
                          <Eye className="h-3.5 w-3.5 text-gqm-green-dark" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/60">
                <span className="text-xs text-gray-400">
                  {t("paginationPage")} {page} / {totalPages} · {total} {t("paginationTotal")}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LeadTechnicianDashboard() {
  const t = useTranslations("dashboard")

  // El técnico aterriza en SUS TAREAS, no en "jobs".
  //
  // U-01 (auditoría de portal): al darle por fin una pantalla propia, la vista
  // "jobs" pedía /api/metrics/jobs/summary, que exige `dashboard:read` — un
  // permiso que la política `technical-portal` NO concede. Su primera pantalla
  // era «Could not load jobs data.»: se cambió un callejón sin salida por otro.
  // Lo que un técnico necesita al entrar son sus tareas, y esas salen de
  // /api/technician/<id>, que sí puede pedir.
  // D6: se preguntaba a `localStorage.user_data.role`, cuyo valor
  // «LEAD_TECHNICIAN» el backend no emite nunca —lo inventa la pantalla de
  // login para la etiqueta de la cabecera— y que se reescribe desde devtools.
  // La cookie `gqm_role` la escribe el servidor y es la que evalúa
  // `middleware.ts`; el localStorage queda de reserva para sesiones ya
  // abiertas antes de este cambio.
  const esTecnico =
    roleSlugFromCookie() === "technical" ||
    (typeof window !== "undefined" &&
      (() => { try {
        return JSON.parse(localStorage.getItem("user_data") || "{}")?.role === "LEAD_TECHNICIAN"
      } catch { return false } })())
  const [view, setView] = useState<DashboardView>(esTecnico ? "tasks" : "jobs")
  const [jobTab, setJobTab] = useState<JobTab>("ALL")
  const [yearTab, setYearTab] = useState<YearTab>("ALL")
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL")
  const [subcontractorId, setSubcontractorId] = useState<string | null>(null)
  const [loadingTech, setLoadingTech] = useState(true)

  // Fetch technician → subcontractor ID once
  useEffect(() => {
    const run = async () => {
      try {
        const userId = localStorage.getItem("user_id")
        if (!userId) { setLoadingTech(false); return }

        const userData = localStorage.getItem("user_data")
        const role = userData ? JSON.parse(userData).role : null

        if (role === "SUBCONTRACTOR") {
          setSubcontractorId(userId)
          setLoadingTech(false)
          return
        }

        const res = await apiFetch(`/api/technician/${userId}`, { cache: "no-store" })
        if (!res.ok) { setLoadingTech(false); return }

        const data = await res.json()
        setSubcontractorId(data.subcontractor?.ID_Subcontractor ?? null)
      } catch (e) {
        console.error("[TechDashboard] error fetching technician:", e)
      } finally {
        setLoadingTech(false)
      }
    }
    run()
  }, [])



  return (
    <div className="space-y-6">
      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t("title")}</h1>
      </div>

      {/* ── View switcher (Top Tabs) ── */}
      <div className="overflow-x-auto pb-1 sm:pb-0">
        <div className="inline-flex min-w-max rounded-lg border bg-white p-1 gap-0.5">
          {/* U-01: al técnico no se le ofrece la pestaña Jobs. Su vista pide
              /api/metrics/jobs/summary, que exige `dashboard:read`, y su
              política no lo concede: el botón solo podía llevar a un error.
              Un botón visible que termina en 403 es un callejón sin salida,
              que es justo lo que este arreglo venía a quitar. */}
          {!esTecnico && (
            <Button
              variant={view === "jobs" ? "default" : "ghost"}
              className={view === "jobs" ? "bg-gqm-green text-white" : ""}
              onClick={() => setView("jobs")}
            >
              <span className="flex items-center gap-2">
                <File className="h-4 w-4" />
                {t("viewJobs")}
              </span>
            </Button>
          )}
          <Button
            variant={view === "tasks" ? "default" : "ghost"}
            className={view === "tasks" ? "bg-gqm-green text-white" : ""}
            onClick={() => setView("tasks")}
          >
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("viewWeeklyTasks")}
            </span>
          </Button>
          {/* U-01: al tecnico no se le ofrece esta pestana. Pide un endpoint que
              exige `client:read`, permiso que `technical-portal` no concede:
              medido, terminaba en 403. Un boton visible que acaba en 403 es
              el callejon sin salida que este arreglo venia a quitar. */}
          {!esTecnico && (
            <Button
              variant={view === "opportunities" ? "default" : "ghost"}
              className={view === "opportunities" ? "bg-gqm-green text-white" : ""}
              onClick={() => setView("opportunities")}
            >
              <span className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                {t("viewOpportunities")}
              </span>
            </Button>
          )}
          {/* U-01: al tecnico no se le ofrece esta pestana. Pide un endpoint que
              exige `certificate:read`, permiso que `technical-portal` no concede:
              medido, terminaba en 403. Un boton visible que acaba en 403 es
              el callejon sin salida que este arreglo venia a quitar. */}
          {!esTecnico && (
            <Button
              variant={view === "certificates" ? "default" : "ghost"}
              className={view === "certificates" ? "bg-gqm-green text-white" : ""}
              onClick={() => setView("certificates")}
            >
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                {t("tabCertificates")}
              </span>
            </Button>
          )}
          {/* U-01: al tecnico no se le ofrece esta pestana. Pide un endpoint que
              exige `subcontractor:read`, permiso que `technical-portal` no concede:
              medido, terminaba en 403. Un boton visible que acaba en 403 es
              el callejon sin salida que este arreglo venia a quitar. */}
          {!esTecnico && (
            <Button
              variant={view === "performance" ? "default" : "ghost"}
              className={view === "performance" ? "bg-gqm-green text-white" : ""}
              onClick={() => setView("performance")}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t("tabPerformance")}
              </span>
            </Button>
          )}
        </div>
      </div>

      {view === "opportunities" ? (
        <OpportunitiesPanel subcontractorId={subcontractorId} isTechnician={true} />
      ) : view === "tasks" ? (
        <WeeklyTasksPanel subcontractorId={subcontractorId ?? ""} hidePersonFilters />
      ) : view === "certificates" ? (
        <TechCertificatesPanel subcontractorId={subcontractorId ?? ""} />
      ) : view === "performance" ? (
        <TechPerformancePanel subcontractorId={subcontractorId ?? ""} />
      ) : (
        <>
          {/* ── Filters (year + job type + status) ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="overflow-x-auto pb-1 sm:pb-0">
              <div className="inline-flex min-w-max items-center gap-2 sm:gap-3">
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

                {/* Status selector */}
                <Select value={statusTab} onValueChange={(v) => setStatusTab(v)}>
                  <SelectTrigger className="h-10 w-[160px] sm:w-[180px] rounded-xl border bg-white px-3">
                    <SelectValue placeholder={t("colStatus") || "Status"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("all_m")}</SelectItem>
                    <SelectItem value="Assigned/P. Quote">Assigned/P. Quote</SelectItem>
                    <SelectItem value="Waiting for Approval">Waiting for Approval</SelectItem>
                    <SelectItem value="Scheduled / Work in Progress">Scheduled / Work in Progress</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Assigned-In progress">Assigned-In progress</SelectItem>
                    <SelectItem value="Invoiced">Invoiced</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                    <SelectItem value="Warranty">Warranty</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="HOLD">HOLD</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                {/* Job type tabs */}
                <Tabs value={jobTab} onValueChange={(v) => setJobTab(v as JobTab)}>
                  <TabsList className="h-10 rounded-xl border bg-white p-1">
                    {(
                      [
                        { v: "ALL", Icon: Briefcase, label: t("all_m") },
                        { v: "QID", Icon: File, label: "QID" },
                        { v: "PTL", Icon: ConstructionIcon, label: "PTL" },
                        { v: "PAR", Icon: WalletIcon, label: "PAR" },
                      ] as const
                    ).map(({ v, Icon, label }) => (
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
          </div>

          {/* ── Jobs section ── */}
          {loadingTech ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : subcontractorId ? (
            <TechJobsPanel
              subcontractorId={subcontractorId}
              jobTab={jobTab}
              yearTab={yearTab}
              statusTab={statusTab}
            />
          ) : (
            <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-sm text-gray-400">
              {t("noJobsAssigned")}
            </div>
          )}
        </>
      )}
    </div>
  )
}
