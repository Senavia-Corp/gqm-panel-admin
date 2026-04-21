"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X, FilePlus2, DollarSign, Hash, Layers, Tag,
  Ruler, Package, ChevronDown, Loader2, CheckCircle2,
  Zap, ZapOff, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/apiFetch"
import type { EstimateItem } from "@/lib/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_BASE = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
const FIELD_ERR  = "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200"

const COST_TYPES   = ["Subcontractor", "Rent", "Permit", "BDF", "PTLGCF", "Labor", "Equipment", "Other"] as const
const MARKUP_TYPES = ["%", "$"] as const
const BDF_MAX      = 3   // Podio hard limit

const PODIO_SYNC_TYPES = new Set(["BDF", "PTLGCF"])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400">*</span>}
    </label>
  )
}
function FG({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

function NativeSelect({ value, options, onChange, disabled }: {
  value: string; options: readonly string[]
  onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${FIELD_BASE} appearance-none pr-8 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

function PodioToggle({ value, onChange, jobYear, disabled }: {
  value: boolean; onChange: (v: boolean) => void
  jobYear?: number; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
        value
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {value
        ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500 flex-shrink-0" />
        : <ZapOff className="h-4 w-4 flex-shrink-0" />
      }
      <div className="flex-1 text-left">
        <span className="text-xs font-semibold">Sync to Podio {value ? "ON" : "OFF"}</span>
        {value && jobYear && (
          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            {jobYear}
          </span>
        )}
        {value && !jobYear && (
          <span className="ml-2 text-[10px] text-red-500">Year not resolved — sync may fail</span>
        )}
      </div>
    </button>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  Title: string; Cost_Code: string; Category: string; Parent_Group: string
  Description: string; Quantity: string; Unit: string; Unit_Cost: string
  Cost_Type: string; Builder_Cost: string; Client_Price: string
  Markup: string; Markup_Type: string; Margin: string
  Percent_Invoiced: string; Internal_Notes: string
}

const EMPTY_FORM: FormState = {
  Title: "", Cost_Code: "", Category: "", Parent_Group: "",
  Description: "", Quantity: "1", Unit: "", Unit_Cost: "0",
  Cost_Type: "Subcontractor", Builder_Cost: "0", Client_Price: "0",
  Markup: "0", Markup_Type: "%", Margin: "0", Percent_Invoiced: "0",
  Internal_Notes: "",
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  jobId: string
  jobYear?: number
  existingBdfCount?: number   // how many BDF costs already exist (enforces 3-slot limit)
  onCreated: (item: EstimateItem) => void
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateEstimateItemDialog({
  open, onOpenChange, jobId, jobYear, existingBdfCount = 0, onCreated,
}: Props) {
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors]       = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading]     = useState(false)
  const [section, setSection]     = useState<"basic" | "costs">("basic")
  const [syncPodio, setSyncPodio] = useState(false)

  // Reset sync toggle when Cost_Type changes away from sync-relevant types
  useEffect(() => {
    if (!PODIO_SYNC_TYPES.has(form.Cost_Type)) setSyncPodio(false)
  }, [form.Cost_Type])

  const set = <K extends keyof FormState>(key: K, val: string) => {
    setForm((p) => ({ ...p, [key]: val }))
    setErrors((p) => { const n = { ...p }; delete n[key]; return n })
  }

  const handleQtyOrUnitCostChange = (key: "Quantity" | "Unit_Cost", val: string) => {
    const qty = key === "Quantity"  ? parseFloat(val) || 0 : parseFloat(form.Quantity) || 0
    const uc  = key === "Unit_Cost" ? parseFloat(val) || 0 : parseFloat(form.Unit_Cost) || 0
    setForm((p) => ({ ...p, [key]: val, Builder_Cost: (qty * uc).toFixed(2) }))
    setErrors((p) => { const n = { ...p }; delete n[key]; return n })
  }

  const isBdfAtLimit = form.Cost_Type === "BDF" && existingBdfCount >= BDF_MAX
  const isSyncType   = PODIO_SYNC_TYPES.has(form.Cost_Type)

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!form.Title.trim())     errs.Title     = "Required"
    if (!form.Cost_Code.trim()) errs.Cost_Code = "Required"
    const qty = parseFloat(form.Quantity)
    if (isNaN(qty) || qty < 0) errs.Quantity = "Must be ≥ 0"
    if (isBdfAtLimit)          errs.Cost_Type = `Maximum ${BDF_MAX} BDF costs reached (Podio limit)`
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) { setSection("basic"); return }
    setLoading(true)
    try {
      const payload = {
        Title:            form.Title.trim(),
        Cost_code:        form.Cost_Code.trim(),
        Category:         form.Category.trim() || null,
        Parent_group:     form.Parent_Group.trim() || null,
        Description:      form.Description.trim() || null,
        Quatity:          parseFloat(form.Quantity) || 0,
        Unit:             form.Unit.trim() || null,
        Unit_cost:        parseFloat(form.Unit_Cost) || 0,
        Cost_type:        form.Cost_Type || null,
        Builder_cost:     parseFloat(form.Builder_Cost) || 0,
        Client_price:     parseFloat(form.Client_Price) || 0,
        Markup:           parseFloat(form.Markup) || 0,
        Margin:           parseFloat(form.Margin) || 0,
        Percent_invoiced: parseFloat(form.Percent_Invoiced) || 0,
        ID_Jobs:          jobId,
        ID_Order:         null,
      }

      const res = await apiFetch("/api/estimate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.error ?? `Error ${res.status}`)
      }

      const created = await res.json()

      // If BDF or PTLGCF with sync ON → push recalculated values to Podio.
      // recalculate_and_apply already ran in estimate_routes, so DB is up to date.
      if (isSyncType && syncPodio) {
        await patchJobForPodioSync(jobId, jobYear)
      }

      const item: EstimateItem = {
        ID_EstimateItem:          created.ID_EstimateCost ?? created.ID_EstimateItem ?? "",
        ID_Jobs:                  jobId,
        Title:                    created.Title ?? form.Title,
        Cost_Code:                created.Cost_code ?? created.Cost_Code ?? form.Cost_Code,
        Category:                 created.Category ?? form.Category,
        Parent_Group:             created.Parent_group ?? created.Parent_Group ?? form.Parent_Group,
        Parent_Group_Description: "",
        Subgroup:                 "",
        Subgroup_Description:     "",
        Option_Type:              "",
        Line_Item_Type:           "",
        Description:              created.Description ?? form.Description,
        Quantity:                 (created.Quatity ?? parseFloat(form.Quantity)) || 0,
        Unit:                     created.Unit ?? form.Unit,
        Unit_Cost:                (created.Unit_cost ?? parseFloat(form.Unit_Cost)) || 0,
        Cost_Type:                created.Cost_type ?? form.Cost_Type as any,
        Marked_As:                "",
        Builder_Cost:             (created.Builder_cost ?? parseFloat(form.Builder_Cost)) || 0,
        Markup:                   (created.Markup ?? parseFloat(form.Markup)) || 0,
        Markup_Type:              form.Markup_Type as any,
        Unit_Price:               0,
        Client_Price:             (created.Client_price ?? parseFloat(form.Client_Price)) || 0,
        Margin:                   (created.Margin ?? parseFloat(form.Margin)) || 0,
        Profit:                   (parseFloat(form.Client_Price) || 0) - (parseFloat(form.Builder_Cost) || 0),
        Percent_Invoiced:         (created.Percent_invoiced ?? parseFloat(form.Percent_Invoiced)) || 0,
        Internal_Notes:           form.Internal_Notes,
        ID_Order:                 null,
      }

      toast.success("Estimate cost created")
      onCreated(item)
      onOpenChange(false)
      setForm(EMPTY_FORM)
      setSyncPodio(false)
      setSection("basic")
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create estimate cost")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const basicComplete = form.Title.trim() && form.Cost_Code.trim()

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onOpenChange(false) }}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "calc(100vh - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <FilePlus2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">New Estimate Cost</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Job: <span className="font-mono">{jobId}</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !loading && onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-6 pt-3 flex-shrink-0">
          {(["basic", "costs"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSection(s)}
              className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
                section === s ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {s === "basic"
                ? <><Tag className="h-3.5 w-3.5" /> Basic Info</>
                : <><DollarSign className="h-3.5 w-3.5" /> Pricing</>
              }
              {s === "basic" && basicComplete && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* BASIC INFO */}
          {section === "basic" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FG>
                  <FL required>Title</FL>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="text" value={form.Title} onChange={(e) => set("Title", e.target.value)}
                      placeholder="e.g. Drywall Installation"
                      className={`${FIELD_BASE} pl-9 ${errors.Title ? FIELD_ERR : ""}`}
                    />
                  </div>
                  {errors.Title && <p className="text-[11px] text-red-500">{errors.Title}</p>}
                </FG>
                <FG>
                  <FL required>Cost Code</FL>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="text" value={form.Cost_Code} onChange={(e) => set("Cost_Code", e.target.value)}
                      placeholder="e.g. 09-2100"
                      className={`${FIELD_BASE} pl-9 font-mono ${errors.Cost_Code ? FIELD_ERR : ""}`}
                    />
                  </div>
                  {errors.Cost_Code && <p className="text-[11px] text-red-500">{errors.Cost_Code}</p>}
                </FG>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FG>
                  <FL>Category</FL>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="text" value={form.Category} onChange={(e) => set("Category", e.target.value)}
                      placeholder="e.g. Finishes" className={`${FIELD_BASE} pl-9`} />
                  </div>
                </FG>
                <FG>
                  <FL>Parent Group</FL>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="text" value={form.Parent_Group} onChange={(e) => set("Parent_Group", e.target.value)}
                      placeholder="e.g. Interior Work" className={`${FIELD_BASE} pl-9`} />
                  </div>
                </FG>
              </div>

              <FG>
                <FL>Description</FL>
                <textarea value={form.Description} onChange={(e) => set("Description", e.target.value)}
                  rows={3} placeholder="Optional — describe the scope of work…"
                  className={`${FIELD_BASE} resize-none leading-relaxed`}
                />
              </FG>

              <div className="grid gap-4 sm:grid-cols-3">
                <FG>
                  <FL>Cost Type</FL>
                  <NativeSelect value={form.Cost_Type} options={COST_TYPES} onChange={(v) => set("Cost_Type", v)} />
                  {errors.Cost_Type && <p className="text-[11px] text-red-500">{errors.Cost_Type}</p>}

                  {/* BDF limit warning */}
                  {form.Cost_Type === "BDF" && isBdfAtLimit && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-700">
                        Maximum {BDF_MAX} BDF costs reached. Podio only supports {BDF_MAX} building dept fee fields.
                        Delete an existing BDF cost before adding a new one.
                      </p>
                    </div>
                  )}

                  {/* BDF slot info when under limit */}
                  {form.Cost_Type === "BDF" && !isBdfAtLimit && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Will occupy slot {existingBdfCount + 1} of {BDF_MAX} in Podio.
                      Values are compacted left-to-right — deletions shift remaining values up.
                    </p>
                  )}
                </FG>
                <FG>
                  <FL>Quantity</FL>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="number" min={0} step="any" value={form.Quantity}
                      onChange={(e) => handleQtyOrUnitCostChange("Quantity", e.target.value)}
                      className={`${FIELD_BASE} pl-9 ${errors.Quantity ? FIELD_ERR : ""}`}
                    />
                  </div>
                  {errors.Quantity && <p className="text-[11px] text-red-500">{errors.Quantity}</p>}
                </FG>
                <FG>
                  <FL>Unit</FL>
                  <input type="text" value={form.Unit} onChange={(e) => set("Unit", e.target.value)}
                    placeholder="e.g. SF, LF, EA" className={FIELD_BASE} />
                </FG>
              </div>

              {/* Podio sync toggle — BDF (under limit) and PTLGCF */}
              {isSyncType && !isBdfAtLimit && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Podio Sync</p>
                  <p className="text-[11px] text-slate-400">
                    {form.Cost_Type === "BDF"
                      ? `After saving, the updated Bldg_dept_fees array will be pushed to Podio.`
                      : "After saving, the updated Ptl_gc_fee will be pushed to Podio."
                    }
                  </p>
                  <PodioToggle value={syncPodio} onChange={setSyncPodio} jobYear={jobYear} />
                </div>
              )}

              <button type="button" onClick={() => setSection("costs")}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Next: Pricing <DollarSign className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* COSTS */}
          {section === "costs" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FG>
                  <FL>Unit Cost ($)</FL>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="number" min={0} step="any" value={form.Unit_Cost}
                      onChange={(e) => handleQtyOrUnitCostChange("Unit_Cost", e.target.value)}
                      className={`${FIELD_BASE} pl-9`} />
                  </div>
                </FG>
                <FG>
                  <FL>Builder Cost ($) <span className="ml-1 text-[10px] text-slate-400 normal-case font-normal">(auto: qty × unit cost)</span></FL>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="number" min={0} step="any" value={form.Builder_Cost}
                      onChange={(e) => set("Builder_Cost", e.target.value)}
                      className={`${FIELD_BASE} pl-9`} />
                  </div>
                </FG>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FG>
                  <FL>Client Price ($)</FL>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="number" min={0} step="any" value={form.Client_Price}
                      onChange={(e) => set("Client_Price", e.target.value)}
                      className={`${FIELD_BASE} pl-9`} />
                  </div>
                </FG>
                <FG>
                  <FL>Markup</FL>
                  <div className="flex gap-2">
                    <input type="number" min={0} step="any" value={form.Markup}
                      onChange={(e) => set("Markup", e.target.value)}
                      className={`${FIELD_BASE} flex-1`} />
                    <NativeSelect value={form.Markup_Type} options={MARKUP_TYPES} onChange={(v) => set("Markup_Type", v)} />
                  </div>
                </FG>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FG>
                  <FL>Margin (%)</FL>
                  <input type="number" min={0} max={100} step="any" value={form.Margin}
                    onChange={(e) => set("Margin", e.target.value)} className={FIELD_BASE} />
                </FG>
                <FG>
                  <FL>% Invoiced</FL>
                  <input type="number" min={0} max={100} step="any" value={form.Percent_Invoiced}
                    onChange={(e) => set("Percent_Invoiced", e.target.value)} className={FIELD_BASE} />
                </FG>
              </div>

              {(() => {
                const profit = (parseFloat(form.Client_Price) || 0) - (parseFloat(form.Builder_Cost) || 0)
                const isPos  = profit >= 0
                return (
                  <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isPos ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <p className={`text-sm font-semibold ${isPos ? "text-emerald-700" : "text-red-600"}`}>Estimated Profit</p>
                    <p className={`text-lg font-black ${isPos ? "text-emerald-800" : "text-red-700"}`}>
                      {isPos ? "+" : ""}${profit.toFixed(2)}
                    </p>
                  </div>
                )
              })()}

              <FG>
                <FL>Internal Notes</FL>
                <textarea value={form.Internal_Notes} onChange={(e) => set("Internal_Notes", e.target.value)}
                  rows={2} placeholder="Optional internal notes…"
                  className={`${FIELD_BASE} resize-none`} />
              </FG>

              {/* Sync reminder in costs tab */}
              {isSyncType && syncPodio && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500 flex-shrink-0" />
                  <p className="text-[11px] text-emerald-700">
                    <span className="font-semibold">Podio sync ON</span> — the updated{" "}
                    {form.Cost_Type === "BDF" ? "Bldg_dept_fees array" : "Ptl_gc_fee"} will be pushed
                    to Podio{jobYear ? ` (${jobYear})` : ""} after creating.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {(["basic", "costs"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setSection(s)}
                className={`h-2 w-2 rounded-full transition-all ${section === s ? "bg-emerald-500 w-4" : "bg-slate-200 hover:bg-slate-300"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => !loading && onOpenChange(false)} disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading || isBdfAtLimit}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                : <><FilePlus2 className="h-4 w-4" /> Create Cost</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function patchJobForPodioSync(jobId: string, jobYear?: number): Promise<void> {
  const qs = new URLSearchParams({ sync_podio: "true" })
  if (jobYear) qs.set("year", String(jobYear))
  const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?${qs.toString()}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error ?? (err as any)?.detail ?? `Podio sync failed (${res.status})`)
  }
}