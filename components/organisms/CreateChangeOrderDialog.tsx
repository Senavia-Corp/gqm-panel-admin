"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

type ChangeOrderFormState = {
  Name: string
  Description?: string
  ChangeOrderFormula: string // lo manejamos como string en UI
  State: "Pending" | "Approved" | "Rejected" | ""
  syncPodio: boolean
}

type Mode = "create" | "edit"

interface CreateChangeOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  mode?: Mode
  changeOrderId?: string // requerido en edit

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

  onCreated?: () => void
  onUpdated?: () => void
}

const STATES = ["Pending", "Approved", "Rejected"] as const

export function CreateChangeOrderDialog({
  open,
  onOpenChange,
  mode = "create",
  changeOrderId,
  jobId,
  orderId,
  jobPodioId,
  defaultSyncPodio,
  jobYearForPodioSync,
  initialData,
  onCreated,
  onUpdated,
}: CreateChangeOrderDialogProps) {
  const isEdit = mode === "edit"

  const initialSync = useMemo(() => defaultSyncPodio, [defaultSyncPodio])

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ChangeOrderFormState>({
    Name: "",
    Description: "",
    ChangeOrderFormula: "",
    State: "",
    syncPodio: initialSync,
  })

  // Prefill cuando abre (create limpio / edit con data)
  useEffect(() => {
    if (!open) return

    setForm({
      Name: String(initialData?.Name ?? ""),
      Description: String(initialData?.Description ?? ""),
      ChangeOrderFormula:
        initialData?.ChangeOrderFormula === null || initialData?.ChangeOrderFormula === undefined
          ? ""
          : String(initialData.ChangeOrderFormula),
      State: (initialData?.State as any) ?? "",
      syncPodio: initialSync,
    })
  }, [open, initialData, initialSync])

  const title = isEdit ? "Edit Change Order" : "Create Change Order"
  const ctaLabel = isEdit ? "Save Changes" : "Create Change Order"

  const yearForPodio = jobYearForPodioSync

  const validate = () => {
    if (!form.Name.trim()) return "Name is required"
    if (!form.State) return "State is required"
    if (!form.ChangeOrderFormula.trim()) return "ChangeOrderFormula is required"

    const n = Number(form.ChangeOrderFormula)
    if (Number.isNaN(n)) return "ChangeOrderFormula must be a number"

    if (form.syncPodio && !yearForPodio) return "Year is required when Sync Podio is enabled"
    if (isEdit && !changeOrderId) return "Missing changeOrderId for edit"
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }

    const payload = {
      Name: form.Name.trim(),
      Description: form.Description?.trim() || null,
      ChangeOrderFormula: Number(form.ChangeOrderFormula),
      State: form.State,
      ID_Jobs: jobId,
      ID_Order: orderId,
      // si tu backend necesita esto para sync podio:
      job_podio_id: jobPodioId ?? null,
    }
    
    

    const qs = new URLSearchParams()
    qs.set("sync_podio", String(!!form.syncPodio))
    if (form.syncPodio && yearForPodio) qs.set("year", String(yearForPodio))

    const url = isEdit
      ? `/api/change-order/${encodeURIComponent(String(changeOrderId))}?${qs.toString()}`
      : `/api/change-order?${qs.toString()}`

    const method = isEdit ? "PATCH" : "POST"

    try {
      setLoading(true)

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        throw new Error(msg || `Request failed (${res.status})`)
      }

      toast.success(isEdit ? "Change order updated" : "Change order created")

      onOpenChange(false)
      if (isEdit) onUpdated?.()
      else onCreated?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.Name}
                onChange={(e) => setForm((p) => ({ ...p, Name: e.target.value }))}
                placeholder="e.g. Extra ducts"
              />
            </div>

            <div className="space-y-2">
              <Label>
                State <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.State}
                onValueChange={(v) => setForm((p) => ({ ...p, State: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Change Order Formula <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.ChangeOrderFormula}
                onChange={(e) => setForm((p) => ({ ...p, ChangeOrderFormula: e.target.value }))}
                placeholder="e.g. 1250"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.Description}
                onChange={(e) => setForm((p) => ({ ...p, Description: e.target.value }))}
                placeholder="Optional details..."
                className="min-h-[42px]"
              />
            </div>
          </div>

          <div className="rounded-md border p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Sync Podio</div>
              <div className="text-sm text-muted-foreground">
                {form.syncPodio
                  ? `Enabled${yearForPodio ? ` (year: ${yearForPodio})` : ""}`
                  : "Disabled"}
              </div>
            </div>
            <Switch
              checked={form.syncPodio}
              onCheckedChange={(v) => setForm((p) => ({ ...p, syncPodio: !!v }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : ctaLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}