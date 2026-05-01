"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { BuildingDeptTable } from "@/components/organisms/BuildingDeptTable"
import { DeleteBldgDeptDialog } from "@/components/organisms/DeleteBldgDeptDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus, Search, ChevronLeft, ChevronRight, Landmark,
  AlertCircle, RefreshCw, X, Filter,
} from "lucide-react"
import type { BuildingDeptRow } from "@/lib/types"
import { toast } from "@/components/ui/use-toast"

// ─── Types ─────────────────────────────────────────────────────────────────────

type ListResponse = {
  page: number
  limit: number
  total: number
  results: BuildingDeptRow[]
}

// ─── Debounce ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 350): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-10 border-b border-slate-100 bg-slate-50/80" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-5 py-3.5">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PER_PAGE = 10

export default function BuildingDepartmentsPage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)

  const [rows, setRows]       = useState<BuildingDeptRow[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState("")
  const dSearch               = useDebounce(search, 350)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BuildingDeptRow | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const fetchPage = useCallback(async (p: number, q: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ mode: "table", page: String(p), limit: String(PER_PAGE) })
      if (q) params.set("q", q)
      const res = await apiFetch(`/api/bldg_dept?${params}`, {
        cache: "no-store",
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as ListResponse
      setRows(data.results ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? "Failed to load")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (user) fetchPage(page, dSearch) }, [page, dSearch, user, fetchPage])
  useEffect(() => { setPage(1) }, [dSearch])

  const handleDelete = (row: BuildingDeptRow) => { setDeleteTarget(row); setDeleteOpen(true) }

  const confirmDelete = async (syncPodio: boolean) => {
    if (!deleteTarget?.ID_BldgDept) return
    try {
      const res = await apiFetch(
        `/api/bldg_dept/${deleteTarget.ID_BldgDept}?sync_podio=${syncPodio}`,
        { method: "DELETE", cache: "no-store" }
      )
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      toast({ title: "Deleted", description: "Building department removed." })
      setDeleteOpen(false); setDeleteTarget(null)
      fetchPage(page, dSearch)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to delete", variant: "destructive" })
    }
  }

  const totalPages  = Math.max(1, Math.ceil(total / PER_PAGE))
  const showFrom    = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const showTo      = Math.min(page * PER_PAGE, total)
  const activeFilters = search ? 1 : 0

  if (!user) return null

  if (!hasPermission("bldg_dept:read")) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-500 max-w-md mb-8">
              You do not have the required permissions to view Building Departments.
              Please contact your administrator.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold"
            >
              Return to Dashboard
            </Button>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm sm:h-10 sm:w-10">
                <Landmark className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Building Departments</h1>
                <p className="hidden text-xs text-slate-500 sm:block">Permitting offices and regulatory entities across the US</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">

            {/* ── Toolbar ── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h2 className="truncate text-base font-bold text-slate-800">All Building Departments</h2>
                  <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                    {total}
                  </span>
                  {activeFilters > 0 && (
                    <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:flex">
                      <Filter className="h-2.5 w-2.5" /> {activeFilters} filter
                    </span>
                  )}
                </div>
                {hasPermission("bldg_dept:create") && (
                  <Button
                    onClick={() => router.push("/building-departments/create")}
                    className="ml-3 flex-shrink-0 gap-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">Add Department</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by city, location, ID…"
                    className="pl-9 text-sm border-slate-200 focus:border-blue-400"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {activeFilters > 0 && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setSearch("")}
                    className="gap-1.5 text-xs border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-sm font-medium text-red-600">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchPage(page, dSearch)} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ) : (
              <BuildingDeptTable rows={rows} onDelete={handleDelete} />
            )}

            {/* ── Pagination ── */}
            {!loading && !error && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
                <p className="text-xs text-slate-500 sm:text-sm">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">{showFrom}–{showTo}</span>{" "}
                  of <span className="font-semibold text-slate-800">{total}</span> departments
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs border-slate-200"
                    disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" /><span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" className="gap-1 text-xs border-slate-200"
                    disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                    <span className="hidden sm:inline">Next</span><ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      <DeleteBldgDeptDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        bldgDeptId={deleteTarget?.ID_BldgDept ?? ""}
        cityName={deleteTarget?.City_BldgDept ?? ""}
        onConfirm={confirmDelete}
        defaultSyncWithPodio={true}
      />
    </div>
  )
}
