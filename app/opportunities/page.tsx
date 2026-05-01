"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/apiFetch"
import { DeleteOpportunityDialog } from "@/components/organisms/DeleteOpportunityDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import type { OpportunityRow } from "@/lib/types"
import {
  Plus, Search, ChevronLeft, ChevronRight, Megaphone,
  AlertCircle, RefreshCw, X, ExternalLink, Calendar,
  CheckCircle2, XCircle, Filter, Eye, Trash2,
} from "lucide-react"
import Link from "next/link"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 350): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

function formatDate(val: string | null | undefined) {
  if (!val) return "—"
  const datePart = val.split("T")[0]
  if (!datePart) return "—"
  const [y, m, d] = datePart.split("-").map(Number)
  if (!y || !m || !d) return "—"
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d))
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 border-slate-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-slate-300 text-xs">—</span>
  const cls = PRIORITY_COLORS[priority] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {priority}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-10 border-b border-slate-100 bg-slate-50/80" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-5 py-3.5">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-12 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function OpportunitiesTable({
  rows,
  onDelete,
}: {
  rows: OpportunityRow[]
  onDelete: (row: OpportunityRow) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col h-48 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white">
        <Megaphone className="h-8 w-8 text-slate-200" />
        <p className="text-sm text-slate-400">No opportunities found</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* ── Mobile cards ── */}
      <div className="divide-y divide-slate-100 sm:hidden">
        {rows.map((row) => (
          <div key={row.ID_Opportunities} className="p-4 transition-colors hover:bg-slate-50/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[11px] text-slate-400">{row.ID_Opportunities}</span>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{row.Project_name || "—"}</p>
                {row.job?.ID_Jobs && (
                  <Link href={`/jobs/${row.job.ID_Jobs}`}
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline">
                    {row.job.ID_Jobs}<ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <PriorityBadge priority={row.Priority} />
                  {row.State === true ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  ) : row.State === false ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      <XCircle className="h-3 w-3" /> Inactive
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-300" />{formatDate(row.Start_Date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="rounded-full bg-violet-100 px-1.5 text-[11px] font-bold text-violet-700">{row.skills?.length ?? 0}</span>
                    skills
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="rounded-full bg-blue-100 px-1.5 text-[11px] font-bold text-blue-700">{row.subcontractors?.length ?? 0}</span>
                    applicants
                  </span>
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <Link href={`/opportunities/${row.ID_Opportunities}`}>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-colors" title="View">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <button onClick={() => onDelete(row)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600 transition-colors" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                {["ID", "Project", "Job", "Priority", "State", "Start Date", "Skills", "Applicants", ""].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 ${h === "" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <tr key={row.ID_Opportunities} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-400">{row.ID_Opportunities}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">{row.Project_name || "—"}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.job?.ID_Jobs ? (
                      <Link href={`/jobs/${row.job.ID_Jobs}`} className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline">
                        {row.job.ID_Jobs}<ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PriorityBadge priority={row.Priority} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.State === true ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : row.State === false ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        <XCircle className="h-3 w-3" /> Inactive
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3 text-slate-300" />{formatDate(row.Start_Date)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-100 px-1.5 text-[11px] font-bold text-violet-700">
                      {row.skills?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[11px] font-bold text-blue-700">
                      {row.subcontractors?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/opportunities/${row.ID_Opportunities}`}>
                        <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-colors" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button onClick={() => onDelete(row)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PER_PAGE = 10

export default function OpportunitiesPage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)

  const [rows, setRows]       = useState<OpportunityRow[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState("")
  const dSearch               = useDebounce(search, 350)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OpportunityRow | null>(null)

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
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) })
      if (q) params.set("q", q)
      const res = await apiFetch(`/api/opportunities?${params}`, {
        cache: "no-store",
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setRows(data.results ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? "Failed to load")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (user) fetchPage(page, dSearch) }, [page, dSearch, user, fetchPage])
  useEffect(() => { setPage(1) }, [dSearch])

  const confirmDelete = async () => {
    if (!deleteTarget?.ID_Opportunities) return
    try {
      const res = await apiFetch(`/api/opportunities/${deleteTarget.ID_Opportunities}`, {
        method: "DELETE", cache: "no-store",
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      toast({ title: "Deleted", description: "Opportunity removed successfully." })
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

  if (!hasPermission("subcontractor:read")) {
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
            <p className="text-slate-500 max-w-md mb-8">You don't have permission to view Opportunities.</p>
            <Button onClick={() => router.push("/dashboard")} className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold">
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

          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-sm sm:h-10 sm:w-10">
                <Megaphone className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Opportunities</h1>
                <p className="hidden text-xs text-slate-500 sm:block">Job postings for subcontractors to apply</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">

            {/* Toolbar */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h2 className="truncate text-base font-bold text-slate-800">All Opportunities</h2>
                  <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">
                    {total}
                  </span>
                  {activeFilters > 0 && (
                    <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:flex">
                      <Filter className="h-2.5 w-2.5" /> {activeFilters} filter
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => router.push("/opportunities/create")}
                  className="ml-3 flex-shrink-0 gap-1.5 bg-violet-600 hover:bg-violet-700 text-sm text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span className="sm:hidden">New</span>
                  <span className="hidden sm:inline">New Opportunity</span>
                </Button>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by project name, description, ID…"
                    className="pl-9 text-sm border-slate-200 focus:border-violet-400"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {activeFilters > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setSearch("")} className="gap-1.5 text-xs border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600">
                    <X className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Content */}
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
              <OpportunitiesTable rows={rows} onDelete={(row) => { setDeleteTarget(row); setDeleteOpen(true) }} />
            )}

            {/* Pagination */}
            {!loading && !error && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
                <p className="text-xs text-slate-500 sm:text-sm">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">{showFrom}–{showTo}</span>{" "}
                  of <span className="font-semibold text-slate-800">{total}</span> opportunities
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

      <DeleteOpportunityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        opportunityId={deleteTarget?.ID_Opportunities ?? ""}
        projectName={deleteTarget?.Project_name ?? ""}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
