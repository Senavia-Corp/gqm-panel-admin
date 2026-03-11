"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, Eye, Trash2, X, AlertCircle, RefreshCcw, ShieldOff } from "lucide-react"
import type { Permission, PaginatedResponse, PermissionActionType, PermissionServiceType } from "@/lib/types"
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

const ITEMS_PER_PAGE = 10
const asString = (v: unknown) => (v == null ? "" : String(v))

// ── Semantic color maps ────────────────────────────────────────────────────────
const ACTION_COLORS: Record<string, string> = {
  View:   "bg-sky-50 text-sky-700 border-sky-200",
  Create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Edit:   "bg-amber-50 text-amber-700 border-amber-200",
  Delete: "bg-red-50 text-red-600 border-red-200",
}

const SERVICE_COLORS: Record<string, string> = {
  Job:           "bg-violet-50 text-violet-700 border-violet-200",
  Subcontractor: "bg-orange-50 text-orange-700 border-orange-200",
  GQM_Member:    "bg-blue-50 text-blue-700 border-blue-200",
  Technician:    "bg-teal-50 text-teal-700 border-teal-200",
  Client:        "bg-pink-50 text-pink-700 border-pink-200",
  Dashboard:     "bg-slate-100 text-slate-600 border-slate-200",
}

function ActionChip({ action }: { action?: string | null }) {
  const cls = ACTION_COLORS[action ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {action ?? "—"}
    </span>
  )
}

function ServiceChip({ service }: { service?: string | null }) {
  const cls = SERVICE_COLORS[service ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200"
  const label = service === "GQM_Member" ? "GQM Member" : service ?? "—"
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
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
  const [actionFilter, setActionFilter] = useState<"all" | PermissionActionType>("all")
  const [serviceFilter, setServiceFilter] = useState<"all" | PermissionServiceType>("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPermissions = async (nextPage: number) => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await fetch(`/api/permissions?page=${nextPage}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
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
        await fetch("/api/permissions/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: permissionToDelete.ID_Permission, roleId: r.ID_Role }),
          cache: "no-store",
        })
      }
      const res = await fetch(`/api/permissions/${permissionToDelete.ID_Permission}`, { method: "DELETE", cache: "no-store" })
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
      const matchesAction = actionFilter === "all" || p.Action === actionFilter
      const matchesService = serviceFilter === "all" || p.Service_Associated === serviceFilter
      const isActive = Boolean(p.Active)
      const matchesActive = activeFilter === "all" || (activeFilter === "active" ? isActive : !isActive)
      return matchesSearch && matchesAction && matchesService && matchesActive
    })
  }, [permissions, searchQuery, actionFilter, serviceFilter, activeFilter])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const hasActiveFilters = searchQuery || actionFilter !== "all" || serviceFilter !== "all" || activeFilter !== "all"

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

          <Select value={actionFilter} onValueChange={(v: any) => setActionFilter(v)}>
            <SelectTrigger className="w-36 text-sm border-slate-200 bg-slate-50">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="View">View</SelectItem>
              <SelectItem value="Create">Create</SelectItem>
              <SelectItem value="Edit">Edit</SelectItem>
              <SelectItem value="Delete">Delete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={(v: any) => setServiceFilter(v)}>
            <SelectTrigger className="w-40 text-sm border-slate-200 bg-slate-50">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="Job">Job</SelectItem>
              <SelectItem value="Subcontractor">Subcontractor</SelectItem>
              <SelectItem value="GQM_Member">GQM Member</SelectItem>
              <SelectItem value="Technician">Technician</SelectItem>
              <SelectItem value="Client">Client</SelectItem>
              <SelectItem value="Dashboard">Dashboard</SelectItem>
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
              onClick={() => { setSearchQuery(""); setActionFilter("all"); setServiceFilter("all"); setActiveFilter("all") }}
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
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Action</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Service</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Roles</th>
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
                      <td className="px-4 py-3"><ActionChip action={p.Action} /></td>
                      <td className="px-4 py-3"><ServiceChip service={p.Service_Associated} /></td>
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