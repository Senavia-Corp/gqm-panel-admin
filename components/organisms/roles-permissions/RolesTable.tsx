"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, Eye, Trash2, X, AlertCircle, RefreshCcw, Users } from "lucide-react"
import type { Role, PaginatedResponse } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { apiFetch } from "@/lib/apiFetch"

const ITEMS_PER_PAGE = 10
const asString = (v: unknown) => (v == null ? "" : String(v))

function ActivePill({ active }: { active?: boolean | null }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  )
}

type RoleListResponse = PaginatedResponse<Role> | Role[]

export default function RolesTable() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRoles = async (nextPage: number) => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await apiFetch(`/api/roles?page=${nextPage}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch roles (${res.status})`)
      const data = (await res.json()) as RoleListResponse
      const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      const totalValue = Array.isArray(data) ? list.length : typeof (data as any).total === "number" ? (data as any).total : list.length
      setRoles(list)
      setTotal(totalValue)
      setPage(nextPage)
    } catch (e: any) {
      setRoles([])
      setTotal(0)
      setLoadError(e?.message ?? "Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  const deleteRole = async () => {
    if (!roleToDelete) return
    try {
      setDeleting(true)
      setLoadError(null)
      const permissions = Array.isArray(roleToDelete.permissions) ? roleToDelete.permissions : []
      for (const p of permissions) {
        await apiFetch("/api/permissions/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: p.ID_Permission, roleId: roleToDelete.ID_Role }),
          cache: "no-store",
        })
      }
      const res = await apiFetch(`/api/roles/${roleToDelete.ID_Role}`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to delete role (${res.status})`)
      setDeleteOpen(false)
      setRoleToDelete(null)
      await fetchRoles(page)
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to delete role")
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => { fetchRoles(1) }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return roles.filter((r) => {
      const matchesSearch = !q ||
        asString(r.ID_Role).toLowerCase().includes(q) ||
        asString(r.Name).toLowerCase().includes(q) ||
        asString(r.Description).toLowerCase().includes(q)
      const isActive = Boolean(r.Active)
      const matchesActive = activeFilter === "all" || (activeFilter === "active" ? isActive : !isActive)
      return matchesSearch && matchesActive
    })
  }, [roles, searchQuery, activeFilter])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const hasActiveFilters = searchQuery || activeFilter !== "all"

  return (
    <div>
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search roles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm border-slate-200 bg-slate-50 focus:bg-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
            <SelectTrigger className="w-32 text-sm border-slate-200 bg-slate-50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(""); setActiveFilter("all") }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">{total} total</span>
          <button
            onClick={() => fetchRoles(page)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── States ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <RefreshCcw className="h-4 w-4 animate-spin" /> Loading roles…
          </div>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
          <p className="text-sm font-semibold text-slate-700">Could not load roles</p>
          <p className="mt-1 text-xs text-red-500">{loadError}</p>
          <Button onClick={() => fetchRoles(page)} className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200">
          <Users className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm font-semibold text-slate-500">No roles found</p>
          {hasActiveFilters && <p className="mt-1 text-xs text-slate-400">Try adjusting your filters</p>}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">ID</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Permissions</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const permsCount = Array.isArray(r.permissions) ? r.permissions.length : 0
                  return (
                    <tr key={r.ID_Role} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-500">{r.ID_Role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-800">{asString(r.Name) || "—"}</div>
                        {r.Description && (
                          <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">{asString(r.Description)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3"><ActivePill active={r.Active} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-xs font-bold text-slate-600">
                          {permsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => router.push(`/roles-permissions/roles/${r.ID_Role}`)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-amber-900 hover:bg-amber-500 transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <AlertDialog
                            open={deleteOpen && roleToDelete?.ID_Role === r.ID_Role}
                            onOpenChange={(open) => { setDeleteOpen(open); if (!open) setRoleToDelete(null) }}
                          >
                            <AlertDialogTrigger asChild>
                              <button
                                onClick={() => { setRoleToDelete(r); setDeleteOpen(true) }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete role?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will unlink all permissions from the role first, then permanently delete it. Permissions will NOT be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => { e.preventDefault(); deleteRole() }}
                                  disabled={deleting}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {deleting ? "Deleting…" : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Page <span className="font-semibold text-slate-600">{page}</span> of{" "}
              <span className="font-semibold text-slate-600">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => fetchRoles(Math.max(1, page - 1))} disabled={page === 1} className="h-8 text-xs">
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchRoles(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-8 text-xs">
                Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}