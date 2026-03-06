"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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

type JobsTab    = "ALL" | JobType
type YearFilter = "ALL" | "2026" | "2025" | "2024" | "2023"

const TAB_TITLE: Record<JobsTab, string> = {
  ALL: "All Jobs",
  QID: "All QIDs",
  PTL: "All PTLs",
  PAR: "All PARs",
}

const YEAR_OPTIONS: { value: YearFilter; label: string }[] = [
  { value: "ALL",  label: "All years" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
]

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
  const router    = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)

  // ── Filters ───────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState<JobsTab>("ALL")
  const [selectedYear, setSelectedYear] = useState<YearFilter>("ALL")
  // searchQuery  = what the user is typing (controls the input only)
  // appliedSearch = the value actually sent to the backend
  const [searchQuery,   setSearchQuery]   = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const [totalJobs,   setTotalJobs]   = useState(0)
  const [totalPages,  setTotalPages]  = useState(0)
  const itemsPerPage = 10

  // ── Data ──────────────────────────────────────────────────────────────────
  const [jobs,         setJobs]         = useState<JobDTO[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobDTO[]>([])

  const [technicianAllJobs,      setTechnicianAllJobs]      = useState<JobDTO[]>([])
  const [technicianFilteredJobs, setTechnicianFilteredJobs] = useState<JobDTO[]>([])

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retrying,  setRetrying]  = useState(false)

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
  // All params are passed explicitly so the function always uses fresh values,
  // no stale closure or stale ref issues.
  async function loadJobs(params: {
    tab:    JobsTab
    year:   YearFilter
    search: string
    page:   number
  }) {
    setIsLoading(true)
    setLoadError(null)

    const filters: Record<string, string> = {}
    if (params.tab !== "ALL")    filters.type   = params.tab
    if (params.year !== "ALL")   filters.year   = params.year
    if (params.search.trim())    filters.search = params.search.trim()

    try {
      if (isTechnician) {
        const techRes = await fetch(`/api/technician/${user.id}`, { cache: "no-store" })
        if (!techRes.ok) throw new Error("Failed to fetch technician data")
        const techData    = await techRes.json()
        const assignedIds: string[] = techData?.subcontractor?.jobs?.map((j: any) => j.ID_Jobs) ?? []

        const { jobs: allJobs } = await fetchJobs(1, 10_000, filters)
        const sorted = sortArchivedLast(allJobs.filter((j) => assignedIds.includes(j.ID_Jobs)))

        setTechnicianAllJobs(sorted)
        setTechnicianFilteredJobs(sorted)
        setTotalJobs(sorted.length)
        setTotalPages(Math.max(1, Math.ceil(sorted.length / itemsPerPage)))
        return
      }

      const { jobs: jobsData, total } = await fetchJobs(params.page, itemsPerPage, filters)
      const sorted = sortArchivedLast(jobsData)

      setJobs(sorted)
      setFilteredJobs(sorted)
      setTotalJobs(total)
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)))
    } catch (err) {
      console.error("[jobs] Error loading jobs:", err)
      setLoadError(err instanceof Error ? err.message : "Unknown error")
      toast({ title: "Error", description: "Failed to load jobs. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Reactive fetch — runs when pagination / tab / year / appliedSearch change.
  // appliedSearch only changes when the user explicitly submits the search,
  // so typing alone never triggers this effect.
  useEffect(() => {
    if (!user) return
    loadJobs({ tab: activeTab, year: selectedYear, search: appliedSearch, page: currentPage })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage, activeTab, selectedYear, appliedSearch])

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearchSubmit = () => {
    // Committing appliedSearch triggers the useEffect above with the fresh value.
    setCurrentPage(1)
    setAppliedSearch(searchQuery)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()   // avoids any native form / page reload
      handleSearchSubmit()
    }
  }

  // ── Other filter handlers ─────────────────────────────────────────────────
  const handleTabChange = (tab: JobsTab) => {
    setActiveTab(tab)
    setCurrentPage(1)
    if (isTechnician) {
      setTechnicianFilteredJobs(technicianAllJobs)
      setTotalJobs(technicianAllJobs.length)
      setTotalPages(Math.max(1, Math.ceil(technicianAllJobs.length / itemsPerPage)))
    }
  }

  const handleFilterStatus = (status: JobStatus | "all") => {
    const base     = isTechnician ? technicianAllJobs : jobs
    const filtered = status === "all" ? base : base.filter((j) => j.Job_status === status)
    const sorted   = sortArchivedLast(filtered)
    setCurrentPage(1)
    if (isTechnician) {
      setTechnicianFilteredJobs(sorted)
      setTotalJobs(sorted.length)
      setTotalPages(Math.max(1, Math.ceil(sorted.length / itemsPerPage)))
    } else {
      setFilteredJobs(sorted)
    }
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setAppliedSearch("")   // triggers useEffect → clean fetch
    setCurrentPage(1)
    if (isTechnician) {
      setTechnicianFilteredJobs(technicianAllJobs)
      setTotalJobs(technicianAllJobs.length)
      setTotalPages(Math.max(1, Math.ceil(technicianAllJobs.length / itemsPerPage)))
    } else {
      setFilteredJobs(jobs)
    }
  }

  const handleRetry = async () => {
    try {
      setRetrying(true)
      await loadJobs({ tab: activeTab, year: selectedYear, search: appliedSearch, page: currentPage })
    } finally {
      setRetrying(false)
    }
  }

  const handleDelete = (job: JobDTO) =>
    setDeleteDialog({ open: true, job, suggestedYear: extractPodioYearFromJob(job) })

  const handleDeleteConfirm = async (opts: { syncPodio: boolean; year?: number }) => {
    const job = deleteDialog.job
    if (!job?.ID_Jobs) {
      toast({ title: "Error", description: "Missing job ID.", variant: "destructive" })
      return
    }
    try {
      await deleteJob(job.ID_Jobs, { sync_podio: opts.syncPodio, year: opts.year })
      toast({ title: "Success", description: `Job ${job.ID_Jobs} has been permanently deleted.` })
      await loadJobs({ tab: activeTab, year: selectedYear, search: appliedSearch, page: currentPage })
    } catch (err) {
      console.error("[jobs] Error deleting job:", err)
      toast({ title: "Error", description: "Failed to delete job. Please try again.", variant: "destructive" })
    }
  }

  const handlePreviousPage = () => currentPage > 1          && setCurrentPage((p) => p - 1)
  const handleNextPage     = () => currentPage < totalPages && setCurrentPage((p) => p + 1)

  const technicianPageSlice = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return technicianFilteredJobs.slice(start, start + itemsPerPage)
  }, [technicianFilteredJobs, currentPage])

  const displayedJobs = isTechnician ? technicianPageSlice : filteredJobs
  const yearSuffix    = selectedYear === "ALL" ? "" : ` ${selectedYear}`
  const headerTitle   = `${TAB_TITLE[activeTab]}${yearSuffix}`

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Tabs */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Jobs</h1>

            <div className="flex flex-1 justify-center">
              <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as JobsTab)}>
                <TabsList className="h-10 rounded-xl border bg-white p-1 shadow-sm">
                  {(["ALL", "QID", "PTL", "PAR"] as JobsTab[]).map((tab) => {
                    const Icon = { ALL: Layers, QID: ClipboardList, PTL: Wrench, PAR: Briefcase }[tab]
                    return (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="h-8 min-w-[90px] rounded-lg px-6 text-sm font-semibold data-[state=active]:bg-gqm-green-dark data-[state=active]:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {tab === "ALL" ? "All" : tab}
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            </div>

            <div className="w-[140px]" />
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-lg text-gray-500">Loading jobs...</div>
            </div>
          ) : (
            <div className="space-y-4">
              <JobFilters
                title={headerTitle}
                count={totalJobs}
                year={selectedYear}
                yearOptions={YEAR_OPTIONS}
                onYearChange={(y) => { setSelectedYear(y as YearFilter); setCurrentPage(1) }}
                onAddNew={user?.role === "GQM_MEMBER" ? () => router.push("/jobs/create") : undefined}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={handleSearchSubmit}
                onSearchKeyDown={handleSearchKeyDown}
                onFilterType={undefined}
                onFilterStatus={handleFilterStatus}
                onResetFilters={handleResetFilters}
              />

              {displayedJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-12">
                  <div className="text-center">
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      {loadError ? "Couldn't load jobs" : "No jobs available"}
                    </h3>
                    <p className="mb-4 text-sm text-gray-500">
                      {loadError
                        ? "There was a problem fetching jobs from the server. Please retry."
                        : totalJobs === 0
                          ? "There are no jobs in the database yet."
                          : "No jobs match your current filters."}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {loadError ? (
                        <>
                          <Button onClick={handleRetry} disabled={retrying} className="bg-gqm-green hover:bg-gqm-green-dark">
                            {retrying ? "Retrying..." : "Retry"}
                          </Button>
                          <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
                        </>
                      ) : (
                        user?.role === "GQM_MEMBER" && totalJobs === 0 && (
                          <>
                            <Button onClick={() => router.push("/jobs/create")} className="bg-gqm-green hover:bg-gqm-green-dark">
                              Create Your First Job
                            </Button>
                            <Button onClick={handleRetry} disabled={retrying} className="bg-gqm-green hover:bg-gqm-green-dark">
                              {retrying ? "Retrying..." : "Retry"}
                            </Button>
                            <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
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
                    tableVariant={activeTab}
                    onDelete={user?.role !== "LEAD_TECHNICIAN" ? handleDelete : undefined}
                    userRole={user?.role}
                  />

                  <div className="flex items-center justify-between rounded-lg border bg-white p-4">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, totalJobs)} of {totalJobs} jobs
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                      <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                        Next <ChevronRight className="h-4 w-4" />
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
    </div>
  )
}