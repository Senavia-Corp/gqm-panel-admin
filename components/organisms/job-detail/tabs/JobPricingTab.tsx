"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { JobMultipliersManager } from "@/components/molecules/JobMultipliersManager"
import {
  FileText, Calendar, DollarSign, Info, BanknoteIcon,
  ChevronDown, ChevronUp, CheckCircle2, RefreshCw, AlertCircle, CloudDownload,
} from "lucide-react"
import type { UserRole } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { findApplicableMultiplier } from "@/lib/services/multiplier-service"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ✅ NEW: Change Orders CRUD component
import { ChangeOrdersSection } from "@/components/organisms/ChangeOrdersSection"

const TechnicianJobSidebar = dynamic(
  () => import("@/components/organisms/TechnicianJobSidebar").then((mod) => mod.TechnicianJobSidebar),
  { ssr: false },
)
const LeadTechnicianPricingView = dynamic(
  () => import("@/components/organisms/LeadTechnicianPricingView").then((mod) => mod.LeadTechnicianPricingView),
  { ssr: false },
)

// ---------------------------------------------------------------------------
// Sync state
// ---------------------------------------------------------------------------

type SyncPhase =
  | "idle"
  | "checking"
  | "syncing"
  | "reloading"
  | "done"
  | "error"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

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
  /** Called after sync completes so the parent can reload the job */
  onSyncComplete?: () => Promise<void>
  /** Reload job from server (passed down for ChangeOrdersSection) */
  onReload?: () => Promise<void>
  /** Podio sync toggle state inherited from JobDetailPage */
  syncPodio?: boolean
  /**
   * Patch the job in the backend (Gqm_final_sold_pricing).
   * Maps to useJobDetail.patch(). sync_podio handled by each change-order action individually.
   */
  onJobUpdate?: (updates: Record<string, any>) => Promise<void>
  /** Called when Pricing_target selector changes */
  onPricingTargetChange?: (value: string | null) => void
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function getOptionalNumber(sourceObjects: any[], candidates: string[]): number | null {
  for (const src of sourceObjects) {
    if (!src) continue
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        const v = src[key]
        if (v === null || v === undefined || v === "") return null
        const num = Number(v)
        if (!Number.isNaN(num)) return num
      }
    }
  }
  return null
}

function getOptionalString(sourceObjects: any[], candidates: string[]): string | null {
  for (const src of sourceObjects) {
    if (!src) continue
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        const v = src[key]
        if (v === null || v === undefined) return null
        return String(v)
      }
    }
  }
  return null
}

function fmtMoney(v: number) {
  return `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(s: any) {
  try {
    if (!s) return "—"
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return String(s)
    return d.toLocaleDateString()
  } catch {
    return String(s)
  }
}

function parseNumberInput(raw: string):
  | { kind: "empty" }
  | { kind: "partial" }
  | { kind: "number"; value: number } {
  const v = raw.trim()
  if (v === "") return { kind: "empty" }
  if (v === "." || v.endsWith(".")) return { kind: "partial" }
  const n = Number(v)
  if (!Number.isFinite(n)) return { kind: "partial" }
  return { kind: "number", value: n }
}

function resolveJobYear(job: any): number | null {
  const jobType = String(job?.Job_type ?? job?.job_type ?? "").toUpperCase()
  const dateStr =
    jobType === "PTL"
      ? (job?.Estimated_start_date ?? job?.estimated_start_date ?? null)
      : (job?.Date_assigned ?? job?.date_assigned ?? null)
  if (!dateStr) return null
  const y = new Date(dateStr).getFullYear()
  return Number.isFinite(y) ? y : null
}

function resolveJobCode(job: any): string | null {
  return job?.ID_Jobs ?? job?.Job_code ?? job?.job_code ?? job?.Code ?? null
}

function hasFinancialDocs(job: any): boolean {
  const docs: any[] = Array.isArray(job?.financial_docs)
    ? job.financial_docs
    : Array.isArray(job?.financialDocs)
    ? job.financialDocs
    : []
  return docs.length > 0
}

// ---------------------------------------------------------------------------
// Description / bullet parsers
// ---------------------------------------------------------------------------

function parseBullets(description: string): string[] {
  if (!description) return []
  const parts = description.split(/\s*[-–]\s+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) return [description.trim()]
  return parts
}

function ItemDescription({ text, maxBullets = 3 }: { text: string; maxBullets?: number }) {
  const [expanded, setExpanded] = useState(false)
  const bullets = parseBullets(text)
  const isList = bullets.length > 1
  const isLong = bullets.length > maxBullets
  const visibleBullets = expanded || !isLong ? bullets : bullets.slice(0, maxBullets)

  if (!isList) {
    const isLongParagraph = text.length > 200
    return (
      <div className="text-sm text-muted-foreground">
        <p className={!expanded && isLongParagraph ? "line-clamp-3" : ""}>{text}</p>
        {isLongParagraph && (
          <button onClick={() => setExpanded(!expanded)} className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show more</>}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="text-sm text-muted-foreground">
      <ul className="space-y-1 mt-1">
        {visibleBullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary/50" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> +{bullets.length - maxBullets} more items</>}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// UI atoms
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const lower = (status ?? "").toLowerCase()
  const variant = lower.includes("paid") || lower.includes("closed") ? "default" : lower.includes("partial") ? "secondary" : "outline"
  return <Badge variant={variant} className="text-xs">{status || "—"}</Badge>
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, total, totalLabel = "Total", colorClass = "text-muted-foreground" }: {
  icon: React.ElementType; title: string; total: number; totalLabel?: string; colorClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${colorClass}`} />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="text-sm text-muted-foreground">
        {totalLabel}: <span className="font-semibold text-foreground">{fmtMoney(total)}</span>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 flex flex-col items-center justify-center text-center gap-2">
        <FileText className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sync banner
// ---------------------------------------------------------------------------

function SyncBanner({ phase, jobYear, errorMessage, onRetry }: {
  phase: SyncPhase; jobYear: number | null; errorMessage: string | null; onRetry: () => void
}) {
  if (phase === "idle" || phase === "done") return null

  if (phase === "error") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">Failed to sync financial data</p>
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
  const currentStep = steps.findIndex((s) => s.phase === phase)
  const label = steps[currentStep]?.label ?? "Processing…"

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex items-center gap-3 mb-3">
        <CloudDownload className="h-5 w-5 flex-shrink-0 text-blue-500 animate-pulse" />
        <div>
          <p className="text-sm font-medium text-blue-900">
            Importing historical financial data{jobYear ? ` (${jobYear})` : ""}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">{label} This may take a moment.</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        {steps.map((step, i) => (
          <div
            key={step.phase}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < currentStep ? "bg-blue-500" : i === currentStep ? "bg-blue-400 animate-pulse" : "bg-blue-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-blue-500 mt-2">Step {currentStep + 1} of {steps.length}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />
}

function DocsSkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <Card key={i} className={`overflow-hidden border-l-4 ${accentColor}`}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <SkeletonBox className="h-8 w-8 rounded-md" />
                <div className="space-y-1.5">
                  <SkeletonBox className="h-4 w-24" />
                  <SkeletonBox className="h-3 w-16" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <SkeletonBox className="h-3 w-20" />
                <SkeletonBox className="h-8 w-16" />
                <SkeletonBox className="h-8 w-16" />
                <SkeletonBox className="h-5 w-14 rounded-full" />
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              <SkeletonBox className="h-3 w-12" />
              <SkeletonBox className="h-10 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Financial document cards
// ---------------------------------------------------------------------------

function FinancialDocItem({ item }: { item: any }) {
  const [open, setOpen] = useState(false)
  const bullets = parseBullets(item?.Description ?? "")
  const isList = bullets.length > 1

  return (
    <div className="rounded-lg border bg-gray-50/70 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-medium text-sm truncate">{item?.Name || item?.Description?.slice(0, 40) || "Item"}</div>
          <span className="text-xs text-muted-foreground flex-shrink-0">x {item?.Quantity ?? 1}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-semibold text-sm">{fmtMoney(Number(item?.Amount ?? item?.Unit_price ?? 0))}</span>
          {item?.Description && (
            <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={open ? "Collapse" : "Expand"}>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {open && item?.Description && (
        <div className="px-3 pb-3 border-t bg-white">
          <div className="pt-2">
            {isList ? (
              <ul className="space-y-1">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary/40" /><span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{item.Description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InvoiceCard({ doc }: { doc: any }) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-emerald-500">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/40 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-md bg-emerald-50 p-1.5 border border-emerald-100">
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base leading-tight">{doc?.Job_Ref_QBO || "—"}</div>
              <div className="text-xs text-muted-foreground">QBO ID: {doc?.ID_FinancialDoc ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Due: {fmtDate(doc?.Due_Date)}
            </div>
            <StatPill label="Total" value={fmtMoney(Number(doc?.Total_Amount || 0))} />
            <StatPill label="Balance" value={fmtMoney(Number(doc?.Balance_Amount || 0))} />
            <StatusBadge status={`${doc?.Percentage_Paid ?? 0}% paid`} />
          </div>
        </div>
        {doc?.Notes && (
          <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            <p className="text-xs text-amber-800">Notes: {doc.Notes}</p>
          </div>
        )}
        {Array.isArray(doc?.financial_doc_items) && doc.financial_doc_items.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Items</p>
            {doc.financial_doc_items.map((item: any, idx: number) => <FinancialDocItem key={item?.ID_FDItem ?? idx} item={item} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BillCard({ doc }: { doc: any }) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-orange-400">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/40 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-md bg-orange-50 p-1.5 border border-orange-100">
              <DollarSign className="h-4 w-4 text-orange-500" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base leading-tight">{doc?.Job_Ref_QBO || "—"}</div>
              <div className="text-xs text-muted-foreground">ID: {doc?.ID_FinancialDoc ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Due: {fmtDate(doc?.Due_Date)}
            </div>
            <StatPill label="Total" value={fmtMoney(Number(doc?.Total_Amount || 0))} />
            <StatPill label="Balance" value={fmtMoney(Number(doc?.Balance_Amount || 0))} />
            <StatusBadge status={`${doc?.Percentage_Paid ?? 0}% paid`} />
          </div>
        </div>
        {doc?.Notes && (
          <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            <p className="text-xs text-amber-800">Notes: {doc.Notes}</p>
          </div>
        )}
        {Array.isArray(doc?.financial_doc_items) && doc.financial_doc_items.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Items</p>
            {doc.financial_doc_items.map((item: any, idx: number) => <FinancialDocItem key={item?.ID_FDItem ?? idx} item={item} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TransactionCard({ doc, type }: { doc: any; type: "invoice" | "bill" }) {
  return (
    <Card className={`border-l-4 ${type === "invoice" ? "border-l-emerald-300" : "border-l-orange-300"}`}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BanknoteIcon className={`h-4 w-4 flex-shrink-0 ${type === "invoice" ? "text-emerald-500" : "text-orange-400"}`} />
            <div className="min-w-0">
              <div className="font-semibold text-sm">{doc?.Reference_number || "—"}</div>
              <div className="text-xs text-muted-foreground">{doc?.Type_of_transaction || "Payment"} · ID: {doc?.ID_FTransaction ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-xs text-muted-foreground space-y-0.5 text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Calendar className="h-3 w-3" /> Payment Date: {fmtDate(doc?.Date_of_payment)}
              </div>
              <div>Payment Type: {doc?.Type_of_payment || "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="text-base font-semibold">{fmtMoney(Number(doc?.Total_Amount || 0))}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PRICING_TARGET_OPTIONS = ["Yes", "No", "Leadership Approval"] as const

export function JobPricingTab({
  role, jobId, job, isFieldChanged, onPricingFieldChange,
  onMultipliersChanged, onAdjPricingCalculated, onSyncComplete,
  onReload, syncPodio = false, onJobUpdate: onPatchJob,
  onPricingTargetChange,
}: Props) {
  const pricingSources = [job?.pricingData ?? job, job]

  // ── Existing pricing fields ───────────────────────────────────────────────
  const gqmFormula            = getOptionalNumber(pricingSources, ["Gqm_formula_pricing"])
  const gqmAdjFormula         = getOptionalNumber(pricingSources, ["Gqm_adj_formula_pricing"])
  const gqmTargetReturnRaw    = getOptionalNumber(pricingSources, ["Gqm_target_return"])
  const gqmTargetSold         = getOptionalNumber(pricingSources, ["Gqm_target_sold_pricing"])
  const gqmPremium            = getOptionalNumber(pricingSources, ["Gqm_premium_in_money"])
  const gqmFinalSold          = getOptionalNumber(pricingSources, ["Gqm_final_sold_pricing"])
  const gqmFinalPercentageRaw = getOptionalNumber(pricingSources, ["Gqm_final_percentage"])

  // ── NEW: Initial Proposal fields ─────────────────────────────────────────
  const estimatedRent      = getOptionalNumber(pricingSources, ["Estimated_rent"])
  const estimatedMaterial  = getOptionalNumber(pricingSources, ["Estimated_material"])
  const estimatedCity      = getOptionalNumber(pricingSources, ["Estimated_city"])
  const techFormulaPricing = getOptionalNumber(pricingSources, ["Tech_formula_pricing"])

  // ── NEW: Pricing Target ──────────────────────────────────────────────────
  const pricingTarget = getOptionalString(pricingSources, ["Pricing_target"])

  // ── NEW: Accounts Receivable fields ──────────────────────────────────────
  const accReceivable        = getOptionalNumber(pricingSources, ["Acc_receivable"])
  const gqmFinalFormPricing  = getOptionalNumber(pricingSources, ["Gqm_final_form_pricing"])
  const gqmFinalAdjForm      = getOptionalNumber(pricingSources, ["Gqm_final_adj_form_pricing"])
  const gqmFinalTargetReturn = getOptionalNumber(pricingSources, ["Gqm_final_target_return"])
  const gqmFinalPremInMoney  = getOptionalNumber(pricingSources, ["Gqm_final_prem_in_money"])

  // ── Text states: existing ─────────────────────────────────────────────────
  const [gqmFormulaText,         setGqmFormulaText]         = useState(gqmFormula?.toString() ?? "")
  const [gqmAdjFormulaText,      setGqmAdjFormulaText]      = useState(gqmAdjFormula?.toString() ?? "")
  const [gqmTargetReturnText,    setGqmTargetReturnText]    = useState(gqmTargetReturnRaw != null ? String(gqmTargetReturnRaw * 100) : "")
  const [gqmTargetSoldText,      setGqmTargetSoldText]      = useState(gqmTargetSold?.toString() ?? "")
  const [gqmPremiumText,         setGqmPremiumText]         = useState(gqmPremium?.toString() ?? "")
  const [gqmFinalSoldText,       setGqmFinalSoldText]       = useState(gqmFinalSold?.toString() ?? "")
  const [gqmFinalPercentageText, setGqmFinalPercentageText] = useState(gqmFinalPercentageRaw != null ? String(gqmFinalPercentageRaw * 100) : "")

  // ── Text states: NEW Initial Proposal ────────────────────────────────────
  const [estimatedRentText,      setEstimatedRentText]      = useState(estimatedRent?.toString() ?? "")
  const [estimatedMaterialText,  setEstimatedMaterialText]  = useState(estimatedMaterial?.toString() ?? "")
  const [estimatedCityText,      setEstimatedCityText]      = useState(estimatedCity?.toString() ?? "")
  const [techFormulaText,        setTechFormulaText]        = useState(techFormulaPricing?.toString() ?? "")

  // ── Text states: NEW Accounts Receivable ─────────────────────────────────
  const [accReceivableText,        setAccReceivableText]        = useState(accReceivable?.toString() ?? "")
  const [gqmFinalFormText,         setGqmFinalFormText]         = useState(gqmFinalFormPricing?.toString() ?? "")
  const [gqmFinalAdjFormText,      setGqmFinalAdjFormText]      = useState(gqmFinalAdjForm?.toString() ?? "")
  const [gqmFinalTargetReturnText, setGqmFinalTargetReturnText] = useState(gqmFinalTargetReturn?.toString() ?? "")
  const [gqmFinalPremText,         setGqmFinalPremText]         = useState(gqmFinalPremInMoney?.toString() ?? "")

  // ── Sync text states when job reloads: existing ──────────────────────────
  useEffect(() => setGqmFormulaText(gqmFormula?.toString() ?? ""),                                             [gqmFormula])
  useEffect(() => setGqmAdjFormulaText(gqmAdjFormula?.toString() ?? ""),                                      [gqmAdjFormula])
  useEffect(() => setGqmTargetReturnText(gqmTargetReturnRaw != null ? String(gqmTargetReturnRaw * 100) : ""), [gqmTargetReturnRaw])
  useEffect(() => setGqmTargetSoldText(gqmTargetSold?.toString() ?? ""),                                      [gqmTargetSold])
  useEffect(() => setGqmPremiumText(gqmPremium?.toString() ?? ""),                                            [gqmPremium])
  useEffect(() => setGqmFinalSoldText(gqmFinalSold?.toString() ?? ""),                                        [gqmFinalSold])
  useEffect(() => setGqmFinalPercentageText(gqmFinalPercentageRaw != null ? String(gqmFinalPercentageRaw * 100) : ""), [gqmFinalPercentageRaw])

  // ── Sync text states when job reloads: NEW ───────────────────────────────
  useEffect(() => setEstimatedRentText(estimatedRent?.toString() ?? ""),         [estimatedRent])
  useEffect(() => setEstimatedMaterialText(estimatedMaterial?.toString() ?? ""), [estimatedMaterial])
  useEffect(() => setEstimatedCityText(estimatedCity?.toString() ?? ""),         [estimatedCity])
  useEffect(() => setTechFormulaText(techFormulaPricing?.toString() ?? ""),      [techFormulaPricing])
  useEffect(() => setAccReceivableText(accReceivable?.toString() ?? ""),         [accReceivable])
  useEffect(() => setGqmFinalFormText(gqmFinalFormPricing?.toString() ?? ""),    [gqmFinalFormPricing])
  useEffect(() => setGqmFinalAdjFormText(gqmFinalAdjForm?.toString() ?? ""),     [gqmFinalAdjForm])
  useEffect(() => setGqmFinalTargetReturnText(gqmFinalTargetReturn?.toString() ?? ""), [gqmFinalTargetReturn])
  useEffect(() => setGqmFinalPremText(gqmFinalPremInMoney?.toString() ?? ""),    [gqmFinalPremInMoney])

  // financial docs
  const financialDocs: any[] = Array.isArray(job?.financial_docs) ? job.financial_docs : Array.isArray(job?.financialDocs) ? job.financialDocs : []
  const invoices = financialDocs.filter((d) => String(d?.Type_of_document ?? d?.type ?? "").toLowerCase() === "invoice")
  const bills    = financialDocs.filter((d) => String(d?.Type_of_document ?? d?.type ?? "").toLowerCase() === "bill")
  const invoicesTotal              = invoices.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)
  const billsTotal                 = bills.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)
  const invoicesTransactions       = invoices.flatMap((d) => d?.financial_transactions ?? [])
  const billsTransactions          = bills.flatMap((d) => d?.financial_transactions ?? [])
  const invoicesTransactionsTotal  = invoicesTransactions.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)
  const billsTransactionsTotal     = billsTransactions.reduce((s, d) => s + (Number(d?.Total_Amount) || 0), 0)

  // inner tabs
  const [activeTab, setActiveTab] = useState<"analysis" | "invoices" | "bills">("analysis")

  // QBO auto-sync state
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle")
  const [syncError, setSyncError] = useState<string | null>(null)

  const jobYear = useMemo(() => resolveJobYear(job), [job])
  const jobCode = useMemo(() => resolveJobCode(job), [job])

  const onSyncCompleteRef = useRef(onSyncComplete)
  useEffect(() => { onSyncCompleteRef.current = onSyncComplete }, [onSyncComplete])

  const syncAttemptedRef = useRef(false)

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
      console.error("[QBO sync] error:", err)
      setSyncError(err instanceof Error ? err.message : "Unknown error")
      setSyncPhase("error")
    }
  }

  useEffect(() => {
    if (activeTab !== "invoices" && activeTab !== "bills") return
    if (syncAttemptedRef.current) return

    const code = resolveJobCode(job)
    const year = resolveJobYear(job)
    const hasDocs = hasFinancialDocs(job)

    if (!code) return
    if (year === null || year >= 2026) return
    if (hasDocs) return

    syncAttemptedRef.current = true
    setSyncPhase("checking")

    const timer = setTimeout(() => { void runSync(code) }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ── Early return for LEAD_TECHNICIAN ─────────────────────────────────────
  if (role === "LEAD_TECHNICIAN") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><LeadTechnicianPricingView jobId={jobId} job={job} /></div>
        <div className="lg:col-span-1"><TechnicianJobSidebar job={job} subcontractor={job?.subcontractors?.[0]} /></div>
      </div>
    )
  }

  // pricing derived values
  const formula = gqmFormula ?? null
  const applicableMultiplier = formula != null ? findApplicableMultiplier(formula, job?.multipliers || []) : null
  const recommendedAdj = formula != null && applicableMultiplier ? formula * Number(applicableMultiplier.Multiplier) : null
  const recommendedTargetReturn = gqmTargetSold != null && gqmTargetSold > 0 && (gqmAdjFormula ?? recommendedAdj) != null
    ? (gqmTargetSold - (gqmAdjFormula ?? recommendedAdj!)) / gqmTargetSold : null
  const recommendedPremium = gqmTargetSold != null && (gqmAdjFormula ?? recommendedAdj) != null
    ? gqmTargetSold - (gqmAdjFormula ?? recommendedAdj!) : null
  const recommendedFinalPercentage = gqmFinalSold != null && gqmFinalSold > 0 && (gqmAdjFormula ?? recommendedAdj) != null
    ? (gqmFinalSold - (gqmAdjFormula ?? recommendedAdj!)) / gqmFinalSold : null

  const commitNumber = (field: string, text: string, transform?: (n: number) => number) => {
    const parsed = parseNumberInput(text)
    if (parsed.kind !== "number") return
    onPricingFieldChange(field, transform ? transform(parsed.value) : parsed.value)
  }

  const isSyncing = syncPhase === "checking" || syncPhase === "syncing" || syncPhase === "reloading"

  // ── Fallback noops ────────────────────────────────────────────────────────
  const handleJobUpdate = onPatchJob ?? (async () => {})
  const handleReload    = onReload   ?? (async () => {})

  return (
    <>
      {/* Tab bar */}
      <div className="mb-4">
        <div className="inline-flex rounded-lg border bg-gray-50 p-1 gap-1">
          {(["analysis", "invoices", "bills"] as const).map((tab) => (
            <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab)} className="capitalize">
              {tab}
              {tab === "invoices" && invoices.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{invoices.length}</Badge>}
              {tab === "bills" && bills.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{bills.length}</Badge>}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Analysis tab ─────────────────────────────────────────────────── */}
      {activeTab === "analysis" && (
        <>
          {job?.ID_Jobs && gqmFormula != null && (
            <JobMultipliersManager jobId={job.ID_Jobs} formulaPricing={gqmFormula} multipliers={job?.multipliers || []} onMultipliersChanged={onMultipliersChanged} onAdjPricingCalculated={onAdjPricingCalculated} />
          )}

          {/* ── NEW: Initial Proposal Pricing ────────────────────────────── */}
          <Card>
            <CardHeader><CardTitle>Initial Proposal Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="mb-2 block text-sm">Estimated Rent</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={estimatedRentText}
                  onChange={(e) => setEstimatedRentText(e.target.value)}
                  onBlur={() => commitNumber("estimatedRent", estimatedRentText)}
                  className={isFieldChanged("pricing.estimatedRent") ? "border-yellow-400 border-2" : ""}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">Estimated Materials</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={estimatedMaterialText}
                  onChange={(e) => setEstimatedMaterialText(e.target.value)}
                  onBlur={() => commitNumber("estimatedMaterial", estimatedMaterialText)}
                  className={isFieldChanged("pricing.estimatedMaterial") ? "border-yellow-400 border-2" : ""}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">Estimated City</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={estimatedCityText}
                  onChange={(e) => setEstimatedCityText(e.target.value)}
                  onBlur={() => commitNumber("estimatedCity", estimatedCityText)}
                  className={isFieldChanged("pricing.estimatedCity") ? "border-yellow-400 border-2" : ""}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">Tech Formula Pricing</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={techFormulaText}
                  onChange={(e) => setTechFormulaText(e.target.value)}
                  onBlur={() => commitNumber("techFormulaPricing", techFormulaText)}
                  className={isFieldChanged("pricing.techFormulaPricing") ? "border-yellow-400 border-2" : ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Existing: Pricing Analysis ───────────────────────────────── */}
          <Card>
            <CardHeader><CardTitle>Pricing Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Base Project Costs</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-2 block text-sm">GQM (Formula) Pricing</Label>
                    <Input type="text" inputMode="decimal" value={gqmFormulaText} onChange={(e) => setGqmFormulaText(e.target.value)} onBlur={() => commitNumber("gqmFormulaPricing", gqmFormulaText)} className={isFieldChanged("pricing.gqmFormulaPricing") ? "border-yellow-400 border-2" : ""} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">GQM (Adj Formula) Pricing</Label>
                    <Input type="text" inputMode="decimal" value={gqmAdjFormulaText} placeholder={recommendedAdj != null ? String(recommendedAdj.toFixed(2)) : ""} onChange={(e) => setGqmAdjFormulaText(e.target.value)} onBlur={() => commitNumber("gqmAdjFormulaPricing", gqmAdjFormulaText)} className={isFieldChanged("pricing.gqmAdjFormulaPricing") ? "border-yellow-400 border-2" : ""} />
                    {formula != null && !applicableMultiplier && (
                      <p className="text-xs text-muted-foreground mt-1">No multiplier applies to this Formula Pricing. Create one in the correct range to see the recommended Adj Formula.</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Target Pricing & Returns</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-2 block text-sm">GQM (Target) Return %</Label>
                    <Input type="text" inputMode="decimal" value={gqmTargetReturnText} placeholder={recommendedTargetReturn != null ? String((recommendedTargetReturn * 100).toFixed(2)) : ""} onChange={(e) => setGqmTargetReturnText(e.target.value)} onBlur={() => commitNumber("gqmTargetReturn", gqmTargetReturnText, (n) => n / 100)} className={isFieldChanged("pricing.gqmTargetReturn") ? "border-yellow-400 border-2" : ""} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">GQM (Target) Sold Pricing</Label>
                    <Input type="text" inputMode="decimal" value={gqmTargetSoldText} onChange={(e) => setGqmTargetSoldText(e.target.value)} onBlur={() => commitNumber("gqmTargetSoldPricing", gqmTargetSoldText)} className={isFieldChanged("pricing.gqmTargetSoldPricing") ? "border-yellow-400 border-2" : ""} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">GQM (Premium in $)</Label>
                    <Input type="text" inputMode="decimal" value={gqmPremiumText} placeholder={recommendedPremium != null ? String(recommendedPremium.toFixed(2)) : ""} onChange={(e) => setGqmPremiumText(e.target.value)} onBlur={() => commitNumber("gqmPremiumInMoney", gqmPremiumText)} className={isFieldChanged("pricing.gqmPremiumInMoney") ? "border-yellow-400 border-2" : ""} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Final Pricing & Returns</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-2 block text-sm">GQM (Final Sold) Pricing</Label>
                    <Input
                      type="text" inputMode="decimal"
                      value={gqmFinalSoldText}
                      onChange={(e) => setGqmFinalSoldText(e.target.value)}
                      onBlur={() => commitNumber("gqmFinalSoldPricing", gqmFinalSoldText)}
                      className={isFieldChanged("pricing.gqmFinalSoldPricing") ? "border-yellow-400 border-2" : ""}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Automatically adjusted when Change Orders are created, edited, or deleted.
                    </p>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">GQM (Final) %</Label>
                    <Input type="text" inputMode="decimal" value={gqmFinalPercentageText} placeholder={recommendedFinalPercentage != null ? String((recommendedFinalPercentage * 100).toFixed(2)) : ""} onChange={(e) => setGqmFinalPercentageText(e.target.value)} onBlur={() => commitNumber("gqmFinalPercentage", gqmFinalPercentageText, (n) => n / 100)} className={isFieldChanged("pricing.gqmFinalPercentage") ? "border-yellow-400 border-2" : ""} />
                  </div>
                </div>
              </div>

              {/* ── NEW: Pricing Target ─────────────────────────────────── */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Target</h3>
                <div>
                  <Label className="mb-2 block text-sm">Pricing Target</Label>
                  <Select
                    value={pricingTarget ?? ""}
                    onValueChange={(v) => onPricingTargetChange?.(v || null)}
                  >
                    <SelectTrigger className={isFieldChanged("pricing.pricingTarget") ? "border-yellow-400 border-2" : ""}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_TARGET_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Change Orders CRUD ────────────────────────────────────────── */}
          <ChangeOrdersSection
            job={job}
            syncPodio={syncPodio}
            jobYear={jobYear ?? undefined}
            onReload={handleReload}
            onPatchJob={handleJobUpdate}
          />

          {/* ── NEW: Accounts Receivable ─────────────────────────────────── */}
          <Card>
            <CardHeader><CardTitle>Accounts Receivable</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="mb-2 block text-sm">Accounts Receivable</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={accReceivableText}
                  onChange={(e) => setAccReceivableText(e.target.value)}
                  onBlur={() => commitNumber("accReceivable", accReceivableText)}
                  className={isFieldChanged("pricing.accReceivable") ? "border-yellow-400 border-2" : ""}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">GQM Final Form Pricing</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={gqmFinalFormText}
                  onChange={(e) => setGqmFinalFormText(e.target.value)}
                  onBlur={() => commitNumber("gqmFinalFormPricing", gqmFinalFormText)}
                  className={isFieldChanged("pricing.gqmFinalFormPricing") ? "border-yellow-400 border-2" : ""}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">GQM Final Adj. Form Pricing</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={gqmFinalAdjFormText}
                  onChange={(e) => setGqmFinalAdjFormText(e.target.value)}
                  onBlur={() => commitNumber("gqmFinalAdjFormPricing", gqmFinalAdjFormText)}
                  className={isFieldChanged("pricing.gqmFinalAdjFormPricing") ? "border-yellow-400 border-2" : ""}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">GQM Final Target Return</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={gqmFinalTargetReturnText}
                  onChange={(e) => setGqmFinalTargetReturnText(e.target.value)}
                  onBlur={() => commitNumber("gqmFinalTargetReturn", gqmFinalTargetReturnText)}
                  className={isFieldChanged("pricing.gqmFinalTargetReturn") ? "border-yellow-400 border-2" : ""}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">GQM Final Premium in Money</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={gqmFinalPremText}
                  onChange={(e) => setGqmFinalPremText(e.target.value)}
                  onBlur={() => commitNumber("gqmFinalPremInMoney", gqmFinalPremText)}
                  className={isFieldChanged("pricing.gqmFinalPremInMoney") ? "border-yellow-400 border-2" : ""}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Invoices tab ─────────────────────────────────────────────────── */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          <SyncBanner phase={syncPhase} jobYear={jobYear} errorMessage={syncError} onRetry={() => { syncAttemptedRef.current = false; setSyncPhase("idle") }} />
          {isSyncing ? (
            <DocsSkeleton accentColor="border-l-emerald-200" />
          ) : (
            <>
              <div className="space-y-3">
                <SectionHeader icon={FileText} title="Invoices" total={invoicesTotal} colorClass="text-emerald-500" />
                {invoices.length === 0 ? <EmptyState message="No invoices for this job" /> : invoices.map((doc: any) => <InvoiceCard key={doc?.ID_FinancialDoc ?? doc?.qbo_id ?? Math.random()} doc={doc} />)}
              </div>
              <div className="space-y-3">
                <SectionHeader icon={BanknoteIcon} title="Invoice Payments" total={invoicesTransactionsTotal} totalLabel="Total Payments" colorClass="text-emerald-400" />
                {invoicesTransactions.length === 0 ? <EmptyState message="No payments yet for this job" /> : invoicesTransactions.map((doc: any) => <TransactionCard key={doc?.ID_FTransaction ?? Math.random()} doc={doc} type="invoice" />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bills tab ────────────────────────────────────────────────────── */}
      {activeTab === "bills" && (
        <div className="space-y-6">
          <SyncBanner phase={syncPhase} jobYear={jobYear} errorMessage={syncError} onRetry={() => { syncAttemptedRef.current = false; setSyncPhase("idle") }} />
          {isSyncing ? (
            <DocsSkeleton accentColor="border-l-orange-200" />
          ) : (
            <>
              <div className="space-y-3">
                <SectionHeader icon={DollarSign} title="Bills" total={billsTotal} colorClass="text-orange-500" />
                {bills.length === 0 ? <EmptyState message="No bills for this job" /> : bills.map((doc: any) => <BillCard key={doc?.ID_FinancialDoc ?? doc?.qbo_id ?? Math.random()} doc={doc} />)}
              </div>
              <div className="space-y-3">
                <SectionHeader icon={BanknoteIcon} title="Bill Payments" total={billsTransactionsTotal} totalLabel="Total Bill Payments" colorClass="text-orange-400" />
                {billsTransactions.length === 0 ? <EmptyState message="No bill payments for this job" /> : billsTransactions.map((doc: any) => <TransactionCard key={doc?.ID_FTransaction ?? Math.random()} doc={doc} type="bill" />)}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}