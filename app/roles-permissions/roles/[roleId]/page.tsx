"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Trash2, Save, Plus, X, ArrowLeft, Users, Shield,
  AlertCircle, RefreshCcw, CheckCircle2, Link2, Link2Off,
} from "lucide-react"
import type { Permission, Role, PaginatedResponse, IAMDocument } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/apiFetch"

const asString = (v: unknown) => (v == null ? "" : String(v))

function PolicySummary({ document }: { document?: IAMDocument | null }) {
  if (!document || !document.Statement || document.Statement.length === 0) return <span className="text-slate-400">—</span>
  const allActions = document.Statement.flatMap(s => s.Action)
  if (allActions.includes("*")) return <span className="text-[10px] font-bold text-emerald-600">Full Access</span>
  const modules = Array.from(new Set(allActions.map(a => a.split(":")[0]).filter(Boolean)))
  return (
    <div className="flex flex-wrap gap-1">
      {modules.map(m => (
        <span key={m} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 lowercase border border-slate-200">
          {m}
        </span>
      ))}
    </div>
  )
}

function ActiveToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        onClick={() => onChange(true)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          active ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Active
      </button>
      <button
        onClick={() => onChange(false)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          !active ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <X className="h-3.5 w-3.5" /> Inactive
      </button>
    </div>
  )
}

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
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  const fetchRole = async () => {
    try {
      setLoading(true); setLoadError(null)
      const res = await apiFetch(`/api/roles/${roleId}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch role (${res.status})`)
      setRole(await res.json())
    } catch (e: any) {
      setRole(null); setLoadError(e?.message ?? "Failed to load role")
    } finally { setLoading(false) }
  }

  const fetchPermissions = async (page: number) => {
    try {
      setPermLoading(true); setPermError(null)
      const res = await apiFetch(`/api/permissions?page=${page}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch permissions (${res.status})`)
      const data = (await res.json()) as PermissionsListResponse
      const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      const totalValue = Array.isArray(data) ? list.length : typeof data.total === "number" ? data.total : list.length
      setAllPermissions(list); setPermTotal(totalValue); setPermPage(page)
    } catch (e: any) {
      setAllPermissions([]); setPermTotal(0); setPermError(e?.message ?? "Failed to load permissions")
    } finally { setPermLoading(false) }
  }

  useEffect(() => {
    if (!user) return
    fetchRole()
    fetchPermissions(1)
  }, [user, roleId])

  const linkedPermissionIds = useMemo(() => {
    const perms = role?.permissions
    if (!Array.isArray(perms)) return new Set<string>()
    return new Set(perms.map((p) => p.ID_Permission))
  }, [role?.permissions])

  const linkPermission = async (permissionId: string) => {
    if (!permissionId) return
    await apiFetch("/api/permissions/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionId, roleId }),
      cache: "no-store",
    })
    await fetchRole()
  }

  const unlinkPermission = async (permissionId: string) => {
    if (!permissionId) return
    await apiFetch("/api/permissions/roles", {
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
      await apiFetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Name: role.Name, Description: role.Description, Active: role.Active }),
        cache: "no-store",
      })
      await fetchRole()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!role) return
    try {
      setDeleting(true)
      const perms = Array.isArray(role.permissions) ? role.permissions : []
      for (const p of perms) {
        await apiFetch("/api/permissions/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: p.ID_Permission, roleId }),
          cache: "no-store",
        })
      }
      await apiFetch(`/api/roles/${roleId}`, { method: "DELETE", cache: "no-store" })
      router.push("/roles-permissions")
    } finally { setDeleting(false) }
  }

  const permTotalPages = Math.max(1, Math.ceil(permTotal / ITEMS_PER_PAGE))
  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ── Breadcrumb back ──────────────────────────────────────────── */}
          <button
            onClick={() => router.push("/roles-permissions")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Roles & Permissions
          </button>

          {/* ── Page header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl sm:text-2xl font-bold text-slate-900">Role Detail</h1>
                <p className="hidden sm:block text-sm text-slate-500">Edit role fields and manage linked permissions.</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || loading || !role}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : <><span className="sm:hidden">Save</span><span className="hidden sm:inline">Save Changes</span></>}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || loading || !role}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">{deleting ? "Deleting…" : "Delete"}</span>
              </Button>
            </div>
          </div>

          {/* ── Loading / error ──────────────────────────────────────────── */}
          {loading ? (
            <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCcw className="h-4 w-4 animate-spin" /> Loading role…
              </div>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
              <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
              <p className="text-sm font-semibold text-slate-700">Could not load role</p>
              <p className="mt-1 text-xs text-red-500">{loadError}</p>
              <Button onClick={fetchRole} className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700">Retry</Button>
            </div>
          ) : !role ? (
            <div className="py-12 text-center text-sm text-slate-400">Role not found</div>
          ) : (
            <>
              {/* ── Role info card ─────────────────────────────────────── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">
                {/* ID + status row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Role ID</p>
                    <span className="font-mono text-sm font-bold text-slate-700">{role.ID_Role}</span>
                  </div>
                  <ActiveToggle active={Boolean(role.Active)} onChange={(v) => setRole({ ...role, Active: v })} />
                </div>

                <div className="h-px bg-slate-100" />

                {/* Name + description */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</label>
                    <Input
                      value={asString(role.Name)}
                      onChange={(e) => setRole({ ...role, Name: e.target.value })}
                      placeholder="Role name"
                      className="border-slate-200 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</label>
                    <Textarea
                      value={asString(role.Description)}
                      onChange={(e) => setRole({ ...role, Description: e.target.value })}
                      placeholder="Role description"
                      className="min-h-[88px] resize-y border-slate-200 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ── Permissions management card ────────────────────────── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">
                {/* Header + quick link selector */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                      <Shield className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Permissions</h2>
                      <p className="text-xs text-slate-400">Link and unlink permissions for this role.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={selectedPermissionId} onValueChange={(v) => setSelectedPermissionId(v)}>
                      <SelectTrigger className="flex-1 sm:w-64 text-sm border-slate-200 bg-slate-50">
                        <SelectValue placeholder="Select a permission to link…" />
                      </SelectTrigger>
                      <SelectContent>
                        {permLoading ? (
                          <SelectItem value="__loading" disabled>Loading…</SelectItem>
                        ) : permError ? (
                          <SelectItem value="__error" disabled>Failed to load</SelectItem>
                        ) : allPermissions.length ? (
                          allPermissions.map((p) => (
                            <SelectItem key={p.ID_Permission} value={p.ID_Permission} disabled={linkedPermissionIds.has(p.ID_Permission)}>
                              {p.ID_Permission} — {asString(p.Name) || "—"}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty" disabled>No permissions available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={async () => { await linkPermission(selectedPermissionId); setSelectedPermissionId("") }}
                      disabled={!selectedPermissionId || linkedPermissionIds.has(selectedPermissionId)}
                      className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 h-9 flex-shrink-0"
                    >
                      <Link2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Link</span>
                    </Button>
                  </div>
                </div>

                {/* Permissions table */}
                {/* Shared pagination header */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      All permissions — page {permPage} of {permTotalPages}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => fetchPermissions(Math.max(1, permPage - 1))}
                        disabled={permPage === 1}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-white disabled:opacity-40"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => fetchPermissions(Math.min(permTotalPages, permPage + 1))}
                        disabled={permPage === permTotalPages}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-white disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  {/* Mobile cards */}
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {allPermissions.map((p) => {
                      const linked = linkedPermissionIds.has(p.ID_Permission)
                      return (
                        <div key={p.ID_Permission} className={`p-4 transition-colors ${linked ? "bg-emerald-50/40" : ""}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[11px] text-slate-400">{p.ID_Permission}</span>
                                {linked ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Linked
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-400">Not linked</span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-700">{asString(p.Name) || "—"}</p>
                              {p.Description && <p className="mt-0.5 truncate text-[11px] text-slate-400">{asString(p.Description)}</p>}
                              <div className="mt-1.5"><PolicySummary document={p.Document} /></div>
                            </div>
                            <div className="flex-shrink-0">
                              {linked ? (
                                <button
                                  onClick={() => unlinkPermission(p.ID_Permission)}
                                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                  <Link2Off className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => linkPermission(p.ID_Permission)}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full min-w-[520px]">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">ID</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Policy Summary</th>
                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Linked</th>
                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allPermissions.map((p) => {
                          const linked = linkedPermissionIds.has(p.ID_Permission)
                          return (
                            <tr key={p.ID_Permission} className={`transition-colors ${linked ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "hover:bg-slate-50/80"}`}>
                              <td className="px-4 py-2.5">
                                <span className="font-mono text-xs text-slate-500">{p.ID_Permission}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="text-xs font-semibold text-slate-700">{asString(p.Name) || "—"}</div>
                                {p.Description && <div className="text-[11px] text-slate-400 line-clamp-1">{asString(p.Description)}</div>}
                              </td>
                              <td className="px-4 py-2.5"><PolicySummary document={p.Document} /></td>
                              <td className="px-4 py-2.5 text-center">
                                {linked ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-400">No</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {linked ? (
                                  <button
                                    onClick={() => unlinkPermission(p.ID_Permission)}
                                    className="flex items-center gap-1 mx-auto rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                  >
                                    <Link2Off className="h-3 w-3" /> Unlink
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => linkPermission(p.ID_Permission)}
                                    className="flex items-center gap-1 mx-auto rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                                  >
                                    <Link2 className="h-3 w-3" /> Link
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Currently linked permissions */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Currently linked ({(role.permissions ?? []).length})
                  </p>
                  {(role.permissions ?? []).length ? (
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                      {role.permissions!.map((p) => (
                        <button
                          key={p.ID_Permission}
                          type="button"
                          onClick={() => router.push(`/roles-permissions/permissions/${p.ID_Permission}`)}
                          className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{asString(p.Name) || "—"}</p>
                              <p className="font-mono text-[10px] text-slate-400">{p.ID_Permission}</p>
                            </div>
                            <span className="flex-shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Linked
                            </span>
                          </div>
                          <div className="mt-2.5">
                            <PolicySummary document={p.Document} />
                          </div>
                          {p.Description && (
                            <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">{asString(p.Description)}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
                      <Shield className="mx-auto mb-1.5 h-6 w-6 text-slate-200" />
                      <p className="text-xs text-slate-400">No permissions linked to this role yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}