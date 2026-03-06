"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Save, Plus, X, ArrowLeft } from "lucide-react"
import type { Permission, Role, PaginatedResponse } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"

const asString = (v: unknown) => (v == null ? "" : String(v))

const badgeClass = (active?: boolean | null) =>
  active ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500"

type PermissionsListResponse = PaginatedResponse<Permission> | Permission[]

const ITEMS_PER_PAGE = 10

export default function RoleDetailPage() {
  const { roleId } = useParams() as { roleId: string }
  const router = useRouter()

  const [user, setUser] = useState<any>(null)

  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [permPage, setPermPage] = useState(1)
  const [permTotal, setPermTotal] = useState(0)
  const [permLoading, setPermLoading] = useState(false)
  const [permError, setPermError] = useState<string | null>(null)

  const [selectedPermissionId, setSelectedPermissionId] = useState<string>("")

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  const fetchRole = async () => {
    try {
      setLoading(true)
      setLoadError(null)

      const res = await fetch(`/api/roles/${roleId}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch role (${res.status})`)

      const data = (await res.json()) as Role
      setRole(data)
    } catch (e: any) {
      console.error("Error fetching role:", e)
      setRole(null)
      setLoadError(e?.message ?? "Failed to load role")
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async (page: number) => {
    try {
      setPermLoading(true)
      setPermError(null)

      const res = await fetch(`/api/permissions?page=${page}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch permissions (${res.status})`)

      const data = (await res.json()) as PermissionsListResponse
      const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      const totalValue = Array.isArray(data) ? list.length : typeof data.total === "number" ? data.total : list.length

      setAllPermissions(list)
      setPermTotal(totalValue)
      setPermPage(page)
    } catch (e: any) {
      console.error("Error fetching permissions:", e)
      setAllPermissions([])
      setPermTotal(0)
      setPermError(e?.message ?? "Failed to load permissions")
    } finally {
      setPermLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchRole()
    fetchPermissions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleId])

  const linkedPermissionIds = useMemo(() => {
    const perms = role?.permissions
    if (!Array.isArray(perms)) return new Set<string>()
    return new Set(perms.map((p) => p.ID_Permission))
  }, [role?.permissions])

  const linkPermission = async (permissionId: string) => {
    if (!permissionId) return
    await fetch("/api/permissions/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionId, roleId }),
      cache: "no-store",
    })
    await fetchRole()
  }

  const unlinkPermission = async (permissionId: string) => {
    if (!permissionId) return
    await fetch("/api/permissions/roles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionId, roleId }),
      cache: "no-store",
    })
    await fetchRole()
  }

  const handleSave = async () => {
    if (!role) return
    try {
      setSaving(true)
      await fetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: role.Name,
          Description: role.Description,
          Active: role.Active,
        }),
        cache: "no-store",
      })
      await fetchRole()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!role) return
    try {
      setDeleting(true)

      const perms = Array.isArray(role.permissions) ? role.permissions : []
      for (const p of perms) {
        await fetch("/api/permissions/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: p.ID_Permission, roleId }),
          cache: "no-store",
        })
      }

      await fetch(`/api/roles/${roleId}`, { method: "DELETE", cache: "no-store" })
      router.push("/roles-permissions")
    } finally {
      setDeleting(false)
    }
  }

  const permTotalPages = Math.max(1, Math.ceil(permTotal / ITEMS_PER_PAGE))

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <Button
            variant="default"
            onClick={() => router.push("/roles-permissions")}
            className="w-fit gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Roles & Permissions
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Role Detail</h1>
              <p className="text-sm text-muted-foreground">Edit role fields and manage linked permissions.</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || loading || !role} className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90">
                <Save className="h-4 w-4" />
                Save
              </Button>

              <Button variant="destructive" onClick={handleDelete} disabled={deleting || loading || !role} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-56 items-center justify-center rounded-lg border bg-white">
              <p className="text-gray-500">Loading role...</p>
            </div>
          ) : loadError ? (
            <div className="rounded-lg border bg-white p-6">
              <h2 className="text-lg font-semibold">Role could not be loaded</h2>
              <p className="mt-2 text-sm text-red-600">{loadError}</p>
              <div className="mt-4">
                <Button onClick={fetchRole}>Retry</Button>
              </div>
            </div>
          ) : !role ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Role not found</p>
            </div>
          ) : (
            <>
              <Card className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-md text-muted-foreground mb-1">Role ID</div>
                    <div className="text-sm font-medium">{role.ID_Role}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-md text-muted-foreground">Active</div>
                    <Badge className={badgeClass(role.Active)}>{role.Active ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-md text-muted-foreground mb-1">Name</div>
                    <Input
                      value={asString(role.Name)}
                      onChange={(e) => setRole({ ...role, Name: e.target.value })}
                      placeholder="Role name"
                    />
                  </div>

                  <div>
                    <div className="text-md text-muted-foreground mb-1">Description</div>
                    <Textarea
                      value={asString(role.Description)}
                      onChange={(e) => setRole({ ...role, Description: e.target.value })}
                      placeholder="Role description"
                      className="min-h-[96px] resize-y"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={role.Active ? "outline" : "default"}
                    onClick={() => setRole({ ...role, Active: true })}
                  >
                    Set Active
                  </Button>
                  <Button
                    variant={!role.Active ? "outline" : "default"}
                    onClick={() => setRole({ ...role, Active: false })}
                  >
                    Set Inactive
                  </Button>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Permissions</h2>
                    <p className="text-sm text-muted-foreground">Link and unlink permissions for this role.</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={selectedPermissionId} onValueChange={(v) => setSelectedPermissionId(v)}>
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="Select a permission to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        {permLoading ? (
                          <SelectItem value="__loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : permError ? (
                          <SelectItem value="__error" disabled>
                            Failed to load
                          </SelectItem>
                        ) : allPermissions.length ? (
                          allPermissions.map((p) => (
                            <SelectItem key={p.ID_Permission} value={p.ID_Permission} disabled={linkedPermissionIds.has(p.ID_Permission)}>
                              {p.ID_Permission} — {asString(p.Name) || "-"}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty" disabled>
                            No permissions available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={async () => {
                        await linkPermission(selectedPermissionId)
                        setSelectedPermissionId("")
                      }}
                      disabled={!selectedPermissionId || linkedPermissionIds.has(selectedPermissionId)}
                      className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
                    >
                      <Plus className="h-4 w-4" />
                      Link
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    Permissions page <span className="font-medium text-foreground">{permPage}</span> of{" "}
                    <span className="font-medium text-foreground">{permTotalPages}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchPermissions(Math.max(1, permPage - 1))} disabled={permPage === 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchPermissions(Math.min(permTotalPages, permPage + 1))} disabled={permPage === permTotalPages}>
                      Next
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Service</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Linked</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {allPermissions.map((p) => {
                        const linked = linkedPermissionIds.has(p.ID_Permission)
                        return (
                          <tr key={p.ID_Permission} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{p.ID_Permission}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium">{asString(p.Name) || "-"}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{asString(p.Description) || "-"}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{p.Action}</td>
                            <td className="px-4 py-3 text-sm">{p.Service_Associated}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <Badge className={linked ? "bg-gqm-green hover:bg-gqm-green/90" : "bg-gray-300 hover:bg-gray-400"}>
                                {linked ? "Yes" : "No"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {linked ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => unlinkPermission(p.ID_Permission)}
                                  className="gap-2"
                                >
                                  <X className="h-4 w-4" />
                                  Unlink
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => linkPermission(p.ID_Permission)}
                                  className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
                                >
                                  <Plus className="h-4 w-4" />
                                  Link
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-md border p-4 bg-white">
                  <div className="text-md text-muted-foreground mb-3">Currently linked permissions</div>

                  {(role.permissions ?? []).length ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {role.permissions!.map((p) => (
                        <button
                          key={p.ID_Permission}
                          type="button"
                          onClick={() => router.push(`/roles-permissions/permissions/${p.ID_Permission}`)}
                          className="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-gqm-green/40 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{asString(p.Name) || "-"}</div>
                              <div className="text-xs text-muted-foreground truncate">{p.ID_Permission}</div>
                            </div>

                            <Badge className="bg-gqm-green hover:bg-gqm-green/90">Linked</Badge>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-gray-100 px-2 py-1">{asString(p.Action) || "-"}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-1">{asString(p.Service_Associated) || "-"}</span>
                          </div>

                          <div className="mt-3 text-xs text-muted-foreground line-clamp-2">
                            {asString(p.Description) || "No description"}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No permissions linked</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
