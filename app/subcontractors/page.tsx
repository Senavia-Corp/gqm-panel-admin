"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { SubcontractorManagementTable } from "@/components/organisms/SubcontractorManagementTable"
import { DeleteSubcontractorDialog } from "@/components/organisms/DeleteSubcontractorDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react"
import type { Subcontractor } from "@/lib/types"

type SubcontractorsListResponse = {
  limit?: number
  page?: number
  total?: number
  results?: Subcontractor[]
}

const asString = (v: unknown) => (v == null ? "" : String(v))

const normalizeOrg = (org?: string | null) => {
  if (!org) return ""
  const s = org.trim()
  if (!s) return ""
  if (s.startsWith("{") && s.endsWith("}")) {
    const inner = s.slice(1, -1).trim()
    return inner.replace(/^"+|"+$/g, "").replace(/\\"/g, '"').trim()
  }
  return s.replace(/\\"/g, '"').trim()
}

const normalizeSubcontractor = (s: Subcontractor): Subcontractor => ({
  ...s,
  Organization: normalizeOrg(s.Organization),
})

export default function SubcontractorsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [total, setTotal] = useState(0)
  const itemsPerPage = 10

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subcontractorToDelete, setSubcontractorToDelete] = useState<Subcontractor | null>(null)

  // ONLY keep Status filter (other filters removed as requested)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  const fetchSubcontractors = async (page: number, status: string) => {
    try {
      setLoading(true)
      setLoadError(null)

      // Call new lightweight endpoint via our Next proxy
      const params = new URLSearchParams({ page: String(page), limit: String(itemsPerPage) })
      if (status && status !== "all") params.set("status", status)

      const response = await fetch(`/api/subcontractors_table?${params.toString()}`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Failed to fetch subcontractors (${response.status})`)
      }

      const data = (await response.json()) as SubcontractorsListResponse
      const results = Array.isArray(data?.results) ? data.results : []

      const normalizedResults = results.map(normalizeSubcontractor)

      setSubcontractors(normalizedResults)
      setFilteredSubcontractors(normalizedResults)
      setTotal(Number(data?.total ?? normalizedResults.length))
      setCurrentPage(Number(data?.page ?? page))
    } catch (error: any) {
      console.error("Error fetching subcontractors:", error)
      setSubcontractors([])
      setFilteredSubcontractors([])
      setTotal(0)
      setLoadError(error?.message ?? "Failed to load subcontractors")
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch when user, page or status changes
  useEffect(() => {
    if (!user) return
    fetchSubcontractors(currentPage, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage, statusFilter])

  const normalizedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery])

  useEffect(() => {
    let filtered = [...subcontractors]

    if (normalizedSearch) {
      filtered = filtered.filter((sub) => {
        const name = asString(sub.Name).toLowerCase()
        const org = asString(sub.Organization).toLowerCase()
        const id = asString(sub.ID_Subcontractor).toLowerCase()
        const email = asString(sub.Email_Address).toLowerCase()
        const specialty = asString(sub.Specialty).toLowerCase()

        return (
          name.includes(normalizedSearch) ||
          org.includes(normalizedSearch) ||
          id.includes(normalizedSearch) ||
          email.includes(normalizedSearch) ||
          specialty.includes(normalizedSearch)
        )
      })
    }

    // Keep status filter client-side too (already applied server-side when changed)
    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => asString(sub.Status) === statusFilter)
    }

    setFilteredSubcontractors(filtered)
  }, [normalizedSearch, statusFilter, subcontractors])

  const handleDelete = (subcontractor: Subcontractor) => {
    setSubcontractorToDelete(subcontractor)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async (syncWithPodio: boolean) => {
    if (!subcontractorToDelete?.ID_Subcontractor) return

    try {
      const response = await fetch(
        `/api/subcontractors/${subcontractorToDelete.ID_Subcontractor}?sync_podio=${syncWithPodio ? "true" : "false"}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete subcontractor (${response.status})`)
      }

      fetchSubcontractors(currentPage, statusFilter)
      setDeleteDialogOpen(false)
      setSubcontractorToDelete(null)
    } catch (error) {
      console.error("Error deleting subcontractor:", error)
    }
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))

  const startIndex = (currentPage - 1) * itemsPerPage
  const showingFrom = total ? startIndex + 1 : 0
  const showingTo = total ? Math.min(startIndex + itemsPerPage, total) : 0

  const handlePreviousPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1))
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="mb-6 text-3xl font-bold">Subcontractors</h1>

          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">All Subcontractors</h2>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-semibold text-white">
                    {filteredSubcontractors.length}
                  </span>

                  <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Filter className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-64">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Filters</h3>
                          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                            <X className="mr-1 h-4 w-4" />
                            Reset
                          </Button>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">Status</label>
                          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <Button onClick={() => router.push("/subcontractors/create")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Subcontractor
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search subcontractors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border bg-white">
                <p className="text-gray-500">Loading subcontractors...</p>
              </div>
            ) : loadError ? (
              <div className="rounded-lg border bg-white p-6">
                <p className="text-sm text-red-600">{loadError}</p>
                <div className="mt-4">
                  <Button onClick={() => fetchSubcontractors(currentPage, statusFilter)}>Retry</Button>
                </div>
              </div>
            ) : (
              <SubcontractorManagementTable subcontractors={filteredSubcontractors} onDelete={handleDelete} />
            )}

            <div className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div className="text-sm text-gray-600">
                Showing {showingFrom} to {showingTo} of {total} subcontractors
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <DeleteSubcontractorDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        subcontractorId={subcontractorToDelete?.ID_Subcontractor || ""}
        subcontractorName={subcontractorToDelete?.Name || ""}
        onConfirm={confirmDelete}
        defaultSyncWithPodio={true}
      />
    </div>
  )
}
