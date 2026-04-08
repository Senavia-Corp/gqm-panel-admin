"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BadgeDollarSign, Search, ChevronLeft, ChevronRight,
  Eye, AlertCircle, RefreshCw, X, Calendar, User
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionRow = {
  ID_Commission: string
  Month: string | null
  Year: number | null
  Total_commission: number | null
  member: {
    ID_Member: string
    Member_Name: string | null
  }
}

type TableResponse = {
  page: number
  limit: number
  total: number
  results: CommissionRow[]
}

const LIMIT = 20

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return dv
}

function MonthBadge({ month }: { month: string | null }) {
  if (!month) return <span className="text-xs italic text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
      <Calendar className="h-2.5 w-2.5" />
      {month.charAt(0) + month.slice(1).toLowerCase()}
    </span>
  )
}

function TotalBadge({ total }: { total: number | null }) {
  if (total == null) return <span className="text-xs italic text-slate-400">—</span>
  return (
    <span className="font-mono text-sm font-bold text-emerald-700">
      ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td className="px-5 py-3.5"><div className="h-3 w-24 animate-pulse rounded bg-slate-200" /></td>
          <td className="px-5 py-3.5"><div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" /></td>
          <td className="px-5 py-3.5"><div className="h-3 w-12 animate-pulse rounded bg-slate-200" /></td>
          <td className="px-5 py-3.5"><div className="h-3 w-20 animate-pulse rounded bg-slate-200" /></td>
          <td className="px-5 py-3.5 text-right"><div className="ml-auto h-7 w-16 animate-pulse rounded-lg bg-slate-200" /></td>
        </tr>
      ))}
    </>
  )
}

function RepAvatar() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gqm-yellow/30 ring-1 ring-gqm-yellow/50">
      <User className="h-4 w-4 text-gqm-green-dark" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  const [rows, setRows] = useState<CommissionRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 350)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const fetchData = useCallback(async (p: number, q: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true); setError(null)
    try {
      const url = new URL("/api/commission", window.location.origin)
      url.searchParams.set("table", "true")
      url.searchParams.set("page", String(p))
      url.searchParams.set("limit", String(LIMIT))
      if (q) url.searchParams.set("q", q)
      const res = await apiFetch(url.toString(), { signal: ctrl.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: TableResponse = await res.json()
      
      setRows(data.results ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? "Failed to load commissions")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { setPage(1) }, [debouncedSearch])
  useEffect(() => { if (user) fetchData(page, debouncedSearch) }, [user, page, debouncedSearch, fetchData])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const rangeEnd = Math.min(page * LIMIT, total)

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                  <BadgeDollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-none">Commissions</h1>
                  <p className="mt-1 text-sm text-slate-500">View and manage member commission records</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-slate-800">All Commissions</h2>
                  {total > 0 && (
                    <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white">{total}</span>
                  )}
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Search by ID, month, year…" value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors" />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm text-red-700"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>
                  <Button variant="outline" size="sm" onClick={() => fetchData(page, debouncedSearch)} className="gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-100">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      {["Commission ID", "Member", "Month", "Year", "Total", "Actions"].map((label, i) => (
                        <th key={i} className={`px-5 py-3 text-left ${i === 5 ? "text-right" : ""}`}>
                          {label && <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? <SkeletonRows /> : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <BadgeDollarSign className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">{search ? `No commissions found for "${search}"` : "No commissions yet"}</p>
                            {search && <button onClick={() => setSearch("")} className="text-xs font-medium text-emerald-600 hover:underline">Clear search</button>}
                          </div>
                        </td>
                      </tr>
                    ) : rows.map((row) => (
                      <tr key={row.ID_Commission} className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-3.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">{row.ID_Commission}</span>
                        </td>
                        <td className="px-5 py-3.5 flex items-center gap-3"><RepAvatar />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{row.member.Member_Name ?? "-"}</span>
                            <span className="text-xs text-muted-foreground">{row.member.ID_Member ?? "-"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><MonthBadge month={row.Month} /></td>
                        <td className="px-5 py-3.5"><span className="text-sm font-medium text-slate-700">{row.Year ?? "—"}</span></td>
                        <td className="px-5 py-3.5"><TotalBadge total={row.Total_commission} /></td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => router.push(`/commissions/${row.ID_Commission}`)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white transition-colors hover:bg-amber-600" title="View">
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!loading && !error && total > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                  <p className="text-xs text-slate-500">
                    {rangeStart}–{rangeEnd} of <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> commissions
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs border-slate-200" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs border-slate-200" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}