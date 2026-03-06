"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react"
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

const ITEMS_PER_PAGE = 10
const asString = (v: unknown) => (v == null ? "" : String(v))

const badgeClass = (active?: boolean | null) =>
  active ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500"

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

      const res = await fetch(`/api/roles?page=${nextPage}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch roles (${res.status})`)

      const data = (await res.json()) as RoleListResponse

      const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      const totalValue = Array.isArray(data) ? list.length : typeof (data as any).total === "number" ? (data as any).total : list.length

      setRoles(list)
      setTotal(totalValue)
      setPage(nextPage)
    } catch (e: any) {
      console.error("Error fetching roles:", e)
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
        await fetch("/api/permissions/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: p.ID_Permission, roleId: roleToDelete.ID_Role }),
          cache: "no-store",
        })
      }

      const res = await fetch(`/api/roles/${roleToDelete.ID_Role}`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to delete role (${res.status})`)

      setDeleteOpen(false)
      setRoleToDelete(null)
      await fetchRoles(page)
    } catch (e: any) {
      console.error("Error deleting role:", e)
      setLoadError(e?.message ?? "Failed to delete role")
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    fetchRoles(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return roles.filter((r) => {
      const matchesSearch =
        !q ||
        asString(r.ID_Role).toLowerCase().includes(q) ||
        asString(r.Name).toLowerCase().includes(q) ||
        asString(r.Description).toLowerCase().includes(q)

      const isActive = Boolean(r.Active)
      const matchesActive = activeFilter === "all" || (activeFilter === "active" ? isActive : !isActive)

      return matchesSearch && matchesActive
    })
  }, [roles, searchQuery, activeFilter])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Active" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{total}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-lg border bg-white">
          <p className="text-gray-500">Loading roles...</p>
        </div>
      ) : loadError ? (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Roles could not be loaded</h2>
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
          <div className="mt-4">
            <Button onClick={() => fetchRoles(page)}>Retry</Button>
          </div>
        </div>
      ) : filtered.length ? (
        <>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Active</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Permissions</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((r) => {
                  const permsCount = Array.isArray(r.permissions) ? r.permissions.length : 0

                  return (
                    <tr key={r.ID_Role} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{r.ID_Role}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{asString(r.Name) || "-"}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{asString(r.Description) || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className={badgeClass(r.Active)}>{r.Active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="inline-flex items-center justify-center rounded-md border px-2 py-1 bg-gray-50 text-sm">
                          {permsCount}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/roles-permissions/roles/${r.ID_Role}`)}
                            className="h-8 w-8 bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <AlertDialog
                            open={deleteOpen && roleToDelete?.ID_Role === r.ID_Role}
                            onOpenChange={(open) => {
                              setDeleteOpen(open)
                              if (!open) setRoleToDelete(null)
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setRoleToDelete(r)
                                  setDeleteOpen(true)
                                }}
                                className="h-8 w-8 bg-gray-800 text-white hover:bg-gray-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete role?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will unlink all permissions from the role first, and then permanently delete the role.
                                  Permissions will NOT be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.preventDefault()
                                    deleteRole()
                                  }}
                                  disabled={deleting}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {deleting ? "Deleting..." : "Delete"}
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

          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </p>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchRoles(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRoles(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No roles found</p>
        </div>
      )}
    </div>
  )
}
