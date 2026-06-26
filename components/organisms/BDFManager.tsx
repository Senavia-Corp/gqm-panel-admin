"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  Building2, Plus, Trash2, CheckCircle2, Clock, Loader2,
  DollarSign, AlertTriangle, X, Zap, ZapOff, RefreshCcw,
  FilePlus2, RotateCcw, Pencil, Eye,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { apiFetch } from "@/lib/apiFetch"
import { CreateEstimateItemDialog } from "@/components/organisms/CreateEstimateItemDialog"
import type { BDFStatus, EstimateItem } from "@/lib/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const BDF_MAX = 3

const FIELD_BASE =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

const getId = (it: any) => {
  if (!it) return ""
  return String(
    it.ID_EstimateItem || 
    it.ID_EstimateCost || 
    it.ID_Estimate_Cost || 
    it.id || 
    it.id_estimatecost || 
    it.id_estimate_cost || 
    it.ID_ESTIMATECOST ||
    (it.data && (it.data.ID_EstimateItem || it.data.ID_EstimateCost || it.data.id_estimatecost)) ||
    ""
  )
}

async function patchJobForPodioSync(jobId: string, jobYear?: number) {
  const qs = new URLSearchParams({ sync_podio: "true" })
  if (jobYear) qs.set("year", String(jobYear))
  const res = await apiFetch(`/api/jobs/${encodeURIComponent(jobId)}?${qs.toString()}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error ?? `Podio sync failed (${res.status})`)
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BDFStatus | null }) {
  const t = useTranslations("jobEstimate.bdfManager")
  if (status === "Approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
        <CheckCircle2 className="h-3 w-3" /> {t("statusApproved")}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
      <Clock className="h-3 w-3" /> {t("statusEstimated")}
    </span>
  )
}

// ─── Podio sync toggle (shared) ───────────────────────────────────────────────

function PodioToggle({ value, onChange, jobYear, disabled }: {
  value: boolean; onChange: (v: boolean) => void; jobYear?: number; disabled?: boolean
}) {
  const t = useTranslations("jobEstimate.bdfManager")
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
        value ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {value
        ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500 flex-shrink-0" />
        : <ZapOff className="h-4 w-4 flex-shrink-0" />}
      <div className="flex-1 text-left">
        <span className="text-xs font-semibold">{value ? t("podioSyncOn") : t("podioSyncOff")}</span>
        {value && jobYear && (
          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{jobYear}</span>
        )}
        {value && !jobYear && (
          <span className="ml-2 text-[10px] text-red-500">{t("podioSyncUnresolved")}</span>
        )}
      </div>
    </button>
  )
}

// ─── Amount field helper ──────────────────────────────────────────────────────

function AmountField({ label, value, onChange, disabled, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  disabled?: boolean; error?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
        {label} <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="number" min="0" step="0.01"
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0.00"}
          disabled={disabled}
          className={`${FIELD_BASE} pl-9 ${error ? "border-red-300 bg-red-50" : ""}`}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// ─── Quick Create BDF Dialog ──────────────────────────────────────────────────

interface CreateBDFDialogProps {
  open: boolean
  onClose: () => void
  jobId: string
  jobYear?: number
  existingCount: number
  onCreated: (item: EstimateItem) => void
}

function CreateBDFDialog({ open, onClose, jobId, jobYear, existingCount, onCreated }: CreateBDFDialogProps) {
  const t = useTranslations("jobEstimate.bdfManager")
  const [title, setTitle]             = useState("")
  const [amount, setAmount]           = useState("")
  const [description, setDescription] = useState("")
  const [syncPodio, setSyncPodio]     = useState(true)
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState<{ title?: string; amount?: string; description?: string }>({})

  const atLimit = existingCount >= BDF_MAX
  const reset   = () => { setTitle(""); setAmount(""); setDescription(""); setSyncPodio(false); setErrors({}) }
  const handleClose = () => { if (!loading) { reset(); onClose() } }

  const handleSubmit = async () => {
    const errs: typeof errors = {}
    if (!title.trim())                       errs.title       = t("errRequired")
    if (!description.trim())                 errs.description = t("errRequired")
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed < 0)         errs.amount = t("errInvalidAmount")
    if (atLimit)                             errs.title  = t("bdfLimitExceeded", { max: BDF_MAX })
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const payload = {
        Title: title.trim(), Cost_code: "BDF", Cost_type: "BDF",
        Description: description.trim(),
        Builder_cost: parsed, Client_price: parsed,
        Status: "Estimated", Quatity: 1, Unit_cost: parsed, ID_Jobs: jobId,
      }
      const res = await apiFetch("/api/estimate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error ?? `Error ${res.status}`) }
      const created = await res.json()
      if (syncPodio) await patchJobForPodioSync(jobId, jobYear)

      const newId = getId(created)
      if (!newId) {
        throw new Error("Backend did not return an ID. Response: " + JSON.stringify(created).slice(0, 100))
      }

      const item: EstimateItem = {
        ID_EstimateItem: newId, ID_Jobs: jobId,
        Title: created.Title ?? title, Cost_Code: "BDF", Category: "",
        Parent_Group: "", Parent_Group_Description: "", Subgroup: "",
        Subgroup_Description: "", Option_Type: "", Line_Item_Type: "",
        Description: created.Description ?? description, Quantity: 1, Unit: "", Unit_Cost: parsed,
        Cost_Type: "BDF", Status: "Estimated", Marked_As: "",
        Builder_Cost: parsed, Markup: 0, Markup_Type: "",
        Unit_Price: parsed, Client_Price: parsed,
        Margin: 0, Profit: 0, Percent_Invoiced: 0, Internal_Notes: "", ID_Order: null,
      }
      toast.success(t("toastCreated"))
      onCreated(item)
      reset(); onClose()
    } catch (e: any) {
      toast.error(e?.message ?? t("toastCreateFail"))
    } finally { setLoading(false) }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
              <Building2 className="h-4.5 w-4.5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("createBdf")}</h2>
              <p className="text-[11px] text-slate-400">{t("createBdfDesc")}</p>
            </div>
          </div>
          <button onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {atLimit && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
              <p className="text-xs text-amber-700">{t("bdfLimitExceeded", { max: BDF_MAX })}</p>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
              {t("fTitle")} <span className="text-red-400">*</span>
            </label>
            <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })) }}
              placeholder={t("fTitleHint")}
              className={`${FIELD_BASE} ${errors.title ? "border-red-300 bg-red-50" : ""}`}
              disabled={loading || atLimit} />
            {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title}</p>}
          </div>
          <AmountField
            label={t("fEstimatedAmount")} value={amount}
            onChange={(v) => { setAmount(v); setErrors((p) => ({ ...p, amount: undefined })) }}
            disabled={loading || atLimit} error={errors.amount}
          />
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
              {t("fDescription")} <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined })) }}
              placeholder={t("fDescriptionHint")}
              disabled={loading || atLimit}
              className={`${FIELD_BASE} resize-none leading-relaxed ${errors.description ? "border-red-300 bg-red-50" : ""}`}
            />
            {errors.description && <p className="mt-1 text-[11px] text-red-500">{errors.description}</p>}
          </div>
          <PodioToggle value={syncPodio} onChange={setSyncPodio} jobYear={jobYear} disabled={loading || atLimit} />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button onClick={handleClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {t("btnCancel")}
          </button>
          <button onClick={handleSubmit} disabled={loading || atLimit}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("btnCreating")}</> : <><Plus className="h-3.5 w-3.5" /> {t("btnCreate")}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Approve BDF Dialog ───────────────────────────────────────────────────────
// Only updates Client_price (confirmed spend) + Status. Builder_cost (original estimate) is preserved.

interface ApproveBDFDialogProps {
  open: boolean; item: EstimateItem | null; onClose: () => void
  jobId: string; jobYear?: number; onApproved: (item: EstimateItem) => void
}

function ApproveBDFDialog({ open, item, onClose, jobId, jobYear, onApproved }: ApproveBDFDialogProps) {
  const t = useTranslations("jobEstimate.bdfManager")
  const [amount, setAmount]           = useState("")
  const [syncPodio, setSyncPodio]     = useState(true)
  const [loading, setLoading]         = useState(false)
  const [amountError, setAmountError] = useState("")

  useEffect(() => { if (item) setAmount(String(item.Builder_Cost)) }, [item?.ID_EstimateItem])

  const handleClose = () => { if (!loading) { setAmount(""); setSyncPodio(false); setAmountError(""); onClose() } }

  const handleApprove = async () => {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed < 0) { setAmountError(t("errInvalidAmount")); return }
    if (!item) return
    const id = getId(item)
    if (!id || id.startsWith("TEMP")) { toast.error("Cannot approve an unsaved item."); return }
    setLoading(true)
    try {
      const res = await apiFetch(`/api/estimate/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        // Only update Status and Client_price. Builder_cost stays as the original estimate.
        body: JSON.stringify({ Status: "Approved", Client_price: parsed }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error ?? `Error ${res.status}`) }
      if (syncPodio) await patchJobForPodioSync(jobId, jobYear)
      toast.success(t("toastApproved"))
      // Builder_Cost is intentionally preserved — it is the original estimated amount
      onApproved({ ...item, Status: "Approved", Client_Price: parsed })
      handleClose()
    } catch (e: any) { toast.error(e?.message ?? t("toastApproveFail")) }
    finally { setLoading(false) }
  }

  if (!open || !item) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100">
              <CheckCircle2 className="h-4.5 w-4.5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("approveBdf")}</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{item.Title}</p>
            </div>
          </div>
          <button onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 space-y-1">
            <p className="text-xs text-teal-700">
              {t("approveHint1")}
            </p>
            <p className="text-xs text-teal-600">
              {t("approveHint2", { amount: money(item.Builder_Cost) })}
            </p>
          </div>

          {item.Description && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{t("quoteNotes")}</p>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {item.Description}
              </p>
            </div>
          )}

          <AmountField
            label={t("fConfirmedAmount")}
            value={amount}
            onChange={(v) => { setAmount(v); setAmountError("") }}
            disabled={loading}
            error={amountError}
            placeholder={String(item.Builder_Cost)}
          />
          <p className="text-[11px] text-slate-400 -mt-2">
            {t("originalEstimateHint", { amount: money(item.Builder_Cost) })}
          </p>

          <PodioToggle value={syncPodio} onChange={setSyncPodio} jobYear={jobYear} disabled={loading} />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button onClick={handleClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {t("btnCancel")}
          </button>
          <button onClick={handleApprove} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("btnApproving")}</> : <><CheckCircle2 className="h-3.5 w-3.5" /> {t("btnApprove")}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Edit BDF Dialog ──────────────────────────────────────────────────────────
// Estimated → edits Builder_cost (and syncs Client_price)
// Approved  → edits Client_price only (confirmed spend; Builder_cost stays as original estimate)

interface EditBDFDialogProps {
  open: boolean; item: EstimateItem | null; onClose: () => void
  jobId: string; jobYear?: number; onEdited: (item: EstimateItem) => void
}

function EditBDFDialog({ open, item, onClose, jobId, jobYear, onEdited }: EditBDFDialogProps) {
  const t = useTranslations("jobEstimate.bdfManager")
  const [amount, setAmount]           = useState("")
  const [description, setDescription] = useState("")
  const [syncPodio, setSyncPodio]     = useState(true)
  const [loading, setLoading]         = useState(false)
  const [amountError, setAmountError] = useState("")

  const isApproved = item?.Status === "Approved"

  useEffect(() => {
    if (!item) return
    setAmount(String(isApproved ? item.Client_Price : item.Builder_Cost))
    setDescription(item.Description ?? "")
  }, [item?.ID_EstimateItem, open])

  const handleClose = () => { if (!loading) { setAmount(""); setDescription(""); setSyncPodio(false); setAmountError(""); onClose() } }

  const handleSave = async () => {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed < 0) { setAmountError(t("errInvalidAmount")); return }
    if (!item) return
    const id = getId(item)
    if (!id || id.startsWith("TEMP")) { toast.error("Cannot edit an unsaved item."); return }
    setLoading(true)
    try {
      const patch = isApproved
        ? { Client_price: parsed, Description: description.trim() || null }
        : { Builder_cost: parsed, Client_price: parsed, Description: description.trim() || null }

      const res = await apiFetch(`/api/estimate/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error ?? `Error ${res.status}`) }
      if (syncPodio) await patchJobForPodioSync(jobId, jobYear)
      toast.success(t("toastEdited"))
      const updated = isApproved
        ? { ...item, Client_Price: parsed, Description: description.trim() || item.Description }
        : { ...item, Builder_Cost: parsed, Client_Price: parsed, Unit_Cost: parsed, Description: description.trim() || item.Description }
      onEdited(updated)
      handleClose()
    } catch (e: any) { toast.error(e?.message ?? t("toastEditFail")) }
    finally { setLoading(false) }
  }

  if (!open || !item) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
              <Pencil className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("editBdf")}</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{item.Title}</p>
            </div>
          </div>
          <button onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className={`rounded-xl border p-3 ${isApproved ? "border-teal-100 bg-teal-50" : "border-amber-100 bg-amber-50"}`}>
            <p className={`text-xs ${isApproved ? "text-teal-700" : "text-amber-700"}`}>
              {isApproved ? t("editHintApproved", { amount: money(item.Builder_Cost) }) : t("editHintEstimated")}
            </p>
          </div>

          <AmountField
            label={isApproved ? t("fConfirmedAmount") : t("fEstimatedAmount")}
            value={amount}
            onChange={(v) => { setAmount(v); setAmountError("") }}
            disabled={loading}
            error={amountError}
          />

          {isApproved && (
            <p className="text-[11px] text-slate-400 -mt-2">
              {t("originalEstimateHint", { amount: money(item.Builder_Cost) })}
            </p>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{t("fDescription")}</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fDescriptionHint")}
              disabled={loading}
              className={`${FIELD_BASE} resize-none leading-relaxed`}
            />
          </div>

          <PodioToggle value={syncPodio} onChange={setSyncPodio} jobYear={jobYear} disabled={loading} />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button onClick={handleClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {t("btnCancel")}
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("btnSaving")}</> : <><Pencil className="h-3.5 w-3.5" /> {t("btnSave")}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Unapprove BDF Dialog ─────────────────────────────────────────────────────

interface UnapproveBDFDialogProps {
  open: boolean; item: EstimateItem | null; onClose: () => void
  jobId: string; jobYear?: number; onUnapproved: (item: EstimateItem) => void
}

function UnapproveBDFDialog({ open, item, onClose, jobId, jobYear, onUnapproved }: UnapproveBDFDialogProps) {
  const t = useTranslations("jobEstimate.bdfManager")
  const [syncPodio, setSyncPodio] = useState(true)
  const [loading, setLoading]     = useState(false)

  const handleClose = () => { if (!loading) { setSyncPodio(false); onClose() } }

  const handleUnapprove = async () => {
    if (!item) return
    const id = getId(item)
    if (!id || id.startsWith("TEMP")) { toast.error("Cannot edit an unsaved item."); return }
    setLoading(true)
    try {
      const res = await apiFetch(`/api/estimate/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        // Reset to Estimated: restore Client_price = Builder_cost (the original estimate)
        body: JSON.stringify({ Status: "Estimated", Client_price: item.Builder_Cost }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error ?? `Error ${res.status}`) }
      if (syncPodio) {
        try { await patchJobForPodioSync(jobId, jobYear) }
        catch (e: any) { toast.error(t("toastSyncFail", { action: t("btnUnapprove"), error: e?.message })); onUnapproved({ ...item, Status: "Estimated", Client_Price: item.Builder_Cost }); handleClose(); return }
      }
      toast.success(t("toastUnapproved"))
      onUnapproved({ ...item, Status: "Estimated", Client_Price: item.Builder_Cost })
      handleClose()
    } catch (e: any) { toast.error(e?.message ?? t("toastUnapproveFail")) }
    finally { setLoading(false) }
  }

  if (!open || !item) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <RotateCcw className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t("unapproveBdf")}</h3>
            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{item.Title}</p>
          </div>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">
              {t("unapproveHint", { clientPrice: money(item.Client_Price), builderCost: money(item.Builder_Cost) })}
            </p>
          </div>
          <PodioToggle value={syncPodio} onChange={setSyncPodio} jobYear={jobYear} disabled={loading} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button onClick={handleClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {t("btnCancel")}
          </button>
          <button onClick={handleUnapprove} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("btnUnapproving")}</> : <><RotateCcw className="h-3.5 w-3.5" /> {t("btnUnapprove")}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Delete BDF Dialog ────────────────────────────────────────────────────────

interface DeleteBDFDialogProps {
  open: boolean; item: EstimateItem | null; onClose: () => void
  jobId: string; jobYear?: number; onDeleted: (item: EstimateItem) => void
}

function DeleteBDFDialog({ open, item, onClose, jobId, jobYear, onDeleted }: DeleteBDFDialogProps) {
  const t = useTranslations("jobEstimate.bdfManager")
  const [syncPodio, setSyncPodio] = useState(true)
  const [loading, setLoading]     = useState(false)

  const handleClose = () => { if (!loading) { setSyncPodio(false); onClose() } }

  const handleDelete = async () => {
    if (!item) return
    const id = getId(item)
    if (!id || id.startsWith("TEMP")) { toast.error("Cannot delete an unsaved item."); return }

    setLoading(true)
    try {
      const res = await apiFetch(`/api/estimate/${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error ?? `Error ${res.status}`) }
      if (syncPodio) {
        try { await patchJobForPodioSync(jobId, jobYear) }
        catch (e: any) { toast.error(t("toastSyncFail", { action: t("btnDelete"), error: e?.message })); onDeleted(item); handleClose(); return }
      }
      toast.success(t("toastDeleted"))
      onDeleted(item)
      handleClose()
    } catch (e: any) { toast.error(e?.message ?? t("toastDeleteFail")) }
    finally { setLoading(false) }
  }

  if (!open || !item) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
            <Trash2 className="h-4.5 w-4.5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t("deleteBdf")}</h3>
            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{item.Title}</p>
          </div>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-500">{t("deleteHint")}</p>
          <PodioToggle value={syncPodio} onChange={setSyncPodio} jobYear={jobYear} disabled={loading} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button onClick={handleClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {t("btnCancel")}
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
            {loading ? <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> {t("btnDeleting")}</> : <><Trash2 className="h-3.5 w-3.5" /> {t("btnDelete")}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Main BDFManager component ────────────────────────────────────────────────

interface BDFManagerProps {
  jobId: string
  jobYear?: number
  items: EstimateItem[]
  onItemsChanged: (updated: EstimateItem[]) => void
  onViewDetails: (item: EstimateItem) => void
}

export function BDFManager({ jobId, jobYear, items, onItemsChanged, onViewDetails }: BDFManagerProps) {
  const t = useTranslations("jobEstimate.bdfManager")
  const bdfItems = items.filter((i) => i.Cost_Type === "BDF")

  const [quickCreateOpen, setQuickCreateOpen]   = useState(false)
  const [fullFormOpen, setFullFormOpen]         = useState(false)
  const [approveTarget, setApprove]             = useState<EstimateItem | null>(null)
  const [editTarget, setEdit]                   = useState<EstimateItem | null>(null)
  const [unapproveTarget, setUnapprove]         = useState<EstimateItem | null>(null)
  const [deleteTarget, setDelete]               = useState<EstimateItem | null>(null)

  const estimatedItems = bdfItems.filter((i) => i.Status !== "Approved")
  const approvedItems  = bdfItems.filter((i) => i.Status === "Approved")
  // Estimated City contribution: ALL BDF Builder_Cost (regardless of status)
  const totalEstimatedCity = bdfItems.reduce((s, i) => s + i.Builder_Cost, 0)
  // Bldg Dept Fees: only Approved BDF Client_Price (confirmed spend)
  const totalApproved      = approvedItems.reduce((s, i) => s + i.Client_Price, 0)

  const handleCreated    = (item: EstimateItem) => onItemsChanged([...items, item])
  const handleApproved   = (updated: EstimateItem) => onItemsChanged(items.map((i) => getId(i) === getId(updated) ? updated : i))
  const handleEdited     = (updated: EstimateItem) => onItemsChanged(items.map((i) => getId(i) === getId(updated) ? updated : i))
  const handleUnapproved = (updated: EstimateItem) => onItemsChanged(items.map((i) => getId(i) === getId(updated) ? updated : i))
  const handleDeleted    = (deleted: EstimateItem) => onItemsChanged(items.filter((i) => getId(i) !== getId(deleted)))

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
              <Building2 className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("title")}</h2>
              <p className="text-[11px] text-slate-400">{t("titleDesc", { count: bdfItems.length, max: BDF_MAX })}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setQuickCreateOpen(true)}
              disabled={bdfItems.length >= BDF_MAX}
              title={bdfItems.length >= BDF_MAX ? t("bdfLimitWarning", { max: BDF_MAX }) : undefined}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> {t("btnQuickAdd")}
            </button>
            <button
              onClick={() => setFullFormOpen(true)}
              disabled={bdfItems.length >= BDF_MAX}
              title={bdfItems.length >= BDF_MAX ? t("bdfLimitWarning", { max: BDF_MAX }) : undefined}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <FilePlus2 className="h-3.5 w-3.5" /> {t("btnFullForm")}
            </button>
          </div>
        </div>

        {/* Podio slot indicator */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("podioSlots")}</span>
          <div className="flex gap-1.5">
            {Array.from({ length: BDF_MAX }).map((_, i) => (
              <div key={i} className={`h-2.5 w-2.5 rounded-full ${i < bdfItems.length ? "bg-orange-400" : "bg-slate-200"}`} />
            ))}
          </div>
          <span className="text-[11px] text-slate-400">{t("remaining", { count: BDF_MAX - bdfItems.length })}</span>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">{t("estimatedCity")}</p>
          <p className="mt-1 text-xl font-black text-amber-800">{money(totalEstimatedCity)}</p>
          <p className="mt-0.5 text-[11px] text-amber-600">{t("estimatedCityDesc")}</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600">{t("bldgDeptFees")}</p>
          <p className="mt-1 text-xl font-black text-teal-800">{money(totalApproved)}</p>
          <p className="mt-0.5 text-[11px] text-teal-600">{approvedItems.length !== 1 ? t("bldgDeptFeesDescPlural", { count: approvedItems.length }) : t("bldgDeptFeesDesc", { count: approvedItems.length })}</p>
        </div>
      </div>

      {/* ── Cost list ───────────────────────────────────────────────────── */}
      {bdfItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">{t("noCostsTitle")}</p>
          <p className="text-[11px] text-slate-400">{t("noCostsDesc")}</p>
          <button onClick={() => setQuickCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors">
            <Plus className="h-3.5 w-3.5" /> {t("btnNewCost")}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[580px]">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("tableTitle")}</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("tableEstimated")}</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("tableConfirmed")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("tableStatus")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("tableActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bdfItems.map((item) => {
                const isApproved = item.Status === "Approved"
                return (
                  <tr key={getId(item)} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800">{item.Title}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700">
                      {money(item.Builder_Cost)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-teal-700">
                      {isApproved ? money(item.Client_Price) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={item.Status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onViewDetails(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-colors"
                          title={t("tooltipView")}>
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {!isApproved && (
                          <button onClick={() => setApprove(item)}
                            className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                            title={t("tooltipApprove")}>
                            <CheckCircle2 className="h-3 w-3" /> {t("statusApproved")}
                          </button>
                        )}
                        {isApproved && (
                          <button onClick={() => setUnapprove(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-600 transition-colors"
                            title={t("tooltipUnapprove")}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => setEdit(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-colors"
                          title={t("tooltipEdit")}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDelete(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500 transition-colors"
                          title={t("tooltipDelete")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <CreateBDFDialog
        open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)}
        jobId={jobId} jobYear={jobYear} existingCount={bdfItems.length} onCreated={handleCreated}
      />
      <CreateEstimateItemDialog
        open={fullFormOpen} onOpenChange={setFullFormOpen}
        jobId={jobId} jobYear={jobYear} forcedCostType="BDF" onCreated={handleCreated}
      />
      <ApproveBDFDialog
        open={!!approveTarget} item={approveTarget} onClose={() => setApprove(null)}
        jobId={jobId} jobYear={jobYear} onApproved={handleApproved}
      />
      <EditBDFDialog
        open={!!editTarget} item={editTarget} onClose={() => setEdit(null)}
        jobId={jobId} jobYear={jobYear} onEdited={handleEdited}
      />
      <UnapproveBDFDialog
        open={!!unapproveTarget} item={unapproveTarget} onClose={() => setUnapprove(null)}
        jobId={jobId} jobYear={jobYear} onUnapproved={handleUnapproved}
      />
      <DeleteBDFDialog
        open={!!deleteTarget} item={deleteTarget} onClose={() => setDelete(null)}
        jobId={jobId} jobYear={jobYear} onDeleted={handleDeleted}
      />
    </div>
  )
}
