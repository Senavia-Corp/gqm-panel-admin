"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Shield, CheckCircle2, X, AlertCircle, Plus } from "lucide-react"

import type { IAMDocument, IAMStatement } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"
import { MODULE_ACTIONS } from "@/lib/permissions-modules"



export default function CreatePermissionPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [active, setActive] = useState(true)
  const [statements, setStatements] = useState<IAMStatement[]>([
    { Effect: "Allow", Action: [], Resource: ["*"] }
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && 
           statements.length > 0 && 
           statements.every(s => s.Action.length > 0)
  }, [name, statements])

  const addStatement = () => {
    setStatements([...statements, { Effect: "Allow", Action: [], Resource: ["*"] }])
  }

  const removeStatement = (idx: number) => {
    setStatements(statements.filter((_, i) => i !== idx))
  }

  const updateStatement = (idx: number, updates: Partial<IAMStatement>) => {
    setStatements(statements.map((s, i) => i === idx ? { ...s, ...updates } : s))
  }

  const toggleAction = (idx: number, actionId: string) => {
    const s = statements[idx]
    let next: string[] = [...s.Action]

    if (actionId === "*") {
      next = next.includes("*") ? [] : ["*"]
    } else {
      // Remove global wildcard if active
      next = next.filter(a => a !== "*")
      
      const mod = actionId.split(":")[0]
      const isModWildcard = actionId.endsWith(":*")

      if (isModWildcard) {
        // Toggling module wildcard: remove all other actions for this module first
        if (next.includes(actionId)) {
          next = next.filter(a => a !== actionId)
        } else {
          next = [...next.filter(a => !a.startsWith(`${mod}:`)), actionId]
        }
      } else {
        // Toggling specific action: remove module wildcard if active
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

  const onSubmit = async () => {
    try {
      setSubmitting(true); setError(null)
      const doc: IAMDocument = { Version: "1.0", Statement: statements }
      const res = await apiFetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          Name: name.trim(), 
          Description: description.trim() || null, 
          Active: active,
          Document: doc
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `Failed to create permission (${res.status})`)
      }
      router.push("/roles-permissions")
    } catch (e: any) {
      setError(e?.message ?? "Failed to create permission")
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
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Roles & Permissions
          </button>

          {/* Page header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Shield className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create Permission</h1>
              <p className="text-sm text-slate-500">Define IAM-style policies for this permission.</p>
            </div>
          </div>

          <div className="max-w-5xl space-y-4">
            {/* Form card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. View Jobs"
                  className="border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Policy Builder */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
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
                            <strong>Note:</strong> Resource is currently fixed to <code>["*"]</code> global.
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

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description…"
                  className="border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Active status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</label>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
                  <button
                    onClick={() => setActive(true)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      active ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active
                  </button>
                  <button
                    onClick={() => setActive(false)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      !active ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" /> Inactive
                  </button>
                </div>
              </div>

              {/* Live JSON Preview (Optional but helpful for testing) */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                <p className="text-slate-500 mb-2 uppercase font-sans font-bold tracking-widest text-[9px]">Document Preview</p>
                <pre>{JSON.stringify({ Version: "1.0", Statement: statements }, null, 2)}</pre>
              </div>
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
                onClick={onSubmit}
                disabled={!canSubmit || submitting}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Shield className="h-4 w-4" />
                {submitting ? "Creating…" : "Create Permission"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}