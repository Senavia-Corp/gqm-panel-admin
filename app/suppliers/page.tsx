"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { apiFetch } from "@/lib/apiFetch"
import { DeleteSupplierDialog } from "@/components/organisms/DeleteSupplierDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import type { SupplierRow } from "@/lib/types"
import {
  Plus, Search, ChevronLeft, ChevronRight, Store,
  Eye, Trash2, CheckCircle2, XCircle, RefreshCw,
  AlertCircle, Filter, X,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function SuppliersTable({
  rows,
  onDelete,
}: {
  rows: SupplierRow[]
  onDelete: (row: SupplierRow) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white">
        <Store className="h-10 w-10 text-slate-200" />
        <p className="text-sm font-medium text-slate-400">No suppliers found</p>
        <p className="text-xs text-slate-300">Try adjusting your search</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              {[
                { label: "ID", w: "w-[100px]" },
                { label: "Company", w: "w-[200px]" },
                { label: "Specialty", w: "" },
                { label: "Coverage Area", w: "" },
                { label: "Status", w: "w-[110px]" },
                { label: "Email", w: "" },
                { label: "Phone", w: "w-[140px]" },
                { label: "Actions", w: "w-[80px] text-right" },
              ].map(({ label, w }) => (
                <th
                  key={label}
                  className={`px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 ${w}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr key={row.ID_Supplier} className="group transition-colors hover:bg-slate-50/70">

                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="font-mono text-xs text-slate-400">{row.ID_Supplier}</span>
                </td>

                <td className="px-5 py-3.5">
                  <p className="max-w-[200px] truncate text-sm font-semibold text-slate-800">
                    {row.Company_Name || <span className="text-slate-300">—</span>}
                  </p>
                </td>

                <td className="px-5 py-3.5 whitespace-nowrap">
                  {row.Speciality
                    ? <span className="inline-flex items-center rounded-lg bg-violet-50 border border-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{row.Speciality}</span>
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                </td>

                <td className="px-5 py-3.5 whitespace-nowrap">
                  {row.Coverage_Area
                    ? <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{row.Coverage_Area}</span>
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                </td>

                <td className="px-5 py-3.5 whitespace-nowrap">
                  {row.Acc_Status === "Active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  ) : row.Acc_Status === "Inactive" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                      <XCircle className="h-3 w-3" /> Inactive
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>

                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="text-xs text-slate-500">{row.Email_Address || <span className="text-slate-300">—</span>}</span>
                </td>

                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="text-xs text-slate-500">{row.Phone_Number || <span className="text-slate-300">—</span>}</span>
                </td>

                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/suppliers/${row.ID_Supplier}`}>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => onDelete(row)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:text-red-600"
                      title="Delete"
                    >
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
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PER_PAGE = 10

export default function SuppliersPage() {
  const router = useRouter()

  const [rows, setRows]       = useState<SupplierRow[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState("")
  const dSearch               = useDebounce(search, 350)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null)
  const [syncPodio, setSyncPodio]       = useState(true)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
  }, [router])

  const fetchPage = useCallback(async (p: number, q: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) })
      if (q) params.set("q", q)
      const res = await apiFetch(`/api/supplier?${params}`, {
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setPage(1) }, [dSearch])
  useEffect(() => { fetchPage(page, dSearch) }, [page, dSearch, fetchPage])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const showFrom   = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const showTo     = Math.min(page * PER_PAGE, total)
  const hasFilters = search.length > 0

  const handleDeleteClick = (row: SupplierRow) => {
    setDeleteTarget(row)
    setDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await apiFetch(
        `/api/supplier/${deleteTarget.ID_Supplier}?sync_podio=${syncPodio}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      toast({ title: "Deleted", description: `${deleteTarget.Company_Name ?? deleteTarget.ID_Supplier} removed.` })
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchPage(page, dSearch)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to delete.", variant: "destructive" })
    }
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-sm">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Suppliers</h1>
                <p className="text-xs text-slate-500">Material and construction supply companies</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">

            {/* ── Toolbar card ── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-800">All Suppliers</h2>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">
                    {total}
                  </span>
                  {hasFilters && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Filter className="h-2.5 w-2.5" /> 1 filter
                    </span>
                  )}
                </div>
                <Link href="/suppliers/create">
                  <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm">
                    <Plus className="h-4 w-4" /> New Supplier
                  </Button>
                </Link>
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by company, specialty, coverage area, email…"
                    className="pl-9 text-sm border-slate-200 focus:border-violet-400"
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
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPage(page, dSearch)}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ) : (
              <SuppliersTable rows={rows} onDelete={handleDeleteClick} />
            )}

            {/* ── Pagination ── */}
            {!loading && !error && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">{showFrom}–{showTo}</span>{" "}
                  of <span className="font-semibold text-slate-800">{total}</span> supplier{total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs border-slate-200"
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </Button>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs border-slate-200"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      <DeleteSupplierDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        supplierId={deleteTarget?.ID_Supplier ?? ""}
        companyName={deleteTarget?.Company_Name ?? ""}
        syncPodio={syncPodio}
        onSyncPodioChange={setSyncPodio}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
