"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Search, ChevronLeft, ChevronRight,
  AlertCircle, RefreshCw, X, Eye, Trash2, MapPin, Mail, Phone, Users
} from "lucide-react"
import { DeleteTechnicianDialog } from "@/components/organisms/DeleteTechnicianDialog"
import { toast } from "@/components/ui/use-toast"
import type { Technician } from "@/lib/types"

type ListResponse = {
  page: number
  limit: number
  total: number
  results: Technician[]
}

function useDebounce<T>(value: T, ms = 350): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

function TableSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-10 border-b border-slate-100 bg-slate-50/80" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-5 py-3.5">
          {Array.from({ length: cols }).map((_, j) => (
             <div key={j} className={`h-4 animate-pulse rounded bg-slate-100 ${j === 0 ? "w-20" : j === 1 ? "w-36" : "w-24"}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

const PER_PAGE = 10

export function TechniciansTab({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const t = useTranslations("subcontractors")
  const router = useRouter()

  const [rows, setRows]         = useState<Technician[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState("")
  const dSearch                 = useDebounce(search, 350)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; technician: Technician | null }>({ open: false, technician: null })

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(async (p: number, q: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) })
      if (q) params.set("q", q)

      const res = await apiFetch(`/api/technician?${params}`, {
        cache: "no-store",
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as ListResponse
      setRows(data.results ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? t("errorLoad"))
    } finally { setLoading(false) }
  }, [t])

  useEffect(() => {
    fetchPage(page, dSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, dSearch])

  useEffect(() => { setPage(1) }, [dSearch])

  const confirmDelete = async () => {
    if (!deleteDialog.technician) return
    const id = deleteDialog.technician.ID_Technician
    try {
      const res = await apiFetch(`/api/technician/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP Error ${res.status}`)
      }
      toast({ title: "Deleted", description: `Technician ${id} has been removed.` })
      fetchPage(page, dSearch)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setDeleteDialog({ open: false, technician: null })
    }
  }

  const totalPages  = Math.max(1, Math.ceil(total / PER_PAGE))
  const showFrom    = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const showTo      = Math.min(page * PER_PAGE, total)

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technicians by name, ID, email..."
            className="pl-9 text-sm border-slate-200 focus:border-emerald-400" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {hasPermission("technician:create") && (
          <Button onClick={() => router.push("/technicians/create")}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:w-auto sm:flex-shrink-0">
            <Plus className="h-4 w-4" /> New Technician
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchPage(page, dSearch)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Subcontractor</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((tech) => (
                <tr key={tech.ID_Technician} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {tech.ID_Technician}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-slate-800">{tech.Name}</p>
                    {tech.Location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {tech.Location}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={
                      (tech.Type_of_technician || tech.Type) === "Leader"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }>
                      {tech.Type_of_technician || tech.Type || "Worker"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                       <span className="text-xs flex items-center gap-1 text-slate-600">
                          <Mail className="h-3 w-3" /> {tech.Email_Address || tech.Email || "-"}
                       </span>
                       <span className="text-xs flex items-center gap-1 text-slate-600">
                          <Phone className="h-3 w-3" /> {tech.Phone_Number || tech.Phone_number || "-"}
                       </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {tech.subcontractor ? (
                      <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-[150px] block" title={tech.subcontractor.Name}>
                           {tech.subcontractor.Name}
                        </span>
                      </p>
                    ) : (
                      <span className="text-xs italic text-slate-400">Independent</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Button variant="ghost" size="sm" 
                          onClick={() => router.push(`/technicians/${tech.ID_Technician}`)}
                          className="h-8 gap-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                          <Eye className="h-3.5 w-3.5" /> View
                       </Button>
                       {hasPermission("technician:delete") && (
                          <Button variant="ghost" size="sm"
                             onClick={() => setDeleteDialog({ open: true, technician: tech })}
                             className="h-8 gap-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                             <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    No technicians found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{showFrom}–{showTo}</span> of{" "}
            <span className="font-semibold text-slate-800">{total}</span> records
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs border-slate-200"
              disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
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

      <DeleteTechnicianDialog
        open={deleteDialog.open}
        onOpenChange={(o) => !o && setDeleteDialog({ open: false, technician: null })}
        technicianName={deleteDialog.technician?.Name || ""}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
