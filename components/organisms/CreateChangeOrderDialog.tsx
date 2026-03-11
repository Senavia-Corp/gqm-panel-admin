"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Loader2, X, Zap, ZapOff, FilePlus2, FilePen,
  DollarSign, Tag, AlignLeft, CheckCircle2, Clock, XCircle, ChevronDown,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type State = "Pending" | "Approved" | "Rejected" | ""

// ─── Shared lookup maps (module scope) ───────────────────────────────────────

const stateIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Pending:  Clock,
  Approved: CheckCircle2,
  Rejected: XCircle,
}

const stateColorMap: Record<string, string> = {
  Pending:  "text-amber-700",
  Approved: "text-emerald-700",
  Rejected: "text-red-600",
}

// ─── Custom state dropdown (avoids shadcn portal z-index conflicts) ──────────

function StateSelect({ value, onChange, error }: {
  value: State; onChange: (v: State) => void; error?: string
}) {
  const [open, setOpen] = useState(false)
  const Icon = value ? stateIconMap[value] : null
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-full items-center justify-between rounded-xl border px-3 text-sm transition-all ${
          error ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
        }`}
      >
        {value ? (
          <span className={`flex items-center gap-1.5 font-medium ${stateColorMap[value] ?? "text-slate-700"}`}>
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {value}
          </span>
        ) : (
          <span className="text-slate-400">Select state…</span>
        )}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-[10001] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {(["Pending", "Approved", "Rejected"] as State[]).map((s) => {
            const SIcon = stateIconMap[s]
            const isSelected = value === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 ${
                  isSelected ? "bg-slate-50 font-semibold" : ""
                } ${stateColorMap[s] ?? "text-slate-700"}`}
              >
                {SIcon && <SIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                {s}
                {isSelected && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

type FormState = {
  Name: string
  Description: string
  ChangeOrderFormula: string
  State: State
  syncPodio: boolean
}

type Mode = "create" | "edit"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: Mode
  changeOrderId?: string
  jobId: string
  orderId: string
  jobPodioId?: string
  defaultSyncPodio: boolean
  jobYearForPodioSync?: number
  initialData?: {
    Name?: string | null
    Description?: string | null
    ChangeOrderFormula?: number | string | null
    State?: string | null
  }
  onCreated?: (formula: number) => void
  onUpdated?: (newFormula: number) => void
}

// ─── Design helpers ───────────────────────────────────────────────────────────

const FIELD_BASE = "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all w-full"
const FIELD_ERROR = "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200"

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
      {children}
      {required && <span className="ml-1 text-red-400">*</span>}
    </label>
  )
}

function StateBadge({ state }: { state: State }) {
  const map: Record<string, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    Pending:  { cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
    Approved: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    Rejected: { cls: "bg-red-50 text-red-600 border-red-200",         icon: XCircle },
  }
  const cfg = map[state ?? ""] ?? null
  if (!cfg || !state) return null
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />{state}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const STATES: State[] = ["Pending", "Approved", "Rejected"]

export function CreateChangeOrderDialog({
  open, onOpenChange, mode = "create", changeOrderId,
  jobId, orderId, jobPodioId, defaultSyncPodio, jobYearForPodioSync,
  initialData, onCreated, onUpdated,
}: Props) {
  const isEdit = mode === "edit"
  const initialSync = useMemo(() => defaultSyncPodio, [defaultSyncPodio])

  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState<Partial<Record<keyof FormState, string>>>({})
  const [form, setForm]       = useState<FormState>({
    Name: "", Description: "", ChangeOrderFormula: "", State: "", syncPodio: initialSync,
  })

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm({
      Name:               String(initialData?.Name ?? ""),
      Description:        String(initialData?.Description ?? ""),
      ChangeOrderFormula: initialData?.ChangeOrderFormula == null ? "" : String(initialData.ChangeOrderFormula),
      State:              (initialData?.State as State) ?? "",
      syncPodio:          initialSync,
    })
  }, [open, initialData, initialSync])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => { const n = { ...p }; delete n[key]; return n })
  }

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!form.Name.trim())               errs.Name = "Name is required"
    if (!form.State)                     errs.State = "State is required"
    if (!form.ChangeOrderFormula.trim()) errs.ChangeOrderFormula = "Formula is required"
    else if (Number.isNaN(Number(form.ChangeOrderFormula))) errs.ChangeOrderFormula = "Must be a number"
    if (form.syncPodio && !jobYearForPodioSync) errs.syncPodio = "Year unavailable for Podio sync"
    if (isEdit && !changeOrderId) errs.Name = "Missing change order ID"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const formulaValue = Number(form.ChangeOrderFormula)

    const payload = {
      Name:               form.Name.trim(),
      Description:        form.Description.trim() || null,
      ChangeOrderFormula: formulaValue,
      State:              form.State,
      ID_Jobs:            jobId,
      ID_Order:           orderId,
      job_podio_id:       jobPodioId ?? null,
    }

    const qs = new URLSearchParams()
    qs.set("sync_podio", String(!!form.syncPodio))
    if (form.syncPodio && jobYearForPodioSync) qs.set("year", String(jobYearForPodioSync))

    const url    = isEdit ? `/api/change-order/${encodeURIComponent(String(changeOrderId))}?${qs}` : `/api/change-order?${qs}`
    const method = isEdit ? "PATCH" : "POST"

    try {
      setLoading(true)
      const res = await apiFetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        throw new Error(msg || `Request failed (${res.status})`)
      }
      toast.success(isEdit ? "Change order updated" : "Change order created")
      onOpenChange(false)
      if (isEdit) onUpdated?.(formulaValue)
      else        onCreated?.(formulaValue)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const TitleIcon = isEdit ? FilePen : FilePlus2

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onOpenChange(false) }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(100vh - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
              <TitleIcon className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {isEdit ? "Edit Change Order" : "New Change Order"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Order: {orderId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !loading && onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Name + State row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Name</FieldLabel>
              <input
                type="text"
                value={form.Name}
                onChange={(e) => set("Name", e.target.value)}
                placeholder="e.g. Extra ducts"
                className={`${FIELD_BASE} ${errors.Name ? FIELD_ERROR : ""}`}
              />
              {errors.Name && <p className="mt-1 text-[11px] text-red-500">{errors.Name}</p>}
            </div>

            <div>
              <FieldLabel required>State</FieldLabel>
              <StateSelect
                value={form.State}
                onChange={(v) => set("State", v)}
                error={errors.State}
              />
              {errors.State && <p className="mt-1 text-[11px] text-red-500">{errors.State}</p>}
            </div>
          </div>

          {/* Formula */}
          <div>
            <FieldLabel required>Change Order Formula ($)</FieldLabel>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                inputMode="decimal"
                value={form.ChangeOrderFormula}
                onChange={(e) => set("ChangeOrderFormula", e.target.value)}
                placeholder="e.g. 1250"
                className={`${FIELD_BASE} pl-9 ${errors.ChangeOrderFormula ? FIELD_ERROR : ""}`}
              />
            </div>
            {errors.ChangeOrderFormula && (
              <p className="mt-1 text-[11px] text-red-500">{errors.ChangeOrderFormula}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={form.Description}
              onChange={(e) => set("Description", e.target.value)}
              placeholder="Optional details about this change order…"
              rows={3}
              className={`${FIELD_BASE} resize-none leading-relaxed`}
            />
          </div>

          {/* Podio sync toggle */}
          <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-all ${
            form.syncPodio ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
          }`}>
            <div className="flex items-center gap-2.5">
              {form.syncPodio
                ? <Zap className="h-4 w-4 text-emerald-500 fill-emerald-300 flex-shrink-0" />
                : <ZapOff className="h-4 w-4 text-slate-400 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-semibold ${form.syncPodio ? "text-emerald-800" : "text-slate-600"}`}>
                  Podio Sync {form.syncPodio ? "Enabled" : "Disabled"}
                </p>
                <p className={`text-[11px] ${form.syncPodio ? "text-emerald-600" : "text-slate-400"}`}>
                  {form.syncPodio
                    ? jobYearForPodioSync
                      ? `Will sync to Podio · year ${jobYearForPodioSync}`
                      : "Year not available — sync may fail"
                    : "Changes will only be saved locally"
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => set("syncPodio", !form.syncPodio)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                form.syncPodio ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                form.syncPodio ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {errors.syncPodio && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> {errors.syncPodio}
            </p>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          {/* State preview */}
          <div className="min-w-0">
            {form.State && <StateBadge state={form.State} />}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => !loading && onOpenChange(false)}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><TitleIcon className="h-4 w-4" /> {isEdit ? "Save Changes" : "Create"}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== "undefined" ? document.body : (null as any)
  )
}