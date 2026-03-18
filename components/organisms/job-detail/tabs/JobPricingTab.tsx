"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { JobMultipliersManager } from "@/components/molecules/JobMultipliersManager"
import {
  FileText, Calendar, DollarSign, Info, BanknoteIcon,
  ChevronDown, ChevronUp, CheckCircle2, RefreshCw, AlertCircle,
  CloudDownload, TrendingUp, Layers, Receipt,
  BarChart3, CreditCard, ShieldCheck, Lock, KeyboardIcon,
} from "lucide-react"
import type { UserRole } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { findApplicableMultiplier } from "@/lib/services/multiplier-service"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChangeOrdersSection } from "@/components/organisms/ChangeOrdersSection"

const TechnicianJobSidebar = dynamic(
  () => import("@/components/organisms/TechnicianJobSidebar").then((m) => m.TechnicianJobSidebar),
  { ssr: false },
)
const LeadTechnicianPricingView = dynamic(
  () => import("@/components/organisms/LeadTechnicianPricingView").then((m) => m.LeadTechnicianPricingView),
  { ssr: false },
)

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncPhase = "idle" | "checking" | "syncing" | "reloading" | "done" | "error"

type Props = {
  role: UserRole
  jobId: string
  job: any
  costs?: any[]
  onEditCost?: (cost: any) => void
  onDeleteCost?: (id: string) => void
  onAddNewCost?: () => void
  isFieldChanged: (field: string) => boolean
  onPricingFieldChange: (field: string, value: number) => void
  onMultipliersChanged: () => void
  onAdjPricingCalculated: (adjPricing: number) => void
  onSyncComplete?: () => Promise<void>
  onReload?: () => Promise<void>
  syncPodio?: boolean
  onJobUpdate?: (updates: Record<string, any>) => Promise<void>
  onPricingTargetChange?: (value: string | null) => void
  onPermitChange?: (value: string | null) => void
  // These handlers are kept for API compatibility but Bldg_dept_fees is now read-only
  onTotalMaterialsFeesChange?: (value: number | null) => void
  onPaidFeesChange?: (value: number | null) => void
  onBldgDeptFeesChange?: (value: string[]) => void
  // ← NEW: passed from JobDetailPage so the tab knows when a reload is in progress
  isReloading?: boolean
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getOptionalNumber(sources: any[], keys: string[]): number | null {
  for (const src of sources) {
    if (!src) continue
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        const v = src[key]
        if (v === null || v === undefined || v === "") return null
        const n = Number(v)
        if (!Number.isNaN(n)) return n
      }
    }
  }
  return null
}

function getOptionalString(sources: any[], keys: string[]): string | null {
  for (const src of sources) {
    if (!src) continue
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        const v = src[key]
        if (v === null || v === undefined) return null
        return String(v)
      }
    }
  }
  return null
}

function getOptionalStringArray(sources: any[], keys: string[]): string[] {
  for (const src of sources) {
    if (!src) continue
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        const v = src[key]
        if (Array.isArray(v)) return v.map(String).filter(Boolean)
        if (v === null || v === undefined) return []
      }
    }
  }
  return []
}

function fmtMoney(v: number | null | undefined) {
  const n = Number(v ?? 0)
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(s: any) {
  try {
    if (!s) return "—"
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return String(s)
    return d.toLocaleDateString()
  } catch { return String(s) }
}

function parseNumberInput(raw: string): { kind: "empty" } | { kind: "partial" } | { kind: "number"; value: number } {
  const v = raw.trim()
  if (v === "") return { kind: "empty" }
  if (v === "." || v.endsWith(".")) return { kind: "partial" }
  const n = Number(v)
  if (!Number.isFinite(n)) return { kind: "partial" }
  return { kind: "number", value: n }
}

function resolveJobYearFromId(job: any): number | null {
  const id = String(job?.ID_Jobs ?? job?.idJobs ?? job?.id ?? "").trim()
  if (id) {
    const m = id.match(/\d/)
    if (m) return 2020 + parseInt(m[0], 10)
  }
  const jobType = String(job?.Job_type ?? "").toUpperCase()
  const dateStr = jobType === "PTL" ? (job?.Estimated_start_date ?? null) : (job?.Date_assigned ?? null)
  if (!dateStr) return null
  const y = new Date(dateStr).getFullYear()
  return Number.isFinite(y) ? y : null
}

function resolveJobCode(job: any): string | null {
  return job?.ID_Jobs ?? job?.Job_code ?? null
}

function hasFinancialDocs(job: any): boolean {
  return (Array.isArray(job?.financial_docs) ? job.financial_docs : []).length > 0
}

function parseBullets(description: string): string[] {
  if (!description) return []
  const parts = description.split(/\s*[-–]\s+/).map((s) => s.trim()).filter(Boolean)
  return parts.length <= 1 ? [description.trim()] : parts
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const CHANGED = "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300 focus:ring-amber-400"
const NORMAL  = "border-slate-200 bg-slate-50 focus:bg-white"

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, iconBg, iconColor, title, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string; iconColor: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
      {children}
    </label>
  )
}

// ─── ReadonlyField — for backend-calculated values ───────────────────────────
// These fields cannot be edited directly. Their values come from the calculator.

function ReadonlyField({
  label, value, hint,
}: {
  label: string
  value: number | null
  hint?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 min-h-[38px]">
        <span className="flex-1 text-sm font-semibold text-slate-700 tabular-nums">
          {value != null ? fmtMoney(value) : "—"}
        </span>
        <span title="Calculated automatically — edit the source data to update this value">
          <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />
        </span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── ReadonlyPercentField — same but shows as percentage ─────────────────────

function ReadonlyPercentField({
  label, value, hint,
}: {
  label: string
  value: number | null  // stored as decimal, e.g. 0.15 → displayed as 15.00%
  hint?: string
}) {
  const display = value != null
    ? `${(value * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : "—"
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 min-h-[38px]">
        <span className="flex-1 text-sm font-semibold text-slate-700 tabular-nums">{display}</span>
        <span title="Calculated automatically">
          <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />
        </span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── BldgDeptFeesDisplay — readonly chip display for Bldg_dept_fees ──────────
// Values are synced automatically from EstimateCosts with Cost_type = "BDF".
// To add/remove values, edit the Estimate Costs in the Estimate tab.

function BldgDeptFeesDisplay({ chips }: { chips: string[] }) {
  return (
    <div>
      <FieldLabel>Building Dept Fees</FieldLabel>
      <div className="min-h-[42px] rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 flex flex-wrap gap-1.5 items-center">
        {chips.length === 0 ? (
          <span className="text-sm text-slate-400 italic">
            No BDF estimate costs — add them in the Estimate tab
          </span>
        ) : (
          chips.map((chip, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-slate-200 border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              {chip}
            </span>
          ))
        )}
        <span
          className="ml-auto flex-shrink-0"
          title="Synced from Estimate Costs with type BDF — edit in the Estimate tab"
        >
          <Lock className="h-3 w-3 text-slate-400" />
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">
        Synced from Estimate Costs with type <span className="font-semibold">BDF</span>.
        To add or remove values, edit the Estimate Costs in the{" "}
        <span className="font-semibold">Estimate</span> tab.
      </p>
    </div>
  )
}

// ─── EditableNumericField — for the few manually editable pricing fields ─────

function EditableNumericField({
  label, text, setText, fieldKey, isFieldChanged, onCommit, placeholder,
}: {
  label: string; text: string; setText: (v: string) => void
  fieldKey: string; isFieldChanged: (f: string) => boolean
  onCommit: (t: string) => void; placeholder?: string
}) {
  const changed = isFieldChanged(fieldKey)
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Input
          type="text" inputMode="decimal"
          value={text} placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onCommit(text)}
          className={`text-sm transition-all pr-8 ${changed ? CHANGED : NORMAL}`}
        />
        {changed && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Financial doc cards ──────────────────────────────────────────────────────

function FinancialDocItem({ item }: { item: any }) {
  const [open, setOpen] = useState(false)
  const bullets = parseBullets(item?.Description ?? "")
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-medium text-sm truncate text-slate-700">{item?.Name || item?.Description?.slice(0, 40) || "Item"}</div>
          <span className="text-xs text-slate-400 flex-shrink-0">× {item?.Quantity ?? 1}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-semibold text-sm text-slate-800">{fmtMoney(Number(item?.Amount ?? item?.Unit_price ?? 0))}</span>
          {item?.Description && (
            <button onClick={() => setOpen(!open)} className="text-slate-300 hover:text-slate-500 transition-colors">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {open && item?.Description && (
        <div className="px-3 pb-3 border-t border-slate-100 bg-white pt-2 space-y-1">
          {bullets.length > 1
            ? bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-300" /><span>{b}</span>
                </div>
              ))
            : <p className="text-sm text-slate-500">{item.Description}</p>}
        </div>
      )}
    </div>
  )
}

function DocCard({ doc, type }: { doc: any; type: "invoice" | "bill" }) {
  const isInv = type === "invoice"
  const accent = isInv
    ? { bg: "bg-emerald-50/50", icon: "bg-emerald-100", iconColor: "text-emerald-600", badge: "bg-emerald-100 border-emerald-200 text-emerald-700", balance: "text-emerald-700" }
    : { bg: "bg-orange-50/50",  icon: "bg-orange-100",  iconColor: "text-orange-600",  badge: "bg-orange-100 border-orange-200 text-orange-700",   balance: "text-orange-700" }
  const DocIcon = isInv ? FileText : DollarSign
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className={`flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-100 ${accent.bg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-xl p-2 ${accent.icon}`}><DocIcon className={`h-4 w-4 ${accent.iconColor}`} /></div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-800">{doc?.Job_Ref_QBO || "—"}</div>
            <div className="text-[10px] text-slate-400 font-mono">ID: {doc?.ID_FinancialDoc ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="h-3 w-3" /> {fmtDate(doc?.Due_Date)}</div>
          <div className="text-right"><div className="text-[10px] text-slate-400">Total</div><div className="text-sm font-semibold text-slate-800">{fmtMoney(Number(doc?.Total_Amount || 0))}</div></div>
          <div className="text-right"><div className="text-[10px] text-slate-400">Balance</div><div className={`text-sm font-semibold ${accent.balance}`}>{fmtMoney(Number(doc?.Balance_Amount || 0))}</div></div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${accent.badge}`}>{doc?.Percentage_Paid ?? 0}% paid</span>
        </div>
      </div>
      {doc?.Notes && (
        <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">{doc.Notes}</p>
        </div>
      )}
      {Array.isArray(doc?.financial_doc_items) && doc.financial_doc_items.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Line Items</p>
          {doc.financial_doc_items.map((item: any, idx: number) => <FinancialDocItem key={item?.ID_FDItem ?? idx} item={item} />)}
        </div>
      )}
    </div>
  )
}

function TransactionCard({ doc, type }: { doc: any; type: "invoice" | "bill" }) {
  const isInv = type === "invoice"
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${isInv ? "border-emerald-200" : "border-orange-200"}`}>
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-xl p-2 ${isInv ? "bg-emerald-50" : "bg-orange-50"}`}>
            <BanknoteIcon className={`h-4 w-4 ${isInv ? "text-emerald-500" : "text-orange-500"}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-800">{doc?.Reference_number || "—"}</div>
            <div className="text-[10px] text-slate-400">{doc?.Type_of_transaction || "Payment"} · {doc?.ID_FTransaction ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-xs text-slate-400 text-right space-y-0.5">
            <div className="flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" /> {fmtDate(doc?.Date_of_payment)}</div>
            <div>{doc?.Type_of_payment || "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Amount</div>
            <div className="text-sm font-semibold text-slate-800">{fmtMoney(Number(doc?.Total_Amount || 0))}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sync banner ──────────────────────────────────────────────────────────────

function SyncBanner({ phase, jobYear, errorMessage, onRetry }: {
  phase: SyncPhase; jobYear: number | null; errorMessage: string | null; onRetry: () => void
}) {
  if (phase === "idle" || phase === "done") return null
  if (phase === "error") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">Failed to sync financial data</p>
          {errorMessage && <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="flex-shrink-0 text-red-700 border-red-300 hover:bg-red-100">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    )
  }
  const steps: { phase: SyncPhase; label: string }[] = [
    { phase: "checking",  label: "Checking for financial data…" },
    { phase: "syncing",   label: "Importing from QuickBooks…" },
    { phase: "reloading", label: "Loading documents…" },
  ]
  const cur = steps.findIndex((s) => s.phase === phase)
  return (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex items-center gap-3 mb-3">
        <CloudDownload className="h-5 w-5 flex-shrink-0 text-blue-500 animate-pulse" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Importing financial data{jobYear ? ` (${jobYear})` : ""}</p>
          <p className="text-xs text-blue-600 mt-0.5">{steps[cur]?.label ?? "Processing…"}</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s.phase} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < cur ? "bg-blue-500" : i === cur ? "bg-blue-400 animate-pulse" : "bg-blue-200"}`} />
        ))}
      </div>
    </div>
  )
}

function DocsSkeleton({ cls }: { cls: string }) {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className={`rounded-2xl border bg-white overflow-hidden ${cls}`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="animate-pulse rounded-xl bg-slate-200 h-9 w-9" />
              <div className="space-y-1.5">
                <div className="animate-pulse rounded bg-slate-200 h-4 w-24" />
                <div className="animate-pulse rounded bg-slate-200 h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="animate-pulse rounded bg-slate-200 h-3 w-20" />
              <div className="animate-pulse rounded-full bg-slate-200 h-5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SubHeader({ icon: Icon, title, total, color }: {
  icon: React.ComponentType<{ className?: string }>; title: string; total: number; color: string
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      <span className="text-sm text-slate-500">Total: <span className="font-semibold text-slate-800">{fmtMoney(total)}</span></span>
    </div>
  )
}

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
        active ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      }`}>
      {children}
    </button>
  )
}

const PRICING_TARGET_OPTIONS = ["Yes", "No", "Leadership Approval"] as const
const PERMIT_OPTIONS          = ["Yes", "No"] as const

// ─── Main component ───────────────────────────────────────────────────────────

export function JobPricingTab({
  role, jobId, job, isFieldChanged, onPricingFieldChange,
  onMultipliersChanged, onAdjPricingCalculated, onSyncComplete,
  onReload, syncPodio = false, onJobUpdate: onPatchJob,
  onPricingTargetChange, onPermitChange,
  isReloading = false,
}: Props) {
  const src = [job?.pricingData ?? job, job]

  // ── Calculated (read-only) fields ─────────────────────────────────────────
  const estimatedRent             = getOptionalNumber(src, ["Estimated_rent"])
  const estimatedMaterial         = getOptionalNumber(src, ["Estimated_material"])
  const estimatedCity             = getOptionalNumber(src, ["Estimated_city"])
  const techFormulaPricing        = getOptionalNumber(src, ["Tech_formula_pricing"])
  const gqmFormula                = getOptionalNumber(src, ["Gqm_formula_pricing"])
  const gqmAdjFormula             = getOptionalNumber(src, ["Gqm_adj_formula_pricing"])
  const gqmTargetReturnRaw        = getOptionalNumber(src, ["Gqm_target_return"])
  const gqmPremium                = getOptionalNumber(src, ["Gqm_premium_in_money"])
  const gqmFinalSold              = getOptionalNumber(src, ["Gqm_final_sold_pricing"])
  const gqmFinalPercentageRaw     = getOptionalNumber(src, ["Gqm_final_percentage"])
  const gqmTotalChangeOrders      = getOptionalNumber(src, ["Gqm_total_change_orders"])
  const gqmTotalMaterialsFees     = getOptionalNumber(src, ["Gqm_total_materials_fees"])
  const gqmPaidFees               = getOptionalNumber(src, ["Gqm_paid_fees"])
  const gqmFinalFormPricing       = getOptionalNumber(src, ["Gqm_final_form_pricing"])
  const gqmFinalAdjForm           = getOptionalNumber(src, ["Gqm_final_adj_form_pricing"])
  const gqmFinalTargetReturn      = getOptionalNumber(src, ["Gqm_final_target_return"])
  const gqmFinalPremInMoney       = getOptionalNumber(src, ["Gqm_final_prem_in_money"])
  const accReceivable             = getOptionalNumber(src, ["Acc_receivable"])
  const bldgDeptFees              = getOptionalStringArray(src, ["Bldg_dept_fees"])

  // ── Manually editable fields ──────────────────────────────────────────────
  const gqmTargetSold             = getOptionalNumber(src, ["Gqm_target_sold_pricing"])
  const pricingTarget             = getOptionalString(src, ["Pricing_target"])
  const permit                    = getOptionalString(src, ["Permit"])

  // Local text state only for the single editable numeric field
  const [gqmTargetSoldText, setGqmTargetSoldText] = useState(gqmTargetSold?.toString() ?? "")
  useEffect(() => setGqmTargetSoldText(gqmTargetSold?.toString() ?? ""), [gqmTargetSold])

  // ── Financial docs ────────────────────────────────────────────────────────
  const financialDocs: any[] = Array.isArray(job?.financial_docs) ? job.financial_docs : []
  const invoices    = financialDocs.filter((d) => String(d?.Type_of_document ?? "").toLowerCase() === "invoice")
  const bills       = financialDocs.filter((d) => String(d?.Type_of_document ?? "").toLowerCase() === "bill")
  const invTotal    = invoices.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)
  const billTotal   = bills.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)
  const invTx       = invoices.flatMap((d) => d?.financial_transactions ?? [])
  const billTx      = bills.flatMap((d) => d?.financial_transactions ?? [])
  const invTxTotal  = invTx.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)
  const billTxTotal = billTx.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)

  const [activeTab,  setActiveTab]  = useState<"analysis" | "invoices" | "bills">("analysis")
  const [syncPhase,  setSyncPhase]  = useState<SyncPhase>("idle")
  const [syncError,  setSyncError]  = useState<string | null>(null)

  const jobYear = useMemo(() => resolveJobYearFromId(job), [job])
  const onSyncCompleteRef   = useRef(onSyncComplete)
  const syncAttemptedRef    = useRef(false)
  useEffect(() => { onSyncCompleteRef.current = onSyncComplete }, [onSyncComplete])

  const runSync = async (code: string) => {
    setSyncError(null)
    try {
      setSyncPhase("syncing")
      const res = await fetch(`/api/qbo/sync-full-job/${code}`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? body?.detail ?? `Sync failed (HTTP ${res.status})`)
      }
      setSyncPhase("reloading")
      if (onSyncCompleteRef.current) await onSyncCompleteRef.current()
      setSyncPhase("done")
    } catch (err) {
      console.error("[QBO sync]:", err)
      setSyncError(err instanceof Error ? err.message : "Unknown error")
      setSyncPhase("error")
    }
  }

  useEffect(() => {
    if (activeTab !== "invoices" && activeTab !== "bills") return
    if (syncAttemptedRef.current) return
    const code = resolveJobCode(job)
    const year = resolveJobYearFromId(job)
    if (!code || year === null || year >= 2026 || hasFinancialDocs(job)) return
    syncAttemptedRef.current = true
    setSyncPhase("checking")
    const t = setTimeout(() => { void runSync(code) }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  if (role === "LEAD_TECHNICIAN") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><LeadTechnicianPricingView jobId={jobId} job={job} /></div>
        <div className="lg:col-span-1"><TechnicianJobSidebar job={job} subcontractor={job?.subcontractors?.[0]} /></div>
      </div>
    )
  }

  const formula              = gqmFormula ?? null
  const applicableMultiplier = formula != null ? findApplicableMultiplier(formula, job?.multipliers || []) : null
  const recommendedAdj       = formula != null && applicableMultiplier ? formula * Number(applicableMultiplier.Multiplier) : null

  const commit = (field: string, text: string) => {
    const p = parseNumberInput(text)
    if (p.kind !== "number") return
    onPricingFieldChange(field, p.value)
  }

  const isSyncing       = ["checking", "syncing", "reloading"].includes(syncPhase)
  const handleJobUpdate = onPatchJob ?? (async () => {})
  const handleReload    = onReload   ?? (async () => {})

  return (
    <>
      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 gap-0.5">
          <TabPill active={activeTab === "analysis"} onClick={() => setActiveTab("analysis")}>
            <BarChart3 className="h-3.5 w-3.5" /> Analysis
          </TabPill>
          <TabPill active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")}>
            <Receipt className="h-3.5 w-3.5" /> Invoices
            {invoices.length > 0 && (
              <span className="ml-0.5 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-bold">{invoices.length}</span>
            )}
          </TabPill>
          <TabPill active={activeTab === "bills"} onClick={() => setActiveTab("bills")}>
            <DollarSign className="h-3.5 w-3.5" /> Bills
            {bills.length > 0 && (
              <span className="ml-0.5 rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[10px] font-bold">{bills.length}</span>
            )}
          </TabPill>
        </div>
      </div>

      {/* ── Analysis ───────────────────────────────────────────────────────── */}
      {activeTab === "analysis" && (
        <div className="space-y-4">

          {/* ── Recalculating banner ─────────────────────────────────────── */}
          {isReloading && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500 flex-shrink-0" />
              <span className="text-xs font-medium text-blue-700">
                Recalculating pricing fields…
              </span>
            </div>
          )}

          {/* ── Read-only legend ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
            <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-400">
              Fields marked with a lock are calculated automatically by the server. Edit the source data (Estimate Costs, Orders, Purchases, Change Orders) to update them.
            </span>
          </div>

          {/* Multipliers manager */}
          {job?.ID_Jobs && formula != null && (
            <JobMultipliersManager
              jobId={job.ID_Jobs}
              formulaPricing={formula}
              multipliers={job?.multipliers || []}
              onMultipliersChanged={onMultipliersChanged}
              onAdjPricingCalculated={onAdjPricingCalculated}
            />
          )}

          {/* 1. Initial Proposal */}
          <SectionCard icon={Layers} iconBg="bg-sky-100" iconColor="text-sky-600" title="Initial Proposal Pricing">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField
                label="Estimated Rent"
                value={estimatedRent}
                hint="Sum of Estimate Costs with type Rent"
              />
              <ReadonlyField
                label="Estimated Materials"
                value={estimatedMaterial}
                hint="Sum of Estimate Costs with type Material"
              />
              <ReadonlyField
                label="Estimated City"
                value={estimatedCity}
                hint="Sum of Estimate Costs with type Permit"
              />
              <ReadonlyField
                label="Tech Formula Pricing"
                value={techFormulaPricing}
                hint="Sum of Adj Formula from all linked Orders"
              />
            </div>
          </SectionCard>

          {/* 2. Pricing Analysis */}
          <SectionCard icon={TrendingUp} iconBg="bg-violet-100" iconColor="text-violet-600" title="Pricing Analysis">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Base Project Costs</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadonlyField
                  label="GQM (Formula) Pricing"
                  value={gqmFormula}
                  hint="Orders Adj Formula + Estimated Material + Rent + City"
                />
                <ReadonlyField
                  label="GQM (Adj Formula) Pricing"
                  value={gqmAdjFormula}
                  hint={
                    recommendedAdj != null
                      ? `Formula × multiplier = ${fmtMoney(recommendedAdj)}`
                      : applicableMultiplier == null
                      ? "No multiplier in range — using default factor"
                      : undefined
                  }
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Target Pricing & Returns</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <ReadonlyPercentField
                  label="GQM Target Return %"
                  value={gqmTargetReturnRaw}
                  hint="(Final Sold − Adj Formula) / Final Sold"
                />
                {/* ← Only manually editable pricing numeric field */}
                <EditableNumericField
                  label="GQM Target Sold Pricing"
                  text={gqmTargetSoldText}
                  setText={setGqmTargetSoldText}
                  fieldKey="pricing.gqmTargetSoldPricing"
                  isFieldChanged={isFieldChanged}
                  onCommit={(t) => commit("gqmTargetSoldPricing", t)}
                />
                <ReadonlyField
                  label="GQM Premium in $"
                  value={gqmPremium}
                  hint="Final Sold − Adj Formula"
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Final Pricing & Returns</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadonlyField
                  label="GQM Final Sold Pricing"
                  value={gqmFinalSold}
                  hint="Target Sold + Total Change Orders + PTL GC Fee"
                />
                <ReadonlyPercentField
                  label="GQM Final %"
                  value={gqmFinalPercentageRaw}
                  hint="(AR − Final Adj Form) / AR"
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Target</p>
              <div className="max-w-xs">
                <FieldLabel>Pricing Target</FieldLabel>
                <Select value={pricingTarget ?? ""} onValueChange={(v) => onPricingTargetChange?.(v || null)}>
                  <SelectTrigger className={`text-sm transition-all ${isFieldChanged("pricingTarget") ? CHANGED : NORMAL}`}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_TARGET_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          {/* 3. Change Orders */}
          <ChangeOrdersSection
            job={job}
            syncPodio={syncPodio}
            jobYear={jobYear ?? undefined}
            onReload={handleReload}
            onPatchJob={handleJobUpdate}
          />

          {/* 4. Fees Paid */}
          <SectionCard icon={ShieldCheck} iconBg="bg-teal-100" iconColor="text-teal-600" title="Fees Paid">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Permit — manually editable */}
              <div>
                <FieldLabel>Permit</FieldLabel>
                <Select value={permit ?? ""} onValueChange={(v) => onPermitChange?.(v || null)}>
                  <SelectTrigger className={`text-sm transition-all ${isFieldChanged("permit") ? CHANGED : NORMAL}`}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMIT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <ReadonlyField
                label="Total Materials Fees"
                value={gqmTotalMaterialsFees}
                hint="Sum of Total Spending from all Purchases"
              />
            </div>

            {/* GQM Paid Fees — calculated from Bldg_dept_fees */}
            <div className="max-w-xs">
              <ReadonlyField
                label="GQM Paid Fees"
                value={gqmPaidFees}
                hint="Sum of all Building Dept Fee values below"
              />
            </div>

            {/* Bldg_dept_fees — read-only chip display, sourced from BDF estimate costs */}
            <BldgDeptFeesDisplay chips={bldgDeptFees} />
          </SectionCard>

          {/* 5. Accounts Receivable */}
          <SectionCard icon={CreditCard} iconBg="bg-indigo-100" iconColor="text-indigo-600" title="Accounts Receivable">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField
                label="Accounts Receivable"
                value={accReceivable}
                hint="Target Sold + Change Orders + PTL GC Fee"
              />
              <ReadonlyField
                label="GQM Final Form Pricing"
                value={gqmFinalFormPricing}
                hint="Orders Adj Formula + Materials Fees + Paid Fees"
              />
              <ReadonlyField
                label="GQM Final Adj. Form Pricing"
                value={gqmFinalAdjForm}
                hint="Final Form × 1.027"
              />
              <ReadonlyPercentField
                label="GQM Final Target Return"
                value={gqmFinalTargetReturn}
                hint="(AR − Final Adj Form) / AR"
              />
              <ReadonlyField
                label="GQM Final Premium in $"
                value={gqmFinalPremInMoney}
                hint="Final Sold − Final Adj Form"
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Invoices ───────────────────────────────────────────────────────── */}
      {activeTab === "invoices" && (
        <div className="space-y-5">
          <SyncBanner phase={syncPhase} jobYear={jobYear} errorMessage={syncError}
            onRetry={() => { syncAttemptedRef.current = false; setSyncPhase("idle") }} />
          {isSyncing ? <DocsSkeleton cls="border-emerald-200" /> : (
            <>
              <div className="space-y-3">
                <SubHeader icon={FileText} title="Invoices" total={invTotal} color="text-emerald-500" />
                {invoices.length === 0
                  ? <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No invoices for this job</div>
                  : invoices.map((d: any) => <DocCard key={d?.ID_FinancialDoc ?? Math.random()} doc={d} type="invoice" />)}
              </div>
              <div className="space-y-3">
                <SubHeader icon={BanknoteIcon} title="Invoice Payments" total={invTxTotal} color="text-emerald-400" />
                {invTx.length === 0
                  ? <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No payments yet</div>
                  : invTx.map((d: any) => <TransactionCard key={d?.ID_FTransaction ?? Math.random()} doc={d} type="invoice" />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bills ──────────────────────────────────────────────────────────── */}
      {activeTab === "bills" && (
        <div className="space-y-5">
          <SyncBanner phase={syncPhase} jobYear={jobYear} errorMessage={syncError}
            onRetry={() => { syncAttemptedRef.current = false; setSyncPhase("idle") }} />
          {isSyncing ? <DocsSkeleton cls="border-orange-200" /> : (
            <>
              <div className="space-y-3">
                <SubHeader icon={DollarSign} title="Bills" total={billTotal} color="text-orange-500" />
                {bills.length === 0
                  ? <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No bills for this job</div>
                  : bills.map((d: any) => <DocCard key={d?.ID_FinancialDoc ?? Math.random()} doc={d} type="bill" />)}
              </div>
              <div className="space-y-3">
                <SubHeader icon={BanknoteIcon} title="Bill Payments" total={billTxTotal} color="text-orange-400" />
                {billTx.length === 0
                  ? <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No bill payments yet</div>
                  : billTx.map((d: any) => <TransactionCard key={d?.ID_FTransaction ?? Math.random()} doc={d} type="bill" />)}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}