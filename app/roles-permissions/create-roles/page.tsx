"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, X } from "lucide-react"

type PermissionLite = {
    ID_Permission: string
    Name?: string | null
    Description?: string | null
    Action?: string | null
    Service_Associated?: string | null
    Active?: boolean | null
}

type PermissionListResponse =
    | { results: PermissionLite[]; total?: number; page?: number; limit?: number }
    | PermissionLite[]

const ITEMS_PER_PAGE = 20
const asString = (v: unknown) => (v == null ? "" : String(v))

const permissionLabel = (p: PermissionLite) => {
    const name = asString(p.Name) || p.ID_Permission
    const suffix = [asString(p.Action), asString(p.Service_Associated)].filter(Boolean).join(" • ")
    return suffix ? `${name} (${suffix})` : name
}

export default function CreateRolePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [active, setActive] = useState(true)

    const [permLoading, setPermLoading] = useState(true)
    const [permError, setPermError] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<PermissionLite[]>([])
    const [permPage, setPermPage] = useState(1)
    const [permTotal, setPermTotal] = useState<number>(0)
    const [permSearch, setPermSearch] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [quickOpen, setQuickOpen] = useState(false)
    const [qName, setQName] = useState("")
    const [qDesc, setQDesc] = useState("")
    const [qActive, setQActive] = useState(true)
    const [qAction, setQAction] = useState("View")
    const [qService, setQService] = useState("Job")
    const [quickSubmitting, setQuickSubmitting] = useState(false)
    const [quickError, setQuickError] = useState<string | null>(null)

    useEffect(() => {
        const userData = localStorage.getItem("user_data")
        if (!userData) {
            router.push("/login")
            return
        }
        setUser(JSON.parse(userData))
    }, [router])

    const fetchPermissions = async (pageToFetch: number, mode: "replace" | "append" = "replace") => {
        try {
            setPermLoading(true)
            setPermError(null)

            const res = await fetch(`/api/permissions?page=${pageToFetch}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
            if (!res.ok) throw new Error(`Failed to fetch permissions (${res.status})`)

            const data = (await res.json()) as PermissionListResponse
            const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
            const totalValue = Array.isArray(data) ? list.length : typeof data.total === "number" ? data.total : list.length

            setPermTotal(totalValue)
            setPermPage(pageToFetch)
            setPermissions((prev) => (mode === "append" ? [...prev, ...list] : list))
        } catch (e: any) {
            console.error(e)
            setPermError(e?.message ?? "Failed to load permissions")
            setPermissions([])
            setPermTotal(0)
        } finally {
            setPermLoading(false)
        }
    }

    useEffect(() => {
        fetchPermissions(1, "replace")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filteredPermissions = useMemo(() => {
        const q = permSearch.trim().toLowerCase()
        if (!q) return permissions
        return permissions.filter((p) => {
            return (
                p.ID_Permission.toLowerCase().includes(q) ||
                asString(p.Name).toLowerCase().includes(q) ||
                asString(p.Description).toLowerCase().includes(q) ||
                asString(p.Action).toLowerCase().includes(q) ||
                asString(p.Service_Associated).toLowerCase().includes(q)
            )
        })
    }, [permissions, permSearch])

    const canLoadMore = permissions.length < permTotal

    const togglePermission = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const removeSelected = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
        })
    }

    const selectedPermissions = useMemo(() => {
        const ids = selectedIds
        return permissions.filter((p) => ids.has(p.ID_Permission))
    }, [permissions, selectedIds])

    const canSubmit = useMemo(() => {
        return name.trim().length > 0 && selectedIds.size > 0
    }, [name, selectedIds])

    const quickCreatePermission = async () => {
        try {
            setQuickSubmitting(true)
            setQuickError(null)

            if (!qName.trim()) throw new Error("Permission name is required")

            const payload = {
                Name: qName.trim(),
                Description: qDesc.trim() || null,
                Active: qActive,
                Action: qAction,
                Service_Associated: qService,
            }

            const res = await fetch("/api/permissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(body?.detail || `Failed to create permission (${res.status})`)
            }

            const created = (await res.json()) as any

            const perm: PermissionLite = {
                ID_Permission: created?.ID_Permission,
                Name: created?.Name,
                Description: created?.Description,
                Action: created?.Action,
                Service_Associated: created?.Service_Associated,
                Active: created?.Active,
            }

            setPermissions((prev) => [perm, ...prev])
            setSelectedIds((prev) => new Set(prev).add(perm.ID_Permission))

            setQName("")
            setQDesc("")
            setQActive(true)
            setQAction("View")
            setQService("Job")
            setQuickOpen(false)
        } catch (e: any) {
            console.error(e)
            setQuickError(e?.message ?? "Failed to create permission")
        } finally {
            setQuickSubmitting(false)
        }
    }

    const createRoleAndLink = async () => {
        try {
            setSubmitting(true)
            setError(null)

            if (selectedIds.size === 0) throw new Error("Select at least one permission")

            const rolePayload = {
                Name: name.trim(),
                Description: description.trim() || null,
                Active: active,
            }

            const roleRes = await fetch("/api/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rolePayload),
            })

            if (!roleRes.ok) {
                const body = await roleRes.json().catch(() => null)
                throw new Error(body?.detail || `Failed to create role (${roleRes.status})`)
            }

            const createdRole = await roleRes.json()
            const roleId = createdRole?.ID_Role
            if (!roleId) throw new Error("Role created but ID_Role was not returned")

            const ids = Array.from(selectedIds)
            for (const permId of ids) {
                const linkRes = await fetch("/api/permissions/roles", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ permissionId: permId, roleId })
                })

                if (!linkRes.ok) {
                    const body = await linkRes.json().catch(() => null)
                    throw new Error(body?.detail || body?.error || `Failed to link permission ${permId} (${linkRes.status})`)
                }
            }

            router.push("/roles-permissions")
        } catch (e: any) {
            console.error(e)
            setError(e?.message ?? "Failed to create role")
        } finally {
            setSubmitting(false)
        }
    }

    if (!user) return null

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar user={user} />

                <main className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">Create Role</h1>
                        <p className="text-sm text-muted-foreground">A role must include at least one permission.</p>
                    </div>

                    <Card className="p-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Project Manager" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Active</label>
                                <Select value={active ? "true" : "false"} onValueChange={(v) => setActive(v === "true")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-sm font-medium">Description</label>
                                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 rounded-lg border bg-white p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Select permissions</h2>
                                    <p className="text-sm text-muted-foreground">Choose one or more permissions for this role.</p>
                                </div>

                                <Button variant="outline" className="gap-2" onClick={() => setQuickOpen((v) => !v)}>
                                    <Plus className="h-4 w-4" />
                                    Quick create permission
                                </Button>
                            </div>

                            {quickOpen ? (
                                <div className="rounded-lg border p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="font-medium">New permission</p>
                                        <Button variant="ghost" size="sm" onClick={() => setQuickOpen(false)} className="h-8 w-8 p-0">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid gap-3 lg:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Name</label>
                                            <Input value={qName} onChange={(e) => setQName(e.target.value)} placeholder="e.g. View Jobs" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Active</label>
                                            <Select value={qActive ? "true" : "false"} onValueChange={(v) => setQActive(v === "true")}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Active</SelectItem>
                                                    <SelectItem value="false">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Action</label>
                                            <Select value={qAction} onValueChange={(v) => setQAction(v)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="View">View</SelectItem>
                                                    <SelectItem value="Create">Create</SelectItem>
                                                    <SelectItem value="Edit">Edit</SelectItem>
                                                    <SelectItem value="Delete">Delete</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Service</label>
                                            <Select value={qService} onValueChange={(v) => setQService(v)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Job">Job</SelectItem>
                                                    <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                                                    <SelectItem value="GQM_Member">GQM_Member</SelectItem>
                                                    <SelectItem value="Technician">Technician</SelectItem>
                                                    <SelectItem value="Client">Client</SelectItem>
                                                    <SelectItem value="Dashboard">Dashboard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 lg:col-span-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <Input value={qDesc} onChange={(e) => setQDesc(e.target.value)} placeholder="Optional..." />
                                        </div>
                                    </div>

                                    {quickError ? <p className="mt-3 text-sm text-red-600">{quickError}</p> : null}

                                    <div className="mt-4 flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setQuickOpen(false)} disabled={quickSubmitting}>
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={quickCreatePermission}
                                            disabled={quickSubmitting || !qName.trim()}
                                            className="bg-gqm-green text-white hover:bg-gqm-green/90"
                                        >
                                            {quickSubmitting ? "Creating..." : "Create & Select"}
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative sm:w-96">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search permissions..."
                                        value={permSearch}
                                        onChange={(e) => setPermSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    Loaded: <span className="font-medium text-foreground">{permissions.length}</span>
                                    {permTotal ? (
                                        <>
                                            {" "}
                                            / <span className="font-medium text-foreground">{permTotal}</span>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            {permLoading ? (
                                <div className="flex h-40 items-center justify-center rounded-lg border">
                                    <p className="text-sm text-muted-foreground">Loading permissions...</p>
                                </div>
                            ) : permError ? (
                                <div className="rounded-lg border p-4">
                                    <p className="text-sm text-red-600">{permError}</p>
                                    <div className="mt-3">
                                        <Button variant="outline" onClick={() => fetchPermissions(1, "replace")}>
                                            Retry
                                        </Button>
                                    </div>
                                </div>
                            ) : permissions.length === 0 ? (
                                <div className="rounded-lg border p-4">
                                    <p className="text-sm text-muted-foreground">No permissions available. Use “Quick create permission”.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-md border">
                                        <table className="w-full">
                                            <thead className="border-b bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-medium">Select</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium">Permission</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium">Active</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredPermissions.map((p) => {
                                                    const checked = selectedIds.has(p.ID_Permission)
                                                    return (
                                                        <tr key={p.ID_Permission} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => togglePermission(p.ID_Permission)}
                                                                    className="h-4 w-4"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <div className="font-medium">{permissionLabel(p)}</div>
                                                                <div className="text-xs text-muted-foreground line-clamp-1">{asString(p.Description) || "-"}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <Badge className={p.Active ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500"}>
                                                                    {p.Active ? "Active" : "Inactive"}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            variant="outline"
                                            onClick={() => fetchPermissions(permPage + 1, "append")}
                                            disabled={!canLoadMore || permLoading}
                                        >
                                            {canLoadMore ? "Load more" : "All loaded"}
                                        </Button>
                                    </div>
                                </>
                            )}

                            <div className="rounded-lg border bg-gray-50 p-4">
                                <p className="text-sm font-medium">Selected permissions ({selectedIds.size})</p>
                                {selectedPermissions.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedPermissions.map((p) => (
                                            <Badge key={p.ID_Permission} variant="secondary" className="gap-2">
                                                {asString(p.Name) || p.ID_Permission}
                                                <button onClick={() => removeSelected(p.ID_Permission)} className="ml-1">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm text-muted-foreground">Select at least one permission to continue.</p>
                                )}
                            </div>
                        </div>

                        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => router.push("/roles-permissions")} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button
                                onClick={createRoleAndLink}
                                disabled={!canSubmit || submitting}
                                className="bg-gqm-green text-white hover:bg-gqm-green/90"
                            >
                                {submitting ? "Creating..." : "Create Role"}
                            </Button>
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    )
}
