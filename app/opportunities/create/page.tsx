"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "@/components/ui/use-toast"
import {
  Megaphone, ArrowLeft, Loader2, Save, Briefcase,
  Info, Settings, Search, X, ChevronLeft, ChevronRight, Zap,
} from "lucide-react"
import type { OpportunitySkill } from "@/lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 300): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1.5">{children}</label>
}

// ─── Job picker modal ─────────────────────────────────────────────────────────

import { createPortal } from "react-dom"

function JobPickerModal({ open, onClose, onSelect }: {
  open: boolean
  onClose: () => void
  onSelect: (job: { ID_Jobs: string; Project_Name?: string; Job_type?: string }) => void
}) {
  const LIMIT = 10
  const [query, setQuery] = useState("")
  const dQ = useDebounce(query, 300)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  useEffect(() => { if (open) { setQuery(""); setPage(1) } }, [open])
  useEffect(() => { setPage(1) }, [dQ])

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (dQ) params.set("search", dQ)
    apiFetch(`/api/jobs?${params}`, { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { setRows(d.results ?? []); setTotal(Number(d.total ?? 0)) })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [open, dQ, page])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "calc(100vh - 48px)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Briefcase className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Job</h2>
              <p className="text-xs text-slate-400 mt-0.5">Link this opportunity to a job</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by job ID, project name…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center"><p className="text-sm text-slate-400">No jobs found</p></div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {rows.map((job) => (
                <li key={job.ID_Jobs}>
                  <button
                    type="button"
                    onClick={() => { onSelect(job); onClose() }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Briefcase className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{job.Project_Name || job.Project_name || job.ID_Jobs}</p>
                      {job.Project_location && <p className="text-xs text-slate-400 truncate">{job.Project_location}</p>}
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">{job.ID_Jobs}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
          <p className="text-xs text-slate-400">Showing <span className="font-semibold text-slate-600">{rows.length}</span> of <span className="font-semibold text-slate-600">{total}</span></p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))} disabled={page <= 1 || loading} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))} disabled={page >= totalPages || loading} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== "undefined" ? document.body : (null as any),
  )
}

// ─── Priority options ─────────────────────────────────────────────────────────

const PRIORITIES = ["Low", "Medium", "High", "Critical"]

// ─── Main page ────────────────────────────────────────────────────────────────

function CreateOpportunityContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const initialJobId = searchParams.get("job_id")
  
  const [saving, setSaving] = useState(false)

  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [state, setState] = useState<boolean>(true)
  const [priority, setPriority] = useState("Medium")
  const [startDate, setStartDate] = useState("")
  const [linkedJob, setLinkedJob] = useState<{ ID_Jobs: string; Project_Name?: string; Project_name?: string } | null>(null)
  const [jobPickerOpen, setJobPickerOpen] = useState(false)

  // Skills
  const [availableSkills, setAvailableSkills] = useState<OpportunitySkill[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [skillSearch, setSkillSearch] = useState("")

  useEffect(() => {
    if (initialJobId && !linkedJob) {
      apiFetch(`/api/jobs/${initialJobId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) setLinkedJob(d)
        })
        .catch(() => {})
    }
  }, [initialJobId, linkedJob])

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    apiFetch("/api/skills")
      .then((r) => r.json())
      .then((d) => setAvailableSkills(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {})
  }, [router])

  const filteredSkills = availableSkills.filter((s) => {
    const q = skillSearch.toLowerCase()
    return (s.Skill_name ?? "").toLowerCase().includes(q) || (s.Division_trade ?? "").toLowerCase().includes(q)
  })

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) {
      toast({ title: "Required", description: "Project name is required.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const body: Record<string, any> = {
        Project_name: projectName.trim(),
        Description: description.trim() || null,
        State: state,
        Priority: priority,
        Start_Date: startDate ? `${startDate}T00:00:00` : null,
        ID_Jobs: linkedJob?.ID_Jobs ?? null,
      }

      const res = await apiFetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail || "Failed to create opportunity")
      }
      const created = await res.json()
      const oppId = created.ID_Opportunities

      // Link selected skills
      await Promise.allSettled(
        selectedSkillIds.map((skillId) =>
          apiFetch(`/api/opportunities/${oppId}/skills/${skillId}`, { method: "POST" })
        )
      )

      toast({ title: "Created", description: "Opportunity created successfully." })
      if (returnTo) {
        router.push(`/opportunities/${oppId}?returnTo=${encodeURIComponent(returnTo)}`)
      } else {
        router.push(`/opportunities/${oppId}`)
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to create", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => returnTo ? router.push(returnTo) : router.back()} className="h-8 w-8 flex-shrink-0 rounded-xl text-slate-400 hover:text-slate-700">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-sm sm:flex">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-black text-slate-900 sm:text-2xl">New Opportunity</h1>
                  <p className="hidden text-xs text-slate-500 sm:block">Create a job posting for subcontractors</p>
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="ml-2 flex-shrink-0 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden sm:inline">{saving ? "Creating…" : "Create Opportunity"}</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4 p-4 sm:space-y-5 sm:p-6">

            {/* Basic Info */}
            <SectionCard icon={Info} title="Basic Info">
              <div>
                <FieldLabel>Project Name *</FieldLabel>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Electrical Renovation – Building A"
                  className="border-slate-200"
                />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the scope of work, requirements, expectations…"
                  rows={4}
                  className="border-slate-200 resize-none"
                />
              </div>
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={Settings} title="Settings">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          priority === p
                            ? "border-violet-400 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setState((v) => !v)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${
                      state
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    <Zap className={`h-4 w-4 ${state ? "fill-emerald-400 text-emerald-500" : ""}`} />
                    {state ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>Start Date</FieldLabel>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border-slate-200 sm:max-w-[220px]"
                />
              </div>
            </SectionCard>

            {/* Job link */}
            <SectionCard icon={Briefcase} title="Linked Job">
              {linkedJob ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{linkedJob.Project_Name || linkedJob.Project_name || linkedJob.ID_Jobs}</p>
                    <p className="font-mono text-xs text-slate-500">{linkedJob.ID_Jobs}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLinkedJob(null)} className="h-7 text-xs text-slate-400 hover:text-red-500 gap-1">
                    <X className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setJobPickerOpen(true)}
                  className="w-full flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Select a job to link…
                </button>
              )}
            </SectionCard>

            {/* Skills */}
            <SectionCard icon={Zap} title="Required Skills">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter skills…"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
              {selectedSkillIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkillIds.map((id) => {
                    const skill = availableSkills.find((s) => s.ID_Skill === id)
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        {skill?.Skill_name ?? id}
                        <button type="button" onClick={() => toggleSkill(id)} className="hover:text-violet-900">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                {filteredSkills.map((skill) => {
                  const selected = selectedSkillIds.includes(skill.ID_Skill)
                  return (
                    <button
                      key={skill.ID_Skill}
                      type="button"
                      onClick={() => toggleSkill(skill.ID_Skill)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${selected ? "bg-violet-50" : "hover:bg-slate-50"}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{skill.Skill_name}</p>
                        {skill.Division_trade && <p className="text-xs text-slate-500">{skill.Division_trade}</p>}
                      </div>
                      <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? "border-violet-500 bg-violet-500" : "border-slate-300"}`}>
                        {selected && <span className="text-white text-[9px] font-bold">✓</span>}
                      </div>
                    </button>
                  )
                })}
                {filteredSkills.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No skills found</p>
                )}
              </div>
            </SectionCard>

          </form>
        </main>
      </div>

      <JobPickerModal open={jobPickerOpen} onClose={() => setJobPickerOpen(false)} onSelect={setLinkedJob} />
    </div>
  )
}

export default function CreateOpportunityPage() {
  return (
    <Suspense>
      <CreateOpportunityContent />
    </Suspense>
  )
}
