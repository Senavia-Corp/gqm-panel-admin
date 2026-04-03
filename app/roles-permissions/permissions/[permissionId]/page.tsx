"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Trash2, Save, ArrowLeft, Shield, Users,
  AlertCircle, RefreshCcw, CheckCircle2, X, Plus
} from "lucide-react"
import type { Permission, IAMDocument, IAMStatement, Role } from "@/lib/types"

const MODULE_ACTIONS = [
  {
    module: "Jobs",
    actions: [
      { id: "job:read", label: "Full Read", desc: "Access to all job info including financial data." },
      { id: "job:read_basics", label: "Read Basics", desc: "Limited access to public/basic fields only." },
      { id: "job:create", label: "Create", desc: "Create new job records." },
      { id: "job:update", label: "Update", desc: "Edit existing job information." },
      { id: "job:delete", label: "Delete", desc: "Delete job records." },
    ]
  },
  {
    module: "Members",
    actions: [
      { id: "member:read", label: "Read", desc: "View the team member list and details." },
      { id: "member:create", label: "Create", desc: "Register new team members." },
      { id: "member:update", label: "Update", desc: "Edit member profiles." },
      { id: "member:delete", label: "Delete", desc: "Remove members from the system." },
    ]
  },
  {
    module: "Subcontractors",
    actions: [
      { id: "subcontractor:read", label: "Read", desc: "View subcontractor lists and details." },
      { id: "subcontractor:create", label: "Create", desc: "Register new subcontractors." },
      { id: "subcontractor:update", label: "Update", desc: "Edit subcontractor profiles." },
      { id: "subcontractor:delete", label: "Delete", desc: "Delete subcontractor records." },
    ]
  },
  {
    module: "Clients / Communities",
    actions: [
      { id: "client:read", label: "Read", desc: "View clients and communities." },
      { id: "client:create", label: "Create", desc: "Create new client/community records." },
      { id: "client:update", label: "Update", desc: "Update client information." },
      { id: "client:delete", label: "Delete", desc: "Delete clients from the system." },
    ]
  },
  {
    module: "PMC (Parent Companies)",
    actions: [
      { id: "parent_mgmt_co:read", label: "Read", desc: "Consult PMCs." },
      { id: "parent_mgmt_co:create", label: "Create", desc: "Create new PMC records." },
      { id: "parent_mgmt_co:update", label: "Update", desc: "Edit PMC information." },
      { id: "parent_mgmt_co:delete", label: "Delete", desc: "Delete PMC records." },
    ]
  },
]

const asString = (v: unknown) => (v == null ? "" : String(v))



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
  const [statements, setStatements] = useState<IAMStatement[]>([])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  const fetchPermission = async () => {
    if (!permissionId) return
    try {
      setLoading(true); setLoadError(null)
      const res = await fetch(`/api/permissions/${permissionId}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch permission (${res.status})`)
      const data = await res.json()
      setPermission(data)
      setStatements(data.Document?.Statement || [{ Effect: "Allow", Action: [], Resource: ["*"] }])
    } catch (e: any) {
      setPermission(null); setLoadError(e?.message ?? "Failed to load permission")
    } finally { setLoading(false) }
  }

  useEffect(() => { if (!user) return; fetchPermission() }, [user, permissionId])

  const addStatement = () => setStatements([...statements, { Effect: "Allow", Action: [], Resource: ["*"] }])
  const removeStatement = (idx: number) => setStatements(statements.filter((_, i) => i !== idx))
  const updateStatement = (idx: number, updates: Partial<IAMStatement>) => setStatements(statements.map((s, i) => i === idx ? { ...s, ...updates } : s))
  const toggleAction = (idx: number, actionId: string) => {
    const s = statements[idx]
    let next: string[] = [...s.Action]

    if (actionId === "*") {
      next = next.includes("*") ? [] : ["*"]
    } else {
      next = next.filter(a => a !== "*")
      const mod = actionId.split(":")[0]
      const isModWildcard = actionId.endsWith(":*")

      if (isModWildcard) {
        if (next.includes(actionId)) {
          next = next.filter(a => a !== actionId)
        } else {
          next = [...next.filter(a => !a.startsWith(`${mod}:`)), actionId]
        }
      } else {
        next = next.filter(a => a !== `${mod}:*`)
        if (next.includes(actionId)) {
          next = next.filter(a => a !== actionId)
        } else {
          next = [...next, actionId]
        }
      }
    }
    updateStatement(idx, { Action: next })
  }

  const linkedRoles = useMemo(() => {
    const roles = (permission as any)?.roles
    return Array.isArray(roles) ? (roles as Role[]) : []
  }, [permission])

  const handleSave = async () => {
    if (!permissionId || !permission) return
    try {
      setSaving(true)
      const doc: IAMDocument = { Version: "1.0", Statement: statements }
      await fetch(`/api/permissions/${permissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          Name: permission.Name,
          Description: permission.Description,
          Active: permission.Active,
          Document: doc
        }),
      })
      await fetchPermission()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!permissionId || !permission) return
    try {
      setDeleting(true)
      const roles = Array.isArray((permission as any).roles) ? ((permission as any).roles as Role[]) : []
      for (const r of roles) {
        await fetch("/api/permissions/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ permissionId, roleId: (r as any).ID_Role }),
        })
      }
      await fetch(`/api/permissions/${permissionId}`, { method: "DELETE", cache: "no-store" })
      router.push("/roles-permissions")
    } finally { setDeleting(false) }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {user ? <TopBar /> : null}

        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── Breadcrumb ───────────────────────────────────────────────── */}
          <button
            onClick={() => router.push("/roles-permissions")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Roles & Permissions
          </button>

          {/* ── Page header ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                <Shield className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Permission Detail</h1>
                <p className="text-sm text-slate-500">Edit permission fields and review linked roles.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || loading || !permission}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting || loading || !permission} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    {deleting ? "Deleting…" : "Delete"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this permission?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will unlink it from all roles first, then permanently delete it. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                      {deleting ? "Deleting…" : "Confirm Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* ── States ───────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCcw className="h-4 w-4 animate-spin" /> Loading permission…
              </div>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
              <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
              <p className="text-sm font-semibold text-slate-700">Could not load permission</p>
              <p className="mt-1 text-xs text-red-500">{loadError}</p>
              <Button onClick={fetchPermission} className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700">Retry</Button>
            </div>
          ) : !permission ? (
            <div className="py-12 text-center text-sm text-slate-400">Permission not found</div>
          ) : (
            <>
              {/* Permission info card */}
              <div className="max-w-5xl mx-auto space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                {/* ID + active status row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Permission ID</p>
                    <span className="font-mono text-sm font-bold text-slate-700">{permission.ID_Permission}</span>
                  </div>
                  <ActiveToggle
                    active={Boolean(permission.Active)}
                    onChange={(v) => setPermission({ ...permission, Active: v })}
                  />
                </div>

                <div className="h-px bg-slate-100" />

                {/* Form grid */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</label>
                    <Textarea
                      value={asString(permission.Description)}
                      onChange={(e) => setPermission({ ...permission, Description: e.target.value })}
                      placeholder="Permission description"
                      className="min-h-[64px] resize-y border-slate-200 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Policy Builder Replacement */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Policy Statements
                  </label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addStatement}
                      className="h-7 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Statement
                    </Button>
                  </div>

                  {statements.map((s, sIdx) => (
                    <div key={sIdx} className="relative rounded-xl border border-slate-200 bg-slate-50/30 p-4 space-y-4">
                      {statements.length > 1 && (
                        <button 
                          onClick={() => removeStatement(sIdx)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Effect</label>
                          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateStatement(sIdx, { Effect: "Allow" })}
                              className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                                s.Effect === "Allow" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              Allow
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatement(sIdx, { Effect: "Deny" })}
                              className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                                s.Effect === "Deny" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              Deny
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Shortcut</label>
                          <button
                            type="button"
                            onClick={() => toggleAction(sIdx, "*")}
                            className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all ${
                              s.Action.includes("*") 
                                ? "border-amber-200 bg-amber-50 text-amber-700 shadow-sm" 
                                : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                            }`}
                          >
                            <Shield className="h-3.5 w-3.5" /> Full Access (*)
                          </button>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-[11px] text-emerald-800">
                              <strong>Resource:</strong> Global <code>["*"]</code>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Actions</label>
                        <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${s.Action.includes("*") ? "opacity-30 pointer-events-none" : ""}`}>
                          {MODULE_ACTIONS.map((mod) => (
                            <div key={mod.module} className="space-y-2">
                              <h4 className="text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1 flex items-center justify-between">
                                {mod.module}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleAction(sIdx, `${mod.actions[0].id.split(":")[0]}:*`)}
                                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-all ${
                                      s.Action.includes(`${mod.actions[0].id.split(":")[0]}:*`)
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                    }`}
                                  >
                                    All
                                  </button>
                                  <span className="font-normal text-slate-400">({mod.actions.filter(a => s.Action.includes(a.id)).length})</span>
                                </div>
                              </h4>
                              <div className="space-y-1.5">
                                {mod.actions.map((act) => {
                                  const isChecked = s.Action.includes(act.id)
                                  return (
                                    <button
                                      key={act.id}
                                      type="button"
                                      onClick={() => toggleAction(sIdx, act.id)}
                                      className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-all ${
                                        isChecked 
                                          ? "border-emerald-200 bg-emerald-50/50 ring-1 ring-emerald-200" 
                                          : "border-transparent hover:bg-slate-100"
                                      }`}
                                    >
                                      <div className={`mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center transition-all ${
                                        isChecked ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
                                      }`}>
                                        {isChecked && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                                      </div>
                                      <div className="min-w-0">
                                        <p className={`text-[11px] font-bold leading-tight ${isChecked ? "text-emerald-900" : "text-slate-700"}`}>
                                          {act.id}
                                        </p>
                                        <p className="text-[10px] text-slate-400 leading-tight">
                                          {act.desc}
                                        </p>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                  {/* JSON Preview */}
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                    <p className="text-slate-500 mb-2 uppercase font-sans font-bold tracking-widest text-[9px] font-sans">Document Preview</p>
                    <pre>{JSON.stringify({ Version: "1.0", Statement: statements }, null, 2)}</pre>
                  </div>

                {/* Linked roles card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                      <Users className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Linked Roles ({linkedRoles.length})</h2>
                      <p className="text-xs text-slate-400">Roles that currently include this permission.</p>
                    </div>
                  </div>

                  {linkedRoles.length ? (
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                      {linkedRoles.map((r: any) => (
                        <button
                          key={r.ID_Role}
                          onClick={() => router.push(`/roles-permissions/roles/${r.ID_Role}`)}
                          type="button"
                          className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{asString(r.Name) || "—"}</p>
                              <p className="font-mono text-[10px] text-slate-400">{r.ID_Role}</p>
                            </div>
                            <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              r.Active
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-slate-100 border-slate-200 text-slate-400"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${r.Active ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {r.Active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {r.Description && (
                            <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">{asString(r.Description)}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
                      <Users className="mx-auto mb-1.5 h-6 w-6 text-slate-200" />
                      <p className="text-xs text-slate-400">No roles linked to this permission</p>
                    </div>
                  )}
                </div>
              </div> {/* End of max-w-5xl container */}
            </>
          )}
        </main>
      </div>
    </div>
  )
}