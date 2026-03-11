"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Shield, CheckCircle2, X, AlertCircle } from "lucide-react"

type ActionType = "View" | "Create" | "Edit" | "Delete"
type ServiceType = "Job" | "Subcontractor" | "GQM_Member" | "Technician" | "Client" | "Dashboard"

const ACTIONS: ActionType[] = ["View", "Create", "Edit", "Delete"]
const SERVICES: ServiceType[] = ["Job", "Subcontractor", "GQM_Member", "Technician", "Client", "Dashboard"]

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

export default function CreatePermissionPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [active, setActive] = useState(true)
  const [action, setAction] = useState<ActionType>("View")
  const [service, setService] = useState<ServiceType>("Job")

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  const canSubmit = useMemo(() => name.trim().length > 0 && Boolean(action) && Boolean(service), [name, action, service])

  const onSubmit = async () => {
    try {
      setSubmitting(true); setError(null)
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Name: name.trim(), Description: description.trim() || null, Active: active, Action: action, Service_Associated: service }),
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
        <TopBar user={user} />

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
              <p className="text-sm text-slate-500">Define what action is allowed for which service.</p>
            </div>
          </div>

          <div className="max-w-2xl space-y-4">
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

              {/* Action + Service */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Action <span className="text-red-400">*</span>
                  </label>
                  <Select value={action} onValueChange={(v: any) => setAction(v)}>
                    <SelectTrigger className="border-slate-200 bg-slate-50">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Service <span className="text-red-400">*</span>
                  </label>
                  <Select value={service} onValueChange={(v: any) => setService(v)}>
                    <SelectTrigger className="border-slate-200 bg-slate-50">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((s) => (
                        <SelectItem key={s} value={s}>{s === "GQM_Member" ? "GQM Member" : s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              {/* Live preview */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-xs text-slate-400 mr-1">Preview:</span>
                {action && (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ACTION_COLORS[action]}`}>
                    {action}
                  </span>
                )}
                {service && (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${SERVICE_COLORS[service] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    {service === "GQM_Member" ? "GQM Member" : service}
                  </span>
                )}
                {active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                  </span>
                )}
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