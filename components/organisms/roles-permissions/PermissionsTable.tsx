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
import { useTranslations } from "@/components/providers/LocaleProvider"
import { PolicySummary } from "@/components/organisms/roles-permissions/PolicySummary"

const ITEMS_PER_PAGE = 10
const asString = (v: unknown) => (v == null ? "" : String(v))


function ActivePill({ active }: { active?: boolean | null }) {
  const t = useTranslations("roles_permissions")
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {t("active")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {t("inactive")}
    </span>
  )
}

type PermissionListResponse = PaginatedResponse<Permission> | Permission[]

export default function PermissionsTable() {
  const router = useRouter()
  const t = useTranslations("roles_permissions")

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
      setLoadError(e?.message ?? t("loadError"))
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
      setLoadError(e?.message ?? t("loadError"))
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
          <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t("searchPermissionsPh")}
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
              <SelectValue placeholder={t("filterModule")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllModules")}</SelectItem>
              <SelectItem value="admin">{t("filterFullAdmin")}</SelectItem>
              <SelectItem value="job">{t("filterJobs")}</SelectItem>
              <SelectItem value="member">{t("filterMembers")}</SelectItem>
              <SelectItem value="subcontractor">{t("filterSubcontractors")}</SelectItem>
              <SelectItem value="client">{t("filterClients")}</SelectItem>
              <SelectItem value="parent_mgmt_co">{t("filterPMC")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
            <SelectTrigger className="w-32 text-sm border-slate-200 bg-slate-50">
              <SelectValue placeholder={t("filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              <SelectItem value="active">{t("filterActive")}</SelectItem>
              <SelectItem value="inactive">{t("filterInactive")}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(""); setModuleFilter("all"); setActiveFilter("all") }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> {t("clearFilters")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">{total} {t("totalSuffix")}</span>
          <button
            onClick={() => fetchPermissions(page)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            title={t("refresh")}
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── States ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <RefreshCcw className="h-4 w-4 animate-spin" /> {t("loading")}
          </div>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
          <p className="text-sm font-semibold text-slate-700">{t("loadError")}</p>
          <p className="mt-1 text-xs text-red-500">{loadError}</p>
          <Button onClick={() => fetchPermissions(page)} className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t("retry")}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200">
          <ShieldOff className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm font-semibold text-slate-500">{t("noPermissions")}</p>
          {hasActiveFilters && <p className="mt-1 text-xs text-slate-400">{t("noResultsDesc")}</p>}
        </div>
      ) : (
        <>
          {/* ── Mobile cards ──────────────────────────────────────────────── */}
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 sm:hidden">
            {filtered.map((p) => {
              const rolesCount = Array.isArray(p.roles) ? p.roles.length : 0
              return (
                <div key={p.ID_Permission} className="p-4 transition-colors hover:bg-slate-50/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">{p.ID_Permission}</span>
                        <ActivePill active={p.Active} />
                      </div>
                      <p className="truncate text-sm font-semibold text-slate-800">{asString(p.Name) || "—"}</p>
                      {p.Description && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">{asString(p.Description)}</p>
                      )}
                      <div className="mt-2">
                        <PolicySummary document={p.Document} />
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">{t("linkedRolesSuffix")}</span>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{rolesCount}</span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <button
                        onClick={() => router.push(`/roles-permissions/permissions/${p.ID_Permission}`)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-amber-900 hover:bg-amber-500 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <AlertDialog
                        open={deleteOpen && permissionToDelete?.ID_Permission === p.ID_Permission}
                        onOpenChange={(open) => { setDeleteOpen(open); if (!open) setPermissionToDelete(null) }}
                      >
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={() => { setPermissionToDelete(p); setDeleteOpen(true) }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("delTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("delDesc")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>{t("btnCancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => { e.preventDefault(); deletePermission() }} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                              {deleting ? t("btnDeleting") : t("btnDelete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Desktop table ─────────────────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("thID")}</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("thName")}</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("thPolicy")}</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("thStatus")}</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("thRoles")}</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("thActions")}</th>
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
                            title={t("det_btnEdit")}
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
                                title={t("det_btnDelete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("delTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("delDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleting}>{t("btnCancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => { e.preventDefault(); deletePermission() }}
                                  disabled={deleting}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {deleting ? t("btnDeleting") : t("btnDelete")}
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {t("paginationPage")} <span className="font-semibold text-slate-600">{page}</span> {t("paginationOf")}{" "}
              <span className="font-semibold text-slate-600">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => fetchPermissions(Math.max(1, page - 1))} disabled={page === 1} className="h-8 text-xs">
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /><span className="hidden sm:inline">{t("paginationPrev")}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchPermissions(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-8 text-xs">
                <span className="hidden sm:inline">{t("paginationNext")}</span><ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}