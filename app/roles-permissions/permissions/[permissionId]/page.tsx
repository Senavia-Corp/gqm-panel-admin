"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Trash2, Save, ArrowLeft } from "lucide-react"
import type { Permission, PermissionActionType, PermissionServiceType, Role } from "@/lib/types"

const asString = (v: unknown) => (v == null ? "" : String(v))

const badgeClass = (active?: boolean | null) =>
    active ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500"

const ACTION_OPTIONS: PermissionActionType[] = ["View", "Create", "Edit", "Delete"]
const SERVICE_OPTIONS: PermissionServiceType[] = ["Job", "Subcontractor", "GQM_Member", "Technician", "Client", "Dashboard"]

export default function PermissionDetailPage() {
    const params = useParams() as { permissionId?: string }
    const permissionId = params?.permissionId ?? ""
    const router = useRouter()

    const [user, setUser] = useState<any>(null)

    const [permission, setPermission] = useState<Permission | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const userData = localStorage.getItem("user_data")
        if (!userData) {
            router.push("/login")
            return
        }
        setUser(JSON.parse(userData))
    }, [router])

    const fetchPermission = async () => {
        if (!permissionId) return
        try {
            setLoading(true)
            setLoadError(null)

            const res = await fetch(`/api/permissions/${permissionId}`, { cache: "no-store" })
            if (!res.ok) throw new Error(`Failed to fetch permission (${res.status})`)

            const data = (await res.json()) as Permission
            setPermission(data)
        } catch (e: any) {
            console.error("Error fetching permission:", e)
            setPermission(null)
            setLoadError(e?.message ?? "Failed to load permission")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user) return
        fetchPermission()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, permissionId])

    const linkedRoles = useMemo(() => {
        const roles = (permission as any)?.roles
        return Array.isArray(roles) ? (roles as Role[]) : []
    }, [permission])

    const handleSave = async () => {
        if (!permissionId || !permission) return
        try {
            setSaving(true)
            await fetch(`/api/permissions/${permissionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    Name: permission.Name,
                    Description: permission.Description,
                    Active: permission.Active,
                    Action: permission.Action,
                    Service_Associated: permission.Service_Associated,
                }),
            })
            await fetchPermission()
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!permissionId || !permission) return

        try {
            setDeleting(true)

            // 1) Unlink from all roles first
            const roles = Array.isArray((permission as any).roles) ? ((permission as any).roles as Role[]) : []
            for (const r of roles) {
                await fetch("/api/permissions/roles", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify({
                        permissionId,
                        roleId: (r as any).ID_Role,
                    }),
                })
            }

            // 2) Delete permission
            await fetch(`/api/permissions/${permissionId}`, {
                method: "DELETE",
                cache: "no-store",
            })

            router.push("/roles-permissions")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />

            <div className="flex flex-1 flex-col overflow-hidden">
                {user ? <TopBar user={user} /> : null}

                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Back button (like Purchases) */}
                    <div>
                        <Button
                            onClick={() => router.push("/roles-permissions")}
                            className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Roles & Permissions
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Permission Detail</h1>
                            <p className="text-sm text-muted-foreground">Edit permission fields and review linked roles.</p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                disabled={saving || loading || !permission}
                                className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
                            >
                                <Save className="h-4 w-4" />
                                Save
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={deleting || loading || !permission} className="gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this permission?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will unlink the permission from all roles first, then permanently delete it. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                                            {deleting ? "Deleting..." : "Confirm Delete"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex h-56 items-center justify-center rounded-lg border bg-white">
                            <p className="text-gray-500">Loading permission...</p>
                        </div>
                    ) : loadError ? (
                        <div className="rounded-lg border bg-white p-6">
                            <h2 className="text-lg font-semibold">Permission could not be loaded</h2>
                            <p className="mt-2 text-sm text-red-600">{loadError}</p>
                            <div className="mt-4">
                                <Button onClick={fetchPermission}>Retry</Button>
                            </div>
                        </div>
                    ) : !permission ? (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground">Permission not found</p>
                        </div>
                    ) : (
                        <>
                            <Card className="p-6 space-y-6">
                                {/* Top row: ID + Active */}
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
                                    <div className="lg:col-span-6">
                                        <div className="text-md text-muted-foreground mb-1">Permission ID</div>
                                        <div className="text-sm font-medium">{permission.ID_Permission}</div>
                                    </div>

                                    <div className="lg:col-span-6">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
                                            <div className="flex items-center gap-2">
                                                <div className="text-md text-muted-foreground">Active</div>
                                                <Badge className={badgeClass(permission.Active)}>
                                                    {permission.Active ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>


                                        </div>
                                    </div>
                                </div>

                                {/* Main form: Name + Description + Action + Service */}
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                                    {/* Name */}
                                    <div className="lg:col-span-6">
                                        <div className="text-md text-muted-foreground mb-1">Name</div>
                                        <Input
                                            value={asString(permission.Name)}
                                            onChange={(e) => setPermission({ ...permission, Name: e.target.value })}
                                            placeholder="Permission name"
                                        />
                                    </div>

                                    {/* Description (wider + stable height) */}
                                    <div className="lg:col-span-6">
                                        <div className="text-md text-muted-foreground mb-1">Description</div>
                                        <Textarea
                                            value={asString(permission.Description)}
                                            onChange={(e) => setPermission({ ...permission, Description: e.target.value })}
                                            placeholder="Permission description"
                                            className="min-h-[96px] resize-y"
                                        />
                                    </div>

                                    {/* Action */}
                                    <div className="lg:col-span-6">
                                        <div className="text-md text-muted-foreground mb-1">Action</div>
                                        <Select
                                            value={permission.Action as any}
                                            onValueChange={(v) => setPermission({ ...permission, Action: v as PermissionActionType })}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select action..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ACTION_OPTIONS.map((a) => (
                                                    <SelectItem key={a} value={a}>
                                                        {a}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Service */}
                                    <div className="lg:col-span-6">
                                        <div className="text-md text-muted-foreground mb-1">Service</div>
                                        <Select
                                            value={permission.Service_Associated as any}
                                            onValueChange={(v) =>
                                                setPermission({ ...permission, Service_Associated: v as PermissionServiceType })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select service..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SERVICE_OPTIONS.map((s) => (
                                                    <SelectItem key={s} value={s}>
                                                        {s === "GQM_Member" ? "GQM Member" : s}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant={permission.Active ? "outline" : "default"}
                                        onClick={() => setPermission({ ...permission, Active: true })}
                                    >
                                        Set Active
                                    </Button>
                                    <Button
                                        variant={!permission.Active ? "outline" : "default"}
                                        onClick={() => setPermission({ ...permission, Active: false })}
                                    >
                                        Set Inactive
                                    </Button>
                                </div>
                            </Card>

                            <Card className="p-6 space-y-4">
                                <div>
                                    <h2 className="text-lg font-semibold">Linked Roles</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Roles that currently include this permission. Click a card to open the role detail.
                                    </p>
                                </div>

                                {linkedRoles.length ? (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {linkedRoles.map((r: any) => (
                                            <button
                                                key={r.ID_Role}
                                                onClick={() => router.push(`/roles-permissions/roles/${r.ID_Role}`)}
                                                className="text-left rounded-lg border bg-white p-4 hover:bg-gray-50 transition"
                                                type="button"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold">{asString(r.Name) || "-"}</div>
                                                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                            {asString(r.Description) || "No description"}
                                                        </div>
                                                    </div>

                                                    <Badge className={badgeClass(r.Active)}>{r.Active ? "Active" : "Inactive"}</Badge>
                                                </div>

                                                <div className="mt-3 text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">{r.ID_Role}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border bg-white p-6">
                                        <p className="text-sm text-muted-foreground">No roles linked to this permission.</p>
                                    </div>
                                )}
                            </Card>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
