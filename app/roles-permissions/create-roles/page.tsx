"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, X, ArrowLeft, Users, Shield, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react"

import type { Permission, IAMDocument, IAMStatement } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"

type PermissionLite = {
  ID_Permission: string
  Name?: string | null
  Description?: string | null
  Document?: IAMDocument | null
  Active?: boolean | null
}

const MODULE_ACTIONS = [
  {
    module: "Jobs",
    actions: [
      { id: "job:read", label: "Full Read" },
      { id: "job:read_basics", label: "Read Basics" },
      { id: "job:create", label: "Create" },
      { id: "job:update", label: "Update" },
      { id: "job:delete", label: "Delete" },
    ]
  },
  {
    module: "Members",
    actions: [
      { id: "member:read", label: "Read" },
      { id: "member:create", label: "Create" },
      { id: "member:update", label: "Update" },
      { id: "member:delete", label: "Delete" },
    ]
  },
  {
    module: "Subcontractors",
    actions: [
      { id: "subcontractor:read", label: "Read" },
      { id: "subcontractor:create", label: "Create" },
      { id: "subcontractor:update", label: "Update" },
      { id: "subcontractor:delete", label: "Delete" },
    ]
  },
  {
    module: "Clients / Communities",
    actions: [
      { id: "client:read", label: "Read" },
      { id: "client:create", label: "Create" },
      { id: "client:update", label: "Update" },
      { id: "client:delete", label: "Delete" },
    ]
  },
  {
    module: "PMC (Parent Companies)",
    actions: [
      { id: "parent_mgmt_co:read", label: "Read" },
      { id: "parent_mgmt_co:create", label: "Create" },
      { id: "parent_mgmt_co:update", label: "Update" },
      { id: "parent_mgmt_co:delete", label: "Delete" },
    ]
  },
]

type PermissionListResponse =
  | { results: PermissionLite[]; total?: number; page?: number; limit?: number }
  | PermissionLite[]

const ITEMS_PER_PAGE = 20
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

  // Quick create panel
  const [quickOpen, setQuickOpen] = useState(false)
  const [qName, setQName] = useState("")
  const [qDesc, setQDesc] = useState("")
  const [qActive, setQActive] = useState(true)
  const [qStatements, setQStatements] = useState<IAMStatement[]>([{ Effect: "Allow", Action: [], Resource: ["*"] }])
  const [quickSubmitting, setQuickSubmitting] = useState(false)
  const [quickError, setQuickError] = useState<string | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  const fetchPermissions = async (pageToFetch: number, mode: "replace" | "append" = "replace") => {
    try {
      setPermLoading(true); setPermError(null)
      const res = await apiFetch(`/api/permissions?page=${pageToFetch}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch permissions (${res.status})`)
      const data = (await res.json()) as PermissionListResponse
      const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      const totalValue = Array.isArray(data) ? list.length : typeof data.total === "number" ? data.total : list.length
      setPermTotal(totalValue); setPermPage(pageToFetch)
      setPermissions((prev) => mode === "append" ? [...prev, ...list] : list)
    } catch (e: any) {
      setPermError(e?.message ?? "Failed to load permissions"); setPermissions([]); setPermTotal(0)
    } finally { setPermLoading(false) }
  }

  useEffect(() => { fetchPermissions(1, "replace") }, [])

  const filteredPermissions = useMemo(() => {
    const q = permSearch.trim().toLowerCase()
    if (!q) return permissions
    return permissions.filter((p) =>
      p.ID_Permission.toLowerCase().includes(q) ||
      asString(p.Name).toLowerCase().includes(q)
    )
  }, [permissions, permSearch])

  const canLoadMore = permissions.length < permTotal
  const togglePermission = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const removeSelected = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  const selectedPermissions = useMemo(() => permissions.filter((p) => selectedIds.has(p.ID_Permission)), [permissions, selectedIds])
  const canSubmit = useMemo(() => name.trim().length > 0 && selectedIds.size > 0, [name, selectedIds])

  const toggleQuickAction = (sIdx: number, actionId: string) => {
    const s = qStatements[sIdx]
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
    setQStatements(qStatements.map((stmt, i) => i === sIdx ? { ...stmt, Action: next } : stmt))
  }

  const quickCreatePermission = async () => {
    try {
      setQuickSubmitting(true); setQuickError(null)
      const doc: IAMDocument = { Version: "1.0", Statement: qStatements }
      const res = await apiFetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          Name: qName.trim(), 
          Description: qDesc.trim() || null, 
          Active: qActive,
          Document: doc
        }),
      })
      if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(body?.detail || `Failed to create permission (${res.status})`) }
      const created = await res.json() as any
      const perm: PermissionLite = { 
        ID_Permission: created?.ID_Permission, 
        Name: created?.Name, 
        Description: created?.Description, 
        Document: created?.Document,
        Active: created?.Active 
      }
      setPermissions((prev) => [perm, ...prev])
      setSelectedIds((prev) => new Set(prev).add(perm.ID_Permission))
      setQName(""); setQDesc(""); setQActive(true); setQStatements([{ Effect: "Allow", Action: [], Resource: ["*"] }]); setQuickOpen(false)
    } catch (e: any) {
      setQuickError(e?.message ?? "Failed to create permission")
    } finally { setQuickSubmitting(false) }
  }

  const createRoleAndLink = async () => {
    try {
      setSubmitting(true); setError(null)
      if (selectedIds.size === 0) throw new Error("Select at least one permission")
      const roleRes = await apiFetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Name: name.trim(), Description: description.trim() || null, Active: active }),
      })
      if (!roleRes.ok) { const body = await roleRes.json().catch(() => null); throw new Error(body?.detail || `Failed to create role (${roleRes.status})`) }
      const createdRole = await roleRes.json()
      const roleId = createdRole?.ID_Role
      if (!roleId) throw new Error("Role created but ID_Role was not returned")
      for (const permId of Array.from(selectedIds)) {
        const linkRes = await apiFetch("/api/permissions/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: permId, roleId }),
        })
        if (!linkRes.ok) { const body = await linkRes.json().catch(() => null); throw new Error(body?.detail || `Failed to link permission ${permId} (${linkRes.status})`) }
      }
      router.push("/roles-permissions")
    } catch (e: any) {
      setError(e?.message ?? "Failed to create role")
    } finally { setSubmitting(false) }
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Breadcrumb */}
          <button
            onClick={() => router.push("/roles-permissions")}
            className="mb-5 flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Roles & Permissions
          </button>

          {/* Page header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create Role</h1>
              <p className="text-sm text-slate-500">A role must include at least one permission.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* ── Role info card ───────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role Information</h2>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Project Manager" className="border-slate-200 bg-slate-50 focus:bg-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</label>
                  <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
                    <button onClick={() => setActive(true)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${active ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </button>
                    <button onClick={() => setActive(false)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${!active ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      <X className="h-3.5 w-3.5" /> Inactive
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description…" className="border-slate-200 bg-slate-50 focus:bg-white" />
                </div>
              </div>
            </div>

            {/* ── Permissions selector card ────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Select Permissions <span className="text-red-400">*</span></h2>
                    <p className="text-xs text-slate-400">Choose one or more permissions for this role.</p>
                  </div>
                </div>

                <button
                  onClick={() => setQuickOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Quick create permission
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${quickOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Quick create panel */}
              {quickOpen && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-800">New Permission</p>
                    <button onClick={() => setQuickOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-3 lg:grid-cols-2">
                       <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</label>
                          <Input value={qName} onChange={(e) => setQName(e.target.value)} placeholder="e.g. View Jobs" className="h-8 text-xs border-slate-200 bg-white" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</label>
                          <Input value={qDesc} onChange={(e) => setQDesc(e.target.value)} placeholder="Optional…" className="h-8 text-xs border-slate-200 bg-white" />
                       </div>
                    </div>

                    <div className="space-y-3">
                      {qStatements.map((qs, qsIdx) => (
                        <div key={qsIdx} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3 relative">
                           {qStatements.length > 1 && (
                             <button onClick={() => setQStatements(qStatements.filter((_, i) => i !== qsIdx))} className="absolute right-2 top-2 text-slate-300 hover:text-red-500">
                                <X className="h-3 w-3" />
                             </button>
                           )}
                           <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-bold uppercase text-slate-400">Effect:</span>
                                 <div className="flex rounded border border-slate-100 bg-slate-50 p-0.5">
                                    {["Allow", "Deny"].map(ef => (
                                      <button 
                                        key={ef} 
                                        onClick={() => setQStatements(qStatements.map((stmt, i) => i === qsIdx ? { ...stmt, Effect: ef as any } : stmt))}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${qs.Effect === ef ? (ef === "Allow" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "text-slate-400"}`}
                                      >
                                        {ef}
                                      </button>
                                    ))}
                                 </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleQuickAction(qsIdx, "*")}
                                className={`flex h-6 items-center gap-1 rounded border px-2 text-[10px] font-bold transition-all ${
                                  qs.Action.includes("*") 
                                    ? "border-amber-200 bg-amber-50 text-amber-700 shadow-sm" 
                                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                }`}
                              >
                                <Shield className="h-3.5 w-3.5" /> Full Access (*)
                              </button>
                           </div>

                           <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${qs.Action.includes("*") ? "opacity-30 pointer-events-none" : ""}`}>
                              {MODULE_ACTIONS.map(mod => (
                                <div key={mod.module} className="space-y-1.5 min-w-0">
                                   <div className="flex items-center justify-between border-b border-slate-50 pb-0.5">
                                      <p className="text-[9px] font-bold uppercase text-slate-600 truncate mr-2">{mod.module}</p>
                                      <button
                                        type="button"
                                        onClick={() => toggleQuickAction(qsIdx, `${mod.actions[0].id.split(":")[0]}:*`)}
                                        className={`rounded px-1.5 text-[8px] font-bold transition-all ${
                                          qs.Action.includes(`${mod.actions[0].id.split(":")[0]}:*`)
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                        }`}
                                      >
                                        All
                                      </button>
                                   </div>
                                   <div className="flex flex-wrap gap-1">
                                      {mod.actions.map(act => {
                                        const active = qs.Action.includes(act.id)
                                        return (
                                          <button
                                            key={act.id}
                                            onClick={() => toggleQuickAction(qsIdx, act.id)}
                                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all ${
                                              active ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                            }`}
                                          >
                                            {act.id.split(":")[1] || act.id}
                                          </button>
                                        )
                                      })}
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => setQStatements([...qStatements, { Effect: "Allow", Action: [], Resource: ["*"] }])}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add statement
                      </button>
                    </div>
                  </div>

                  {quickError && <p className="text-xs text-red-600">{quickError}</p>}

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setQuickOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                    <button
                      onClick={quickCreatePermission}
                      disabled={quickSubmitting || !qName.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" />
                      {quickSubmitting ? "Creating…" : "Create & Select"}
                    </button>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search permissions…"
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 focus:bg-white"
                  />
                  {permSearch && (
                    <button onClick={() => setPermSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-400">{permissions.length} of {permTotal} loaded</span>
              </div>

              {/* Table */}
              {permLoading ? (
                <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-400">Loading permissions…</p>
                </div>
              ) : permError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                  <p className="text-sm text-red-600">{permError}</p>
                  <button onClick={() => fetchPermissions(1, "replace")} className="mt-2 text-xs text-emerald-600 hover:underline">Retry</button>
                </div>
              ) : permissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-400">No permissions available. Use "Quick create permission".</p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="w-10 px-4 py-2.5" />
                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Permission</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Policy Summary</th>
                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPermissions.map((p) => {
                          const checked = selectedIds.has(p.ID_Permission)
                          return (
                            <tr
                              key={p.ID_Permission}
                              onClick={() => togglePermission(p.ID_Permission)}
                              className={`cursor-pointer transition-colors ${checked ? "bg-emerald-50/60 hover:bg-emerald-50/80" : "hover:bg-slate-50/80"}`}
                            >
                              <td className="px-4 py-2.5">
                                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                                  checked ? "bg-emerald-600 border-emerald-600" : "border-slate-300"
                                }`}>
                                  {checked && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="text-xs font-semibold text-slate-700">{asString(p.Name) || p.ID_Permission}</div>
                                {p.Description && <div className="text-[11px] text-slate-400 line-clamp-1">{asString(p.Description)}</div>}
                              </td>
                              <td className="px-4 py-2.5"><PolicySummary document={p.Document} /></td>
                              <td className="px-4 py-2.5 text-center">
                                {p.Active ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-400">Inactive</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {canLoadMore && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => fetchPermissions(permPage + 1, "append")}
                        disabled={permLoading}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5" /> Load more
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Selected summary */}
              {selectedPermissions.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-emerald-800">{selectedIds.size} permission{selectedIds.size !== 1 ? "s" : ""} selected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPermissions.map((p) => (
                      <span
                        key={p.ID_Permission}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-emerald-200 pl-2.5 pr-1.5 py-0.5 text-[11px] font-semibold text-emerald-800"
                      >
                        {asString(p.Name) || p.ID_Permission}
                        <button onClick={(e) => { e.stopPropagation(); removeSelected(p.ID_Permission) }} className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-emerald-100">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => router.push("/roles-permissions")} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={createRoleAndLink}
                disabled={!canSubmit || submitting}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Users className="h-4 w-4" />
                {submitting ? "Creating…" : "Create Role"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}