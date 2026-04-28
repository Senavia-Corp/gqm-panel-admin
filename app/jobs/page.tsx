"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { JobFilters } from "@/components/organisms/JobFilters"
import { JobsTable } from "@/components/organisms/JobsTable"
import { DeleteJobDialog } from "@/components/organisms/DeleteJobDialog"
import { fetchJobs, deleteJob } from "@/lib/services/jobs-service"
import type { JobDTO, JobStatus, JobType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers, ClipboardList, Wrench, Briefcase } from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { useJobFilters } from "@/hooks/useJobFilters"
import { AdvancedJobFilters } from "@/components/organisms/AdvancedJobFilters"
import { ExportJobsDialog } from "@/components/organisms/ExportJobsDialog"

type JobsTab = "ALL" | JobType
type YearFilter = "ALL" | "2026" | "2025" | "2024" | "2023"


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractPodioYearFromJob(job: any): number | null {
  const jobType = String(job?.Job_type ?? job?.job_type ?? "").toUpperCase()
  const raw = jobType === "PTL"
    ? job?.Estimated_start_date
    : job?.Date_assigned ?? job?.Estimated_start_date
  if (!raw) return null
  const s = String(raw)
  const m = s.match(/\b(\d{4})\b/)
  if (m) { const y = Number(m[1]); if (Number.isFinite(y)) return y }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear()
}

function sortArchivedLast(list: JobDTO[]) {
  return [...list].sort((a, b) => {
    const aA = a.Job_status === "Archived"
    const bA = b.Job_status === "Archived"
    return aA === bA ? 0 : aA ? 1 : -1
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function JobsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const { hasPermission } = usePermissions()
  const t = useTranslations("jobs")
  const tCommon = useTranslations("common")

  const tabTitles: Record<JobsTab, string> = useMemo(() => ({
    ALL: t("tabTitleAll"),
    QID: t("tabTitleQid"),
    PTL: t("tabTitlePtl"),
    PAR: t("tabTitlePar"),
  }), [t])

  const yearOptions = useMemo(() => [
    { value: "ALL" as YearFilter, label: t("allYears") },
    { value: "2026" as YearFilter, label: "2026" },
    { value: "2025" as YearFilter, label: "2025" },
    { value: "2024" as YearFilter, label: "2024" },
    { value: "2023" as YearFilter, label: "2023" },
  ], [t])

  // ── Filters & Pagination ──────────────────────────────────────────────────
  const { state: filters, handlers, toServiceFilters, activeFilterCount } = useJobFilters()
  
  const [totalJobs, setTotalJobs] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const itemsPerPage = 10

  // ── Data ──────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<JobDTO[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobDTO[]>([])

  const [technicianAllJobs, setTechnicianAllJobs] = useState<JobDTO[]>([])
  const [technicianFilteredJobs, setTechnicianFilteredJobs] = useState<JobDTO[]>([])

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean; job: JobDTO | null; suggestedYear: number | null
  }>({ open: false, job: null, suggestedYear: null })

  const isTechnician = user?.role === "LEAD_TECHNICIAN"

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  // ── Core fetch ────────────────────────────────────────────────────────────
  async function loadJobs() {
    if (!user) return
    setIsLoading(true)
    setLoadError(null)

    try {
      const currentFilters = toServiceFilters()
      
      if (isTechnician) {
        const techRes = await fetch(`/api/technician/${user.id}`, { cache: "no-store" })
        if (!techRes.ok) throw new Error("Failed to fetch technician data")
        const techData = await techRes.json()
        const assignedIds: string[] = techData?.subcontractor?.jobs?.map((j: any) => j.ID_Jobs) ?? []

        // Fetch enough to filter client-side for technicians as requested
        const { jobs: allJobs } = await fetchJobs(1, 1000, currentFilters)
        const sorted = sortArchivedLast(allJobs.filter((j) => j.ID_Jobs != null && assignedIds.includes(j.ID_Jobs)))

        setTechnicianAllJobs(sorted)
        setTechnicianFilteredJobs(sorted)
        setTotalJobs(sorted.length)
        setTotalPages(Math.max(1, Math.ceil(sorted.length / itemsPerPage)))
        return
      }

      const { jobs: jobsData, total } = await fetchJobs(
        filters.page,
        itemsPerPage,
        currentFilters
      )
      const sorted = sortArchivedLast(jobsData)
      setJobs(sorted)
      setFilteredJobs(sorted)
      setTotalJobs(total)
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)))
    } catch (err) {
      console.error("[jobs] Error loading jobs:", err)
      setLoadError(err instanceof Error ? err.message : "Unknown error")
      toast({ title: "Error", description: t("loadError"), variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadJobs()
    }
  }, [
    user, 
    filters.page, 
    filters.tab, 
    filters.year, 
    filters.appliedSearch,
    filters.status, 
    filters.clientId, 
    filters.parentMgmtCoId,
    filters.dateFrom, 
    filters.dateTo,
    filters.memberId
  ])

  const handleRetry = async () => {
    setRetrying(true)
    await loadJobs()
    setRetrying(false)
  }

  const handleDelete = (job: JobDTO) =>
    setDeleteDialog({ open: true, job, suggestedYear: extractPodioYearFromJob(job) })

  const handleDeleteConfirm = async (opts: { syncPodio: boolean; year?: number }) => {
    const job = deleteDialog.job
    if (!job?.ID_Jobs) {
      toast({ title: "Error", description: t("missingId"), variant: "destructive" })
      return
    }
    try {
      await deleteJob(job.ID_Jobs, { sync_podio: opts.syncPodio, year: opts.year })
      toast({ title: "Success", description: `${t("deletedSuccess").replace("{id}", job.ID_Jobs)}` })
      loadJobs()
      setDeleteDialog({ open: false, job: null, suggestedYear: null })
    } catch (err) {
      console.error("[jobs] Error deleting job:", err)
      toast({ title: "Error", description: t("deletedError"), variant: "destructive" })
    }
  }

  const handlePreviousPage = () => {
    if (filters.page > 1) handlers.setPage(filters.page - 1)
  }
  const handleNextPage = () => {
    if (filters.page < totalPages) handlers.setPage(filters.page + 1)
  }

  const technicianPageSlice = useMemo(() => {
    const start = (filters.page - 1) * itemsPerPage
    return technicianFilteredJobs.slice(start, start + itemsPerPage)
  }, [technicianFilteredJobs, filters.page])

  const displayedJobs = isTechnician ? technicianPageSlice : filteredJobs
  const yearSuffix = filters.year === "ALL" ? "" : ` ${filters.year}`
  const headerTitle = `${tabTitles[filters.tab]}${yearSuffix}`

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Header + Tabs */}
          <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-bold sm:text-3xl">{t("title")}</h1>

            <div className="flex justify-start sm:flex-1 sm:justify-center">
              <Tabs value={filters.tab} onValueChange={(v) => handlers.setTab(v as any)}>
                <TabsList className="h-9 rounded-xl border bg-white p-1 shadow-sm sm:h-10">
                  {(["ALL", "QID", "PTL", "PAR"] as JobsTab[]).map((tab) => {
                    const Icon = { ALL: Layers, QID: ClipboardList, PTL: Wrench, PAR: Briefcase }[tab]
                    return (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="h-7 rounded-lg px-2.5 text-xs font-semibold data-[state=active]:bg-gqm-green-dark data-[state=active]:text-white sm:h-8 sm:px-6 sm:text-sm"
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">{tab === "ALL" ? t("tabAll") : tab}</span>
                          <span className="sm:hidden text-[11px] font-bold">{tab === "ALL" ? t("tabAll") : tab}</span>
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            </div>

            <div className="hidden sm:block sm:w-[140px]" />
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-lg text-gray-500">{t("loading")}</div>
            </div>
          ) : (
            <div className="space-y-4">
              <AdvancedJobFilters
                title={headerTitle}
                count={totalJobs}
                activeFilterCount={activeFilterCount}

                searchValue={filters.searchInput}
                onSearchChange={handlers.setSearchInput}
                onSearchSubmit={handlers.submitSearch}
                onSearchKeyDown={handlers.handleSearchKeyDown}

                year={filters.year}
                yearOptions={yearOptions}
                onYearChange={(y) => handlers.setYear(y as any)}

                memberId={filters.memberId}
                onMemberChange={handlers.setMemberId}
                status={filters.status}
                clientId={filters.clientId}
                parentMgmtCoId={filters.parentMgmtCoId}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onStatusChange={handlers.setStatus}
                onClientChange={handlers.setClientId}
                onParentMgmtCoChange={handlers.setParentMgmtCoId}
                onDateFromChange={handlers.setDateFrom}
                onDateToChange={handlers.setDateTo}
                onResetFilters={handlers.resetFilters}

                onAddNew={
                  user?.role === "GQM_MEMBER" && hasPermission("job:create")
                    ? () => router.push("/jobs/create")
                    : undefined
                }
                onExportClick={() => setIsExportOpen(true)}
              />

              {displayedJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-12">
                  <div className="text-center">
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      {loadError ? t("errorTitle") : t("emptyTitle")}
                    </h3>
                    <p className="mb-4 text-sm text-gray-500">
                      {loadError
                        ? t("errorDesc")
                        : totalJobs === 0
                          ? t("emptyDesc")
                          : t("emptyFiltersDesc")}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {loadError ? (
                        <>
                          <Button onClick={handleRetry} disabled={retrying} className="bg-gqm-green hover:bg-gqm-green-dark">
                            {retrying ? "Retrying..." : "Retry"}
                          </Button>
                          <Button variant="outline" onClick={() => window.location.reload()}>{t("reloadPage")}</Button>
                        </>
                      ) : (
                        user?.role === "GQM_MEMBER" && hasPermission("job:create") && totalJobs === 0 && (
                          <>
                            <Button onClick={() => router.push("/jobs/create")} className="bg-gqm-green hover:bg-gqm-green-dark">
                              {t("createFirstJob")}
                            </Button>
                            <Button onClick={handleRetry} disabled={retrying} className="bg-gqm-green hover:bg-gqm-green-dark">
                              {retrying ? "Retrying..." : "Retry"}
                            </Button>
                            <Button variant="outline" onClick={() => window.location.reload()}>{t("reloadPage")}</Button>
                          </>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <JobsTable
                    jobs={displayedJobs}
                    tableVariant={filters.tab}
                    onDelete={user?.role !== "LEAD_TECHNICIAN" ? handleDelete : undefined}
                    userRole={user?.role}
                  />

                  <div className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="text-center text-xs text-gray-500 sm:text-left sm:text-sm sm:text-gray-600">
                      <span className="sm:hidden">
                        {(filters.page - 1) * itemsPerPage + 1}–{Math.min(filters.page * itemsPerPage, totalJobs)} {t("paginationOf")} {totalJobs}
                      </span>
                      <span className="hidden sm:inline">
                        {t("paginationShowing")} {(filters.page - 1) * itemsPerPage + 1} {t("paginationTo")}{" "}
                        {Math.min(filters.page * itemsPerPage, totalJobs)} {t("paginationOf")} {totalJobs} {t("paginationJobs")}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 sm:justify-end">
                      <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={filters.page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">{tCommon("previous")}</span>
                      </Button>
                      <span className="text-sm">{t("paginationPage")} {filters.page} {t("paginationOf")} {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={handleNextPage} disabled={filters.page === totalPages}>
                        <span className="hidden sm:inline">{tCommon("next")}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      <DeleteJobDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, job: null, suggestedYear: null })}
        onConfirm={handleDeleteConfirm}
        jobId={deleteDialog.job?.ID_Jobs || ""}
        defaultSyncPodio={false}
        suggestedYear={deleteDialog.suggestedYear}
      />

      <ExportJobsDialog
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
        filters={filters}
      />
    </div>
  )
}