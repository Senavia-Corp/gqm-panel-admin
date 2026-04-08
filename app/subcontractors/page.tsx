"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { SubcontractorManagementTable } from "@/components/organisms/SubcontractorManagementTable"
import { DeleteSubcontractorDialog } from "@/components/organisms/DeleteSubcontractorDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Plus, Search, ChevronLeft, ChevronRight, Wrench,
  AlertCircle, RefreshCw, X, Loader2, Filter,
} from "lucide-react"
import type { Subcontractor } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

type ListResponse = {
  page: number
  limit: number
  total: number
  results: Subcontractor[]
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 350): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-12 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PER_PAGE = 10

export default function SubcontractorsPage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)

  const [rows, setRows]         = useState<Subcontractor[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState("")
  const [status, setStatus]     = useState("all")
  const dSearch                 = useDebounce(search, 350)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subcontractor | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  // ── Normalize org (Postgres array literal → plain string) ─────────────────
  const normalizeOrg = (org?: string | null) => {
    if (!org) return ""
    const s = org.trim()
    if (s.startsWith("{") && s.endsWith("}"))
      return s.slice(1, -1).replace(/^"+|"+$/g, "").replace(/\\"/g, '"').trim()
    return s.replace(/\\"/g, '"').trim()
  }

  const fetchPage = useCallback(async (p: number, q: string, st: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) })
      if (q)           params.set("q", q)
      if (st !== "all") params.set("status", st)

      const res = await apiFetch(`/api/subcontractors_table?${params}`, {
        cache: "no-store",
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as ListResponse
      setRows((data.results ?? []).map((s) => ({ ...s, Organization: normalizeOrg(s.Organization) })))
      setTotal(data.total ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? "Failed to load")
    } finally { setLoading(false) }
  }, [])

  // Refetch on page/search/status change
  useEffect(() => {
    if (!user) return
    fetchPage(page, dSearch, status)
  }, [page, dSearch, status, user, fetchPage])

  // Reset page on search/status change
  useEffect(() => { setPage(1) }, [dSearch, status])

  const handleDelete = (s: Subcontractor) => { setDeleteTarget(s); setDeleteOpen(true) }

  const confirmDelete = async (syncPodio: boolean) => {
    if (!deleteTarget?.ID_Subcontractor) return
    try {
      const res = await apiFetch(
        `/api/subcontractors/${deleteTarget.ID_Subcontractor}?sync_podio=${syncPodio}`,
        { method: "DELETE", cache: "no-store" }
      )
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setDeleteOpen(false); setDeleteTarget(null)
      fetchPage(page, dSearch, status)
    } catch (e) {
      console.error("Error deleting subcontractor:", e)
    }
  }

  const totalPages  = Math.max(1, Math.ceil(total / PER_PAGE))
  const showFrom    = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const showTo      = Math.min(page * PER_PAGE, total)
  const activeFilters = (search ? 1 : 0) + (status !== "all" ? 1 : 0)

  if (!user) return null

  if (!hasPermission("subcontractor:read")) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-500 max-w-md mb-8">
              You do not have the required permissions (`subcontractor:read`) to view this section. 
              Please contact your administrator if you believe this is an error.
            </p>
            <Button 
              onClick={() => router.push("/dashboard")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95"
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
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3 px-6 pt-5 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Subcontractors</h1>
                <p className="text-xs text-slate-500">Manage all subcontractors and their information</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">

            {/* ── Toolbar ── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-800">All Subcontractors</h2>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                    {total}
                  </span>
                  {activeFilters > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Filter className="h-2.5 w-2.5" /> {activeFilters} filter{activeFilters > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {hasPermission("subcontractor:create") && (
                  <Button
                    onClick={() => router.push("/subcontractors/create")}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Subcontractor
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                {/* Global search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Global search: name, organization, email, specialty, ID…"
                    className="pl-9 text-sm border-slate-200 focus:border-emerald-400"
                  />
                  {search && (
                    <button onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Status filter */}
                <Select value={status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger className="w-40 border-slate-200 text-sm focus:border-emerald-400">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Reset filters */}
                {activeFilters > 0 && (
                  <Button variant="outline" size="sm"
                    onClick={() => { setSearch(""); setStatus("all") }}
                    className="gap-1.5 text-xs border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600">
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
                <Button variant="outline" size="sm" onClick={() => fetchPage(page, dSearch, status)} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ) : (
              <SubcontractorManagementTable subcontractors={rows} onDelete={handleDelete} />
            )}

            {/* ── Pagination ── */}
            {!loading && !error && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-800">{showFrom}–{showTo}</span> of{" "}
                  <span className="font-semibold text-slate-800">{total}</span> subcontractors
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs border-slate-200"
                    disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </Button>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" className="gap-1 text-xs border-slate-200"
                    disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <DeleteSubcontractorDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        subcontractorId={deleteTarget?.ID_Subcontractor ?? ""}
        subcontractorName={deleteTarget?.Name ?? ""}
        onConfirm={confirmDelete}
        defaultSyncWithPodio={true}
      />
    </div>
  )
}