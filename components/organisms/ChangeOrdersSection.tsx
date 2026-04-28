"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Pencil, Trash2, FileText, Loader2, Link2 } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ChangeOrder = {
  ID_ChangeOrder: string
  Name: string | null
  Description: string | null
  ChangeOrderFormula: number | null
  State: string | null
  job_podio_id: string | null
  ID_Jobs: string | null
  ID_Order: string | null
  podio_field: string | null
}

type Props = {
  /** Full job object */
  job: any
  /** Default value for each dialog's Podio sync toggle (inherited from JobDetailPage) */
  syncPodio: boolean
  /** Year resolved from Date_assigned (QID/PAR) or Estimated_start_date (PTL) */
  jobYear?: number
  /** Reload job from server after any mutation */
  onReload: () => Promise<void>
  /**
   * Patch the job in the backend.
   * Receives { Gqm_final_sold_pricing: newValue }.
   * Maps directly to useJobDetail.patch().
   */
  onPatchJob: (updates: Record<string, any>) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATE_OPTIONS = ["Pending", "Approved", "Rejected"] as const
type COState = (typeof STATE_OPTIONS)[number]

const STATE_STYLES: Record<COState, string> = {
  Pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  Approved: "bg-green-50  text-green-700  border-green-200",
  Rejected: "bg-red-50    text-red-700    border-red-200",
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(v: number | null | undefined) {
  const n = Number(v ?? 0)
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

function emptyForm() {
  return {
    Name: "",
    Description: "",
    ChangeOrderFormula: "",
    State: "" as string,
  }
}

type FormState = ReturnType<typeof emptyForm>

// ─────────────────────────────────────────────────────────────────────────────
// PodioSyncToggle — individual per dialog
// ─────────────────────────────────────────────────────────────────────────────

function PodioSyncToggle({
  value,
  onChange,
  jobYear,
  disabled,
}: {
  value: boolean
  onChange: (v: boolean) => void
  jobYear?: number
  disabled?: boolean
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">Sync to Podio</p>
            {value && !jobYear && (
              <p className="text-xs text-red-500 mt-0.5">
                Year not resolved — sync may fail
              </p>
            )}
            {value && jobYear && (
              <p className="text-xs text-muted-foreground mt-0.5">Year: {jobYear}</p>
            )}
          </div>
        </div>
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          className="flex-shrink-0"
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChangeOrdersSection
// ─────────────────────────────────────────────────────────────────────────────

export function ChangeOrdersSection({
  job,
  syncPodio,
  jobYear,
  onReload,
  onPatchJob,
}: Props) {
  const { toast } = useToast()

  // Derived: only general change orders (not linked to an Order)
  const allChangeOrders: ChangeOrder[] = Array.isArray(job?.change_orders)
    ? job.change_orders
    : []
  const changeOrders = allChangeOrders.filter((co) => !co.ID_Order)
  const total = changeOrders.reduce(
    (s, co) => s + (Number(co.ChangeOrderFormula) || 0),
    0,
  )

  // ── Dialog open flags ────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // ── Per-dialog Podio sync toggles — default from parent, independent ─────
  const [createSync, setCreateSync] = useState(syncPodio)
  const [editSync,   setEditSync]   = useState(syncPodio)
  const [deleteSync, setDeleteSync] = useState(syncPodio)

  // ── Targets ──────────────────────────────────────────────────────────────
  const [editTarget,   setEditTarget]   = useState<ChangeOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChangeOrder | null>(null)

  // ── Form ─────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(emptyForm())

  // ── Loading ──────────────────────────────────────────────────────────────
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function qs(sync: boolean) {
    if (sync && jobYear) return `?sync_podio=true&year=${jobYear}`
    return `?sync_podio=false`
  }

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  function validateSync(sync: boolean): boolean {
    if (sync && !jobYear) {
      toast({
        title: "Missing year",
        description:
          "Year is required when Podio Sync is enabled. Disable sync or ensure the job has a valid date.",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  // ── Open helpers — reset per-dialog sync to parent default each time ─────

  function openCreate() {
    setForm(emptyForm())
    setCreateSync(syncPodio)
    setCreateOpen(true)
  }

  function openEdit(co: ChangeOrder) {
    setEditTarget(co)
    setEditSync(syncPodio)
    setForm({
      Name:               co.Name ?? "",
      Description:        co.Description ?? "",
      ChangeOrderFormula: co.ChangeOrderFormula != null ? String(co.ChangeOrderFormula) : "",
      State:              co.State ?? "",
    })
    setEditOpen(true)
  }

  function openDelete(co: ChangeOrder) {
    setDeleteTarget(co)
    setDeleteSync(syncPodio)
    setDeleteOpen(true)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!job?.ID_Jobs) {
      toast({ title: "Error", description: "Job ID not found.", variant: "destructive" })
      return
    }
    if (!validateSync(createSync)) return

    const formula = parseFloat(form.ChangeOrderFormula) || 0

    setSaving(true)
    try {
      // 1️⃣ Create the Change Order
      const body: any = {
        Name:               form.Name        || null,
        Description:        form.Description || null,
        ChangeOrderFormula: formula          || null,
        State:              form.State       || null,
        ID_Jobs:            job.ID_Jobs,
        job_podio_id:       createSync ? (job.podio_item_id ?? null) : null,
        // ID_Order intentionally omitted — general change order
      }

      const res = await apiFetch(`/api/change-order${qs(createSync)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? (err as any)?.error ?? `Error ${res.status}`)
      }

      // 2️⃣ PATCH the Job: add formula to Gqm_final_sold_pricing
      const currentFinal = Number(job?.Gqm_final_sold_pricing ?? 0)
      await onPatchJob({ Gqm_final_sold_pricing: currentFinal + formula })

      toast({
        title: "Change Order created",
        description: `${fmtMoney(formula)} added to final sold pricing.`,
      })
      setCreateOpen(false)
      await onReload()
    } catch (err: any) {
      console.error("[change-order] create:", err)
      toast({
        title: "Error creating Change Order",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────────────────────────────────────

  async function handleEdit() {
    if (!editTarget) return
    if (!validateSync(editSync)) return

    const newFormula = parseFloat(form.ChangeOrderFormula) || 0
    const oldFormula = Number(editTarget.ChangeOrderFormula ?? 0)
    const delta      = newFormula - oldFormula

    setSaving(true)
    try {
      // 1️⃣ Update the Change Order
      const body = {
        Name:               form.Name        || null,
        Description:        form.Description || null,
        ChangeOrderFormula: newFormula       || null,
        State:              form.State       || null,
        // ID_Jobs, ID_Order, job_podio_id stripped by backend on PATCH
      }

      const res = await apiFetch(
        `/api/change-order/${editTarget.ID_ChangeOrder}${qs(editSync)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? (err as any)?.error ?? `Error ${res.status}`)
      }

      // 2️⃣ PATCH the Job: adjust Gqm_final_sold_pricing by delta (only if formula changed)
      if (delta !== 0) {
        const currentFinal = Number(job?.Gqm_final_sold_pricing ?? 0)
        await onPatchJob({ Gqm_final_sold_pricing: currentFinal + delta })
      }

      const deltaLabel =
        delta > 0 ? `+${fmtMoney(delta)}` :
        delta < 0 ? fmtMoney(delta) :
        "no change in amount"

      toast({
        title: "Change Order updated",
        description: `Final sold pricing adjusted: ${deltaLabel}.`,
      })
      setEditOpen(false)
      setEditTarget(null)
      await onReload()
    } catch (err: any) {
      console.error("[change-order] edit:", err)
      toast({
        title: "Error updating Change Order",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    if (!validateSync(deleteSync)) return

    const formula = Number(deleteTarget.ChangeOrderFormula ?? 0)

    setDeleting(true)
    try {
      // 1️⃣ Delete the Change Order
      const res = await apiFetch(
        `/api/change-order/${deleteTarget.ID_ChangeOrder}${qs(deleteSync)}`,
        { method: "DELETE" },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.detail ?? (err as any)?.error ?? `Error ${res.status}`)
      }

      // 2️⃣ PATCH the Job: subtract formula from Gqm_final_sold_pricing
      const currentFinal = Number(job?.Gqm_final_sold_pricing ?? 0)
      await onPatchJob({ Gqm_final_sold_pricing: currentFinal - formula })

      toast({
        title: "Change Order deleted",
        description: `${fmtMoney(formula)} subtracted from final sold pricing.`,
      })
      setDeleteOpen(false)
      setDeleteTarget(null)
      await onReload()
    } catch (err: any) {
      console.error("[change-order] delete:", err)
      toast({
        title: "Error deleting Change Order",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Main Card ─────────────────────────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <CardTitle className="truncate">Job Change Orders (General)</CardTitle>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Total:{" "}
                <span className="font-semibold text-foreground">{fmtMoney(total)}</span>
              </span>
              <Button
                size="sm"
                onClick={openCreate}
                className="bg-gqm-green-dark hover:bg-gqm-green"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {changeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 gap-2">
              <FileText className="h-8 w-8 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                No general change orders for this job
              </p>
              <Button variant="outline" size="sm" onClick={openCreate} className="mt-1">
                <Plus className="mr-1.5 h-4 w-4" /> Add Change Order
              </Button>
            </div>
          ) : (
            changeOrders.map((co) => {
              const stateStyle =
                STATE_STYLES[co.State as COState] ??
                "bg-gray-50 text-gray-600 border-gray-200"

              return (
                <div
                  key={co.ID_ChangeOrder}
                  className="flex items-start justify-between gap-4 rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Left */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                        {co.ID_ChangeOrder}
                      </span>
                      {co.Name && (
                        <span className="font-medium text-sm">{co.Name}</span>
                      )}
                      {co.State && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${stateStyle}`}
                        >
                          {co.State}
                        </span>
                      )}
                    </div>
                    {co.Description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {co.Description}
                      </p>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-base font-semibold tabular-nums">
                      {fmtMoney(co.ChangeOrderFormula)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(co)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => openDelete(co)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ── CREATE DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Change Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <ChangeOrderForm form={form} setField={setField} />
            <PodioSyncToggle
              value={createSync}
              onChange={setCreateSync}
              jobYear={jobYear}
              disabled={saving}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-gqm-green-dark hover:bg-gqm-green">
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                : "Create"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ───────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Change Order</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <p className="text-xs text-muted-foreground -mt-2 font-mono">
              {editTarget.ID_ChangeOrder}
            </p>
          )}

          <div className="space-y-4 py-1">
            <ChangeOrderForm form={form} setField={setField} />
            <PodioSyncToggle
              value={editSync}
              onChange={setEditSync}
              jobYear={jobYear}
              disabled={saving}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setEditOpen(false); setEditTarget(null) }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-gqm-green-dark hover:bg-gqm-green">
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                : "Save Changes"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ────────────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Change Order?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You are about to delete{" "}
                  <span className="font-mono font-medium text-foreground">
                    {deleteTarget?.ID_ChangeOrder}
                  </span>
                  {deleteTarget?.Name ? ` — ${deleteTarget.Name}` : ""}.
                </p>
                {deleteTarget?.ChangeOrderFormula != null && (
                  <p>
                    This will subtract{" "}
                    <strong className="text-foreground">
                      {fmtMoney(deleteTarget.ChangeOrderFormula)}
                    </strong>{" "}
                    from the job's final sold pricing.
                  </p>
                )}
                <PodioSyncToggle
                  value={deleteSync}
                  onChange={setDeleteSync}
                  jobYear={jobYear}
                  disabled={deleting}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
                : "Delete"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared form — Name, Description, Amount, State
// ─────────────────────────────────────────────────────────────────────────────

function ChangeOrderForm({
  form,
  setField,
}: {
  form: FormState
  setField: (key: keyof FormState, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="co-name" className="mb-2 block">Name</Label>
        <Input
          id="co-name"
          placeholder="e.g., Additional scope — Roof"
          value={form.Name}
          onChange={(e) => setField("Name", e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="co-desc" className="mb-2 block">Description</Label>
        <Textarea
          id="co-desc"
          placeholder="Describe the change order…"
          rows={2}
          className="sm:rows-3"
          value={form.Description}
          onChange={(e) => setField("Description", e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="co-formula" className="mb-2 block">
          Amount ($) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="co-formula"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          value={form.ChangeOrderFormula}
          onChange={(e) => setField("ChangeOrderFormula", e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Added to / subtracted from the job's final sold pricing.
        </p>
      </div>

      <div>
        <Label htmlFor="co-state" className="mb-2 block">State</Label>
        <Select value={form.State} onValueChange={(v) => setField("State", v)}>
          <SelectTrigger id="co-state">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {STATE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}