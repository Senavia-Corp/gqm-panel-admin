"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar }   from "@/components/organisms/Sidebar"
import { TopBar }    from "@/components/organisms/TopBar"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, BadgeDollarSign, Loader2, AlertCircle,
  RefreshCw, ChevronDown, ChevronRight as ChevronRightIcon,
  Check, X, Briefcase, Calendar, DollarSign, Hash, Layers, Users, Pencil
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionDetail = {
  ID_ComDetail: string
  Factor:       number | null
  Sell_Mgmt:    number | null
  Type:         "Non-Comp" | "Standard" | "Premium"
  ID_Jobs:      string | null
  ID_ComGroup:  string | null
  job?: {
    ID_Jobs:              string
    Job_type:             string | null
    Gqm_final_prem_in_money: number | null
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

// ─── Constants ─────────────────────────────────────────────────────────────────

const COMMISSION_TYPES = ["Non-Comp", "Standard", "Premium"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      <span className="text-sm font-medium text-slate-700">{value || <span className="italic text-slate-400">—</span>}</span>
      <button onClick={() => setEditing(true)} className="invisible rounded p-0.5 text-slate-400 hover:text-slate-600 group-hover:visible">
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )

  return (
    <div className="flex items-center gap-1.5">
      <Select value={draft} onValueChange={setDraft}>
        <SelectTrigger className="h-7 w-32 text-xs border-slate-200 bg-slate-50"><SelectValue /></SelectTrigger>
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

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ group, onUpdated }: {
  group: CommissionGroup; onUpdated: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  const patchDetailType = async (detailId: string, newType: string) => {
    const res = await apiFetch(`/api/commission_detail/${encodeURIComponent(detailId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Type: newType }),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    onUpdated()
  }

  return (
    <SectionCard>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5 sm:py-3.5">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 text-left">
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRightIcon className="h-4 w-4 text-slate-400" />}
          <div>
            <p className="text-sm font-bold text-slate-800">{groupLabel(group)}</p>
            <p className="font-mono text-[11px] text-slate-400">{group.ID_ComGroup}</p>
          </div>
        </button>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">Group Total</p>
          <p className="text-sm font-bold text-emerald-700">{fmt(group.Total_detail)}</p>
        </div>
      </div>

      {/* Group meta */}
      {expanded && (
        <div className="grid grid-cols-3 gap-4 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Job Type</p>
            <p className="text-sm text-slate-700">{group.Jobs_type || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Year</p>
            <p className="text-sm text-slate-700">{group.Jobs_year || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Role</p>
            <p className="text-sm text-slate-700">{group.Rol || "—"}</p>
          </div>
        </div>
      )}

      {/* Details */}
      {expanded && (
        <div className="divide-y divide-slate-50">
          {group.comdetails.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Briefcase className="h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-500">No jobs associated</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[520px] divide-y divide-slate-50">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 bg-slate-50/80 px-5 py-2">
                  {["Job", "Premium (GQM)", "Type", "Factor", "Total (Sell/Mgmt)"].map((h, i) => (
                    <span key={i} className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</span>
                  ))}
                </div>

                {group.comdetails.map(detail => (
                  <div key={detail.ID_ComDetail}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{detail.job?.ID_Jobs ?? detail.ID_Jobs ?? "—"}</p>
                      {detail.job?.Job_type && <span className="text-[11px] font-semibold text-slate-500">{detail.job.Job_type}</span>}
                    </div>
                    <span className="text-sm text-slate-600">
                      {detail.job?.Gqm_final_prem_in_money != null ? fmt(detail.job.Gqm_final_prem_in_money) : "—"}
                    </span>
                    <InlineSelectEdit value={detail.Type} options={COMMISSION_TYPES} onSave={v => patchDetailType(detail.ID_ComDetail, v)} />
                    <span className="text-sm text-slate-600">{detail.Factor ?? "—"}</span>
                    <span className="font-mono text-sm font-bold text-emerald-700">{fmt(detail.Sell_Mgmt)}</span>
                  </div>
                ))}

                <div className="flex justify-end border-t border-slate-100 bg-emerald-50/60 px-5 py-2.5">
                  <span className="mr-2 text-xs font-semibold text-slate-500">Group total:</span>
                  <span className="font-mono text-sm font-bold text-emerald-700">{fmt(group.Total_detail)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function CommissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [user,       setUser]       = useState<any>(null)
  const [commission, setCommission] = useState<Commission | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

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
    } catch (e: any) { setError(e?.message ?? "Failed to load commission") }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { if (user) fetchCommission() }, [user, fetchCommission])

  if (!user) return null

  if (loading) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar /><div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            {[16, 32, 56].map((h, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white" style={{ height: `${h * 4}px` }} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )

  if (!commission) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar /><div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/commissions")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 shadow-sm sm:h-10 sm:w-10">
                    <BadgeDollarSign className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-slate-900 leading-none sm:text-lg">
                      {commission.Month ? `${commission.Month.charAt(0) + commission.Month.slice(1).toLowerCase()} ${commission.Year}` : commission.ID_Commission}
                    </h1>
                    <p className="mt-0.5 hidden font-mono text-xs text-slate-400 sm:block">{commission.ID_Commission}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-5 sm:gap-6 xl:grid-cols-4 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 xl:col-span-3 lg:col-span-2">
                {commission.comgroups.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
                    <Layers className="h-10 w-10 text-slate-300" />
                    <p className="font-semibold text-slate-600">No commission groups found</p>
                  </div>
                ) : commission.comgroups.map(group => (
                  <GroupCard key={group.ID_ComGroup} group={group} onUpdated={fetchCommission} />
                ))}
              </div>

              <div className="min-w-0 space-y-4">
                <SectionCard>
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Commission Summary</p>
                  </div>
                  <div className="divide-y divide-slate-50 p-4 sm:p-5">
                    <div className="flex items-center justify-between py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Hash className="h-3 w-3" /> ID</p>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">{commission.ID_Commission}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Period</p>
                      <span className="text-sm font-medium text-slate-700">
                        {commission.Month ? commission.Month.charAt(0) + commission.Month.slice(1).toLowerCase() : "—"} {commission.Year}
                      </span>
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
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
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
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-3.5">
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
    </div>
  )
}