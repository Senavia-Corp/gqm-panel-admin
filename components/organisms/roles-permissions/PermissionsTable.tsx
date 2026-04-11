"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, Eye, Trash2, X, AlertCircle, RefreshCcw, ShieldOff } from "lucide-react"
import type { Permission, PaginatedResponse, IAMDocument, IAMStatement } from "@/lib/types"
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

function PolicySummary({ document }: { document?: IAMDocument }) {
  if (!document || !document.Statement || document.Statement.length === 0) return <span className="text-slate-400">—</span>

  const allActions = document.Statement.flatMap(s => s.Action)
  if (allActions.includes("*")) {
    return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">Full Administrative Access (*)</span>
  }

  const modules = Array.from(new Set(allActions.map(a => a.split(":")[0]).filter(Boolean)))
  
  return (
    <div className="flex flex-wrap gap-1">
      {modules.map(m => {
        const isFullModule = allActions.includes(`${m}:*`)
        return (
          <span key={m} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold lowercase ${
            isFullModule ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"
          }`}>
            {m}{isFullModule ? ":*" : ""}
          </span>
        )
      })}
    </div>
  )
}

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

type PermissionListResponse = PaginatedResponse<Permission> | Permission[]

export default function PermissionsTable() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPermissions = async (nextPage: number) => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await apiFetch(`/api/permissions?page=${nextPage}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch permissions (${res.status})`)
      const data = (await res.json()) as PermissionListResponse
      const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      const totalValue = Array.isArray(data) ? list.length : typeof (data as any).total === "number" ? (data as any).total : list.length
      setPermissions(list)
      setTotal(totalValue)
      setPage(nextPage)
    } catch (e: any) {
      setPermissions([])
      setTotal(0)
      setLoadError(e?.message ?? "Failed to load permissions")
    } finally {
      setLoading(false)
    }
  }

  const deletePermission = async () => {
    if (!permissionToDelete) return
    try {
      setDeleting(true)
      setLoadError(null)
      const roles = Array.isArray(permissionToDelete.roles) ? permissionToDelete.roles : []
      for (const r of roles) {
        await apiFetch("/api/permissions/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: permissionToDelete.ID_Permission, roleId: r.ID_Role }),
          cache: "no-store",
        })
      }
      const res = await apiFetch(`/api/permissions/${permissionToDelete.ID_Permission}`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to delete permission (${res.status})`)
      setDeleteOpen(false)
      setPermissionToDelete(null)
      await fetchPermissions(page)
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to delete permission")
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => { fetchPermissions(1) }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return permissions.filter((p) => {
      const matchesSearch = !q ||
        asString(p.ID_Permission).toLowerCase().includes(q) ||
        asString(p.Name).toLowerCase().includes(q) ||
        asString(p.Description).toLowerCase().includes(q)
      
      const pModules = p.Document?.Statement?.flatMap(s => s.Action).map(a => a.split(":")[0]) ?? []
      const matchesModule = moduleFilter === "all" || pModules.includes(moduleFilter) || (moduleFilter === "admin" && pModules.includes("*"))

      const isActive = Boolean(p.Active)
      const matchesActive = activeFilter === "all" || (activeFilter === "active" ? isActive : !isActive)
      return matchesSearch && matchesModule && matchesActive
    })
  }, [permissions, searchQuery, moduleFilter, activeFilter])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const hasActiveFilters = searchQuery || moduleFilter !== "all" || activeFilter !== "all"

  return (
    <div>
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search permissions…"
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

          <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v)}>
            <SelectTrigger className="w-44 text-sm border-slate-200 bg-slate-50">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="admin">Full Admin</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="member">Members</SelectItem>
              <SelectItem value="subcontractor">Subcontractors</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
              <SelectItem value="parent_mgmt_co">PMC</SelectItem>
            </SelectContent>
          </Select>

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
              onClick={() => { setSearchQuery(""); setModuleFilter("all"); setActiveFilter("all") }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">{total} total</span>
          <button
            onClick={() => fetchPermissions(page)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── States ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <RefreshCcw className="h-4 w-4 animate-spin" /> Loading permissions…
          </div>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
          <p className="text-sm font-semibold text-slate-700">Could not load permissions</p>
          <p className="mt-1 text-xs text-red-500">{loadError}</p>
          <Button onClick={() => fetchPermissions(page)} className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200">
          <ShieldOff className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm font-semibold text-slate-500">No permissions found</p>
          {hasActiveFilters && <p className="mt-1 text-xs text-slate-400">Try adjusting your filters</p>}
        </div>
      ) : (
        <>
          {/* ── Table ─────────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">ID</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name / Description</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Policy Summary</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Linked Roles</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const rolesCount = Array.isArray(p.roles) ? p.roles.length : 0
                  return (
                    <tr key={p.ID_Permission} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-500">{p.ID_Permission}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-800">{asString(p.Name) || "—"}</div>
                        {p.Description && (
                          <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">{asString(p.Description)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3"><PolicySummary document={p.Document} /></td>
                      <td className="px-4 py-3"><ActivePill active={p.Active} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {rolesCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => router.push(`/roles-permissions/permissions/${p.ID_Permission}`)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-amber-900 hover:bg-amber-500 transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <AlertDialog
                            open={deleteOpen && permissionToDelete?.ID_Permission === p.ID_Permission}
                            onOpenChange={(open) => { setDeleteOpen(open); if (!open) setPermissionToDelete(null) }}
                          >
                            <AlertDialogTrigger asChild>
                              <button
                                onClick={() => { setPermissionToDelete(p); setDeleteOpen(true) }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete permission?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will unlink the permission from all roles first, then permanently delete it. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => { e.preventDefault(); deletePermission() }}
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

          {/* ── Pagination ──────────────────────────────────────────────── */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Page <span className="font-semibold text-slate-600">{page}</span> of{" "}
              <span className="font-semibold text-slate-600">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => fetchPermissions(Math.max(1, page - 1))} disabled={page === 1} className="h-8 text-xs">
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchPermissions(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-8 text-xs">
                Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}