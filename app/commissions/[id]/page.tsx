"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar }   from "@/components/organisms/Sidebar"
import { TopBar }    from "@/components/organisms/TopBar"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  ArrowLeft, BadgeDollarSign, Plus, Trash2, Loader2, AlertCircle,
  RefreshCw, ChevronDown, ChevronRight as ChevronRightIcon, Pencil,
  Check, X, Briefcase, Calendar, DollarSign, Hash, Layers, Save, Search, Users,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionDetail = {
  ID_ComDetail: string
  Factor:       number | null
  Sell_Mgmt:    number | null
  ID_Jobs:      string | null
  ID_ComGroup:  string | null
  job?: {
    ID_Jobs:              string
    Job_type:             string | null
    Gqm_premium_in_money: number | null
    Gqm_target_return:    number | null
    ID_Client:            string | null
  } | null
}

type CommissionGroup = {
  ID_ComGroup:   string
  Jobs_type:     string | null
  Jobs_year:     number | null
  Rol:           string | null
  Total_detail:  number | null
  ID_Commission: string | null
  comdetails:    CommissionDetail[]
}

type Commission = {
  ID_Commission:      string
  Month:              string | null
  Year:               number | null
  Total_commission:   number | null
  Total_margin:       number | null
  Total_reimbursment: number | null
  ID_Member:          string | null
  member?: { ID_Member: string; Member_Name: string | null } | null
  comgroups: CommissionGroup[]
}

type JobOption = {
  ID_Jobs:              string
  Project_name:         string | null
  Job_type:             string | null
  Job_status:           string | null
  Gqm_premium_in_money: number | null
  Gqm_target_return:    number | null
}

type MemberOption = {
  ID_Member:   string
  Member_Name: string | null
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  "JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER",
]

const JOB_TYPES = ["QID", "PTL", "PAR"]
const ROLES     = ["Acc Rep Selling", "Mgmt Member"]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - 2 + i))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"

function fmt(n: number | null | undefined): string {
  if (n == null) return "—"
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function groupLabel(g: CommissionGroup) {
  return `${g.Jobs_year ?? "?"} ${g.Jobs_type ?? "?"} – ${g.Rol ?? "?"}`
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}{required && <span className="ml-0.5 text-red-400">*</span>}
    </p>
  )
}

// ─── Inline editable text/number ──────────────────────────────────────────────

function InlineEdit({ value, type = "text", onSave }: {
  value: string; type?: "text" | "number"
  onSave: (v: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)

  const commit = async () => {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft); setEditing(false) } finally { setSaving(false) }
  }

  if (!editing) return (
    <div className="group flex items-center gap-2">
      <span className="text-sm text-slate-700">{value || <span className="italic text-slate-400">—</span>}</span>
      <button onClick={() => { setDraft(value); setEditing(true) }} className="invisible rounded p-0.5 text-slate-400 hover:text-slate-600 group-hover:visible">
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )

  return (
    <div className="flex items-center gap-1.5">
      <Input autoFocus type={type} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false) } }}
        className={`h-7 w-32 text-xs ${inputCls}`} disabled={saving} />
      <button onClick={commit} disabled={saving} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button onClick={() => { setDraft(value); setEditing(false) }} disabled={saving} className="rounded p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Inline select edit ────────────────────────────────────────────────────────

function InlineSelectEdit({ value, options, onSave }: {
  value: string; options: string[]
  onSave: (v: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)

  const commit = async () => {
    setSaving(true)
    try { await onSave(draft); setEditing(false) } finally { setSaving(false) }
  }

  if (!editing) return (
    <div className="group flex items-center gap-2">
      <span className="text-sm text-slate-700">{value || <span className="italic text-slate-400">—</span>}</span>
      <button onClick={() => setEditing(true)} className="invisible rounded p-0.5 text-slate-400 hover:text-slate-600 group-hover:visible">
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )

  return (
    <div className="flex items-center gap-1.5">
      <Select value={draft} onValueChange={setDraft}>
        <SelectTrigger className="h-7 w-40 text-xs border-slate-200 bg-slate-50"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
      <button onClick={commit} disabled={saving} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button onClick={() => setEditing(false)} disabled={saving} className="rounded p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Add Group Modal ──────────────────────────────────────────────────────────

function AddGroupModal({ open, onOpenChange, commissionId, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void
  commissionId: string; onCreated: () => void
}) {
  const [jobType, setJobType] = useState("")
  const [year,    setYear]    = useState("")
  const [rol,     setRol]     = useState("")
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const reset = () => { setJobType(""); setYear(""); setRol(""); setError(null) }

  const handleCreate = async () => {
    if (!jobType || !year || !rol) { setError("All fields are required."); return }
    setSaving(true); setError(null)
    try {
      const res = await apiFetch("/api/commission_group", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Jobs_type: jobType, Jobs_year: parseInt(year), Rol: rol, ID_Commission: commissionId }),
        cache: "no-store",
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any)?.detail ?? `Error ${res.status}`) }
      reset(); onOpenChange(false); onCreated()
    } catch (e: any) { setError(e?.message ?? "Failed to create group") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="rounded-2xl border-slate-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Layers className="h-5 w-5 text-emerald-600" /> Add Commission Group
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Define the job type, year and member role for this group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <FieldLabel required>Job Type</FieldLabel>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="QID / PTL / PAR" /></SelectTrigger>
              <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Jobs Year</FieldLabel>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="Select year…" /></SelectTrigger>
              <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Member Role in Jobs</FieldLabel>
            <Select value={rol} onValueChange={setRol}>
              <SelectTrigger className="border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="Select role…" /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false) }} disabled={saving} className="text-xs border-slate-200">Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={saving || !jobType || !year || !rol} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {saving ? "Creating…" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Detail Modal ─────────────────────────────────────────────────────────
// Member is selected inside this modal; jobs are filtered by selected member + group filters

function AddDetailModal({ open, onOpenChange, group, commission, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void
  group: CommissionGroup; commission: Commission; onCreated: () => void
}) {
  // Member selection
  const [members,        setMembers]        = useState<MemberOption[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberSearch,   setMemberSearch]   = useState("")
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)

  // Job selection
  const [jobs,      setJobs]      = useState<JobOption[]>([])
  const [loadingJ,  setLoadingJ]  = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [selected,  setSelected]  = useState<JobOption | null>(null)

  // Factor
  const [factor,  setFactor]  = useState("")
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Load members once on open
  useEffect(() => {
    if (!open) return
    setLoadingMembers(true)
    apiFetch("/api/members/table?page=1&limit=100", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMembers(d.results ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false))
  }, [open])

  // Load jobs whenever member changes
  useEffect(() => {
    if (!open || !selectedMember) { setJobs([]); return }
    setLoadingJ(true); setJobsError(null); setSelected(null)
    const params = new URLSearchParams({
      member_id: selectedMember.ID_Member,
      rol:       group.Rol       ?? "",
      type:      group.Jobs_type ?? "",
      year:      String(group.Jobs_year ?? ""),
    })
    if (commission.Month) params.set("month", commission.Month)

    apiFetch(`/api/jobs/by-member-role?${params.toString()}`, { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => {
        const list    = Array.isArray(d) ? d : (d.results ?? [])
        const usedIds = new Set(group.comdetails.map(cd => cd.ID_Jobs))
        setJobs(list.filter((j: JobOption) => !usedIds.has(j.ID_Jobs)))
      })
      .catch(e => setJobsError(e?.message ?? "Failed to load jobs"))
      .finally(() => setLoadingJ(false))
  }, [open, selectedMember, group, commission.Month])

  const reset = () => {
    setSelectedMember(null); setMemberSearch(""); setJobs([])
    setSelected(null); setFactor(""); setError(null)
  }

  const handleCreate = async () => {
    if (!selected) { setError("Please select a job."); return }
    const f = parseFloat(factor)
    if (!factor || isNaN(f) || f <= 0) { setError("Please enter a valid factor (e.g. 0.054)."); return }
    setSaving(true); setError(null)
    try {
      const res = await apiFetch("/api/commission_detail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Factor: f, ID_Jobs: selected.ID_Jobs, ID_ComGroup: group.ID_ComGroup }),
        cache: "no-store",
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any)?.detail ?? `Error ${res.status}`) }
      reset(); onOpenChange(false); onCreated()
    } catch (e: any) { setError(e?.message ?? "Failed to create detail") }
    finally { setSaving(false) }
  }

  const filteredMembers = memberSearch.trim()
    ? members.filter(m =>
        (m.Member_Name ?? "").toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.ID_Member.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : members

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="rounded-2xl border-slate-200 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Briefcase className="h-5 w-5 text-emerald-600" /> Add Job to Group
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Select the member whose jobs you want to add, then pick a job and set the factor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* ── Step 1: Member ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
              <p className="text-xs font-semibold text-slate-700">Select Member</p>
              {selectedMember && (
                <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {selectedMember.Member_Name ?? selectedMember.ID_Member}
                </span>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search members…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                className={`pl-9 text-sm ${inputCls}`} />
            </div>

            {loadingMembers ? (
              <div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
              </div>
            ) : (
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <p className="py-3 text-center text-sm text-slate-400">No members found</p>
                ) : filteredMembers.map(m => {
                  const isSel    = selectedMember?.ID_Member === m.ID_Member
                  const initials = (m.Member_Name ?? m.ID_Member)
                    .split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("") || "??"
                  return (
                    <button key={m.ID_Member} onClick={() => setSelectedMember(isSel ? null : m)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        isSel ? "border-emerald-300 bg-emerald-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}>
                      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${isSel ? "bg-emerald-600" : "bg-slate-400"}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{m.Member_Name ?? "Unnamed"}</p>
                        <p className="font-mono text-[11px] text-slate-400">{m.ID_Member}</p>
                      </div>
                      {isSel && <span className="ml-auto text-[10px] font-bold text-emerald-600">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Step 2: Job ─────────────────────────────────────────────── */}
          <div className={`rounded-xl border p-4 transition-colors ${selectedMember ? "border-slate-200" : "border-slate-100 opacity-50"}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${selectedMember ? "bg-emerald-600" : "bg-slate-300"}`}>2</span>
              <p className="text-xs font-semibold text-slate-700">Select Job</p>
              {selected && (
                <span className="ml-auto rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {selected.Project_name ?? selected.ID_Jobs}
                </span>
              )}
            </div>

            {!selectedMember ? (
              <p className="py-4 text-center text-sm text-slate-400">Select a member first to see available jobs</p>
            ) : loadingJ ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
              </div>
            ) : jobsError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{jobsError}</div>
            ) : jobs.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No available jobs for this member with the group's filters
              </p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {jobs.map(job => {
                  const isSel = selected?.ID_Jobs === job.ID_Jobs
                  return (
                    <button key={job.ID_Jobs} onClick={() => setSelected(isSel ? null : job)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        isSel ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{job.Project_name ?? job.ID_Jobs}</p>
                          <p className="font-mono text-[11px] text-slate-400">{job.ID_Jobs}</p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1">
                          {job.Gqm_premium_in_money != null && (
                            <span className="text-xs font-semibold text-slate-600">Premium: {fmt(job.Gqm_premium_in_money)}</span>
                          )}
                          {job.Job_status && (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              {job.Job_status}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Step 3: Factor ──────────────────────────────────────────── */}
          <div className={`rounded-xl border p-4 transition-colors ${selected ? "border-slate-200" : "border-slate-100 opacity-50"}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${selected ? "bg-emerald-600" : "bg-slate-300"}`}>3</span>
              <p className="text-xs font-semibold text-slate-700">Set Factor</p>
            </div>
            <Input
              type="number" step="0.001" min="0"
              value={factor}
              onChange={e => setFactor(e.target.value)}
              placeholder="e.g. 0.054"
              className={inputCls}
              disabled={!selected}
            />
            {selected?.Gqm_premium_in_money != null && factor && !isNaN(parseFloat(factor)) && (
              <p className="mt-1.5 text-xs text-slate-500">
                Estimated total:{" "}
                <span className="font-semibold text-emerald-700">
                  {fmt(parseFloat(factor) * selected.Gqm_premium_in_money)}
                </span>
                {" "}(factor × premium)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false) }} disabled={saving} className="text-xs border-slate-200">Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={saving || !selected || !factor} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {saving ? "Adding…" : "Add to Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ group, commission, onUpdated, onDeleted }: {
  group: CommissionGroup; commission: Commission
  onUpdated: () => void; onDeleted: () => void
}) {
  const [expanded,        setExpanded]        = useState(true)
  const [addDetailOpen,   setAddDetailOpen]   = useState(false)
  const [deleteDetailId,  setDeleteDetailId]  = useState<string | null>(null)
  const [deletingDetail,  setDeletingDetail]  = useState(false)
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false)
  const [deletingGroup,   setDeletingGroup]   = useState(false)

  console.log("Grupo:",group);
  console.log("Comisión:",commission);

  const patchGroup = async (field: string, raw: string) => {
    const value = field === "Jobs_year" ? parseInt(raw) : raw
    const res = await apiFetch(`/api/commission_group?id=${encodeURIComponent(group.ID_ComGroup)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }), cache: "no-store",
    })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    onUpdated()
  }

  const patchDetail = async (detailId: string, raw: string) => {
    const f = parseFloat(raw)
    if (isNaN(f)) throw new Error("Invalid factor")
    const res = await apiFetch(`/api/commission_detail?id=${encodeURIComponent(detailId)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Factor: f }), cache: "no-store",
    })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    onUpdated()
  }

  const confirmDeleteDetail = async () => {
    if (!deleteDetailId) return
    setDeletingDetail(true)
    try {
      const res = await apiFetch(`/api/commission_detail?id=${encodeURIComponent(deleteDetailId)}`, {
        method: "DELETE", cache: "no-store",
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setDeleteDetailId(null); onUpdated()
    } finally { setDeletingDetail(false) }
  }

  const confirmDeleteGroup = async () => {
    setDeletingGroup(true)
    try {
      const res = await apiFetch(`/api/commission_group?id=${encodeURIComponent(group.ID_ComGroup)}`, {
        method: "DELETE", cache: "no-store",
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setDeleteGroupOpen(false); onDeleted()
    } finally { setDeletingGroup(false) }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 text-left">
            {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRightIcon className="h-4 w-4 text-slate-400" />}
            <div>
              <p className="text-sm font-bold text-slate-800">{groupLabel(group)}</p>
              <p className="font-mono text-[11px] text-slate-400">{group.ID_ComGroup}</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Group Total</p>
              <p className="text-sm font-bold text-emerald-700">{fmt(group.Total_detail)}</p>
            </div>
            <button onClick={() => setAddDetailOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Job
            </button>
            <button onClick={() => setDeleteGroupOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Group meta */}
        {expanded && (
          <div className="grid grid-cols-3 gap-4 border-b border-slate-100 bg-white px-5 py-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Job Type</p>
              <InlineSelectEdit value={group.Jobs_type ?? ""} options={JOB_TYPES} onSave={v => patchGroup("Jobs_type", v)} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Year</p>
              <InlineEdit value={String(group.Jobs_year ?? "")} type="number" onSave={v => patchGroup("Jobs_year", v)} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Role</p>
              <InlineSelectEdit value={group.Rol ?? ""} options={ROLES} onSave={v => patchGroup("Rol", v)} />
            </div>
          </div>
        )}

        {/* Details */}
        {expanded && (
          <div className="divide-y divide-slate-50">
            {group.comdetails.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Briefcase className="h-6 w-6 text-slate-300" />
                <p className="text-sm text-slate-500">No jobs added yet</p>
                <button onClick={() => setAddDetailOpen(true)} className="text-xs font-medium text-emerald-600 hover:underline">Add first job</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 bg-slate-50/80 px-5 py-2">
                  {["Job", "Premium (GQM)", "Factor", "Total (Sell/Mgmt)", ""].map((h, i) => (
                    <span key={i} className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</span>
                  ))}
                </div>

                {group.comdetails.map(detail => (
                  <div key={detail.ID_ComDetail}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{detail.job?.ID_Jobs ?? detail.ID_Jobs ?? "—"}</p>
                      {detail.job?.Job_type && <span className="text-[11px] font-semibold text-slate-500">{detail.job.Job_type}</span>}
                    </div>
                    <span className="text-sm text-slate-600">
                      {detail.job?.Gqm_premium_in_money != null ? fmt(detail.job.Gqm_premium_in_money) : "—"}
                    </span>
                    <InlineEdit value={detail.Factor != null ? String(detail.Factor) : ""} type="number" onSave={v => patchDetail(detail.ID_ComDetail, v)} />
                    <span className="font-mono text-sm font-bold text-emerald-700">{fmt(detail.Sell_Mgmt)}</span>
                    <button onClick={() => setDeleteDetailId(detail.ID_ComDetail)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-end border-t border-slate-100 bg-emerald-50/60 px-5 py-2.5">
                  <span className="mr-2 text-xs font-semibold text-slate-500">Group total:</span>
                  <span className="font-mono text-sm font-bold text-emerald-700">{fmt(group.Total_detail)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AddDetailModal open={addDetailOpen} onOpenChange={setAddDetailOpen} group={group} commission={commission} onCreated={onUpdated} />

      <AlertDialog open={!!deleteDetailId} onOpenChange={(o) => !o && setDeleteDetailId(null)}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Job from Group?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">This will remove the detail and recalculate all totals.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDetail} className="text-xs border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDetail} disabled={deletingDetail} className="bg-red-600 hover:bg-red-700 text-xs">
              {deletingDetail ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteGroupOpen} onOpenChange={setDeleteGroupOpen}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Deleting <span className="font-semibold text-slate-700">{groupLabel(group)}</span> will also remove all its job details and recalculate the commission total.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingGroup} className="text-xs border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup} disabled={deletingGroup} className="bg-red-600 hover:bg-red-700 text-xs">
              {deletingGroup ? "Deleting…" : "Delete Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function CommissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [user,         setUser]         = useState<any>(null)
  const [commission,   setCommission]   = useState<Commission | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [addGroupOpen, setAddGroupOpen] = useState(false)

  // Header editing
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm,    setHeaderForm]    = useState({ Month: "", Year: "" })
  const [savingHeader,  setSavingHeader]  = useState(false)

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  const fetchCommission = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch(`/api/commission?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: Commission = await res.json()
      setCommission(data)
      setHeaderForm({ Month: data.Month ?? "", Year: String(data.Year ?? "") })
    } catch (e: any) { setError(e?.message ?? "Failed to load commission") }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { if (user) fetchCommission() }, [user, fetchCommission])

  const saveHeader = async () => {
    setSavingHeader(true)
    try {
      const res = await apiFetch(`/api/commission?id=${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Month: headerForm.Month, Year: parseInt(headerForm.Year) }),
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setEditingHeader(false); fetchCommission()
    } finally { setSavingHeader(false) }
  }

  if (!user) return null

  if (loading) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar /><div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {[16, 32, 56, 56].map((h, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white" style={{ height: `${h * 4}px` }} />
          ))}
        </main>
      </div>
    </div>
  )

  if (!commission) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar /><div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 p-6">
          <button onClick={() => router.push("/commissions")} className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><h2 className="font-semibold text-red-800">Could not load commission</h2></div>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <Button onClick={fetchCommission} className="mt-4 gap-2" variant="outline"><RefreshCw className="h-4 w-4" /> Retry</Button>
          </div>
        </main>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/commissions")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                    <BadgeDollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">
                      {commission.Month ? `${commission.Month.charAt(0) + commission.Month.slice(1).toLowerCase()} ${commission.Year}` : commission.ID_Commission}
                    </h1>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">{commission.ID_Commission}</p>
                  </div>
                </div>
              </div>
              <Button onClick={() => setAddGroupOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-sm">
                <Plus className="h-4 w-4" /> Add Group
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-3">

              {/* Groups */}
              <div className="xl:col-span-3 lg:col-span-2 space-y-4">
                {commission.comgroups.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
                    <Layers className="h-10 w-10 text-slate-300" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-600">No groups yet</p>
                      <p className="mt-1 text-sm text-slate-400">Add a commission group to start recording jobs</p>
                    </div>
                    <Button onClick={() => setAddGroupOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4" /> Add First Group
                    </Button>
                  </div>
                ) : commission.comgroups.map(group => (
                  <GroupCard key={group.ID_ComGroup} group={group} commission={commission}
                    onUpdated={fetchCommission} onDeleted={fetchCommission} />
                ))}
              </div>

              {/* Summary sidebar */}
              <div className="space-y-4">
                <SectionCard>
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Commission Summary</p>
                    {!editingHeader ? (
                      <button onClick={() => setEditingHeader(true)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={saveHeader} disabled={savingHeader}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                          {savingHeader ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                        </button>
                        <button onClick={() => { setEditingHeader(false); setHeaderForm({ Month: commission.Month ?? "", Year: String(commission.Year ?? "") }) }}
                          className="text-[11px] text-slate-400 hover:text-slate-600">Cancel</button>
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-slate-50 p-5">
                    <div className="flex items-center justify-between py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Hash className="h-3 w-3" /> ID</p>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">{commission.ID_Commission}</span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Month</p>
                      {editingHeader ? (
                        <Select value={headerForm.Month} onValueChange={v => setHeaderForm(p => ({ ...p, Month: v }))}>
                          <SelectTrigger className="h-7 w-32 text-xs border-slate-200 bg-slate-50"><SelectValue /></SelectTrigger>
                          <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium text-slate-700">
                          {commission.Month ? commission.Month.charAt(0) + commission.Month.slice(1).toLowerCase() : "—"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Year</p>
                      {editingHeader ? (
                        <Select value={headerForm.Year} onValueChange={v => setHeaderForm(p => ({ ...p, Year: v }))}>
                          <SelectTrigger className="h-7 w-28 text-xs border-slate-200 bg-slate-50"><SelectValue /></SelectTrigger>
                          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium text-slate-700">{commission.Year ?? "—"}</span>
                      )}
                    </div>

                    {commission.member && (
                      <div className="flex items-center justify-between py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Users className="h-3 w-3" /> Member</p>
                        <span className="text-sm text-slate-700">{commission.member.Member_Name ?? commission.ID_Member}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Layers className="h-3 w-3" /> Groups</p>
                      <span className="text-sm font-semibold text-slate-800">{commission.comgroups.length}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Total Commission</p>
                      <span className="font-mono text-base font-bold text-emerald-700">{fmt(commission.Total_commission)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Margin</p>
                      <span className="text-sm italic text-slate-400">{commission.Total_margin != null ? fmt(commission.Total_margin) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reimbursement</p>
                      <span className="text-sm italic text-slate-400">{commission.Total_reimbursment != null ? fmt(commission.Total_reimbursment) : "—"}</span>
                    </div>
                  </div>
                </SectionCard>

                {commission.comgroups.length > 0 && (
                  <SectionCard>
                    <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Groups Breakdown</p>
                    </div>
                    <div className="divide-y divide-slate-50 p-2">
                      {commission.comgroups.map(g => (
                        <div key={g.ID_ComGroup} className="flex items-center justify-between px-3 py-2.5">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{groupLabel(g)}</p>
                            <p className="text-[10px] text-slate-400">{g.comdetails.length} job{g.comdetails.length !== 1 ? "s" : ""}</p>
                          </div>
                          <span className="font-mono text-sm font-bold text-slate-700">{fmt(g.Total_detail)}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <AddGroupModal open={addGroupOpen} onOpenChange={setAddGroupOpen} commissionId={id} onCreated={fetchCommission} />
    </div>
  )
}