"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Unlink } from "lucide-react"
import type { Multiplier } from "@/lib/types"
import {
  unlinkMultiplierFromJob,
  findApplicableMultiplier,
  calculateAdjFormulaPricing,
} from "@/lib/services/multiplier-service"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MultiplierSelector } from "./MultiplierSelector"

interface JobMultipliersManagerProps {
  jobId: string
  formulaPricing: number
  multipliers: Multiplier[]
  onMultipliersChanged: () => Promise<void>
  onAdjPricingCalculated: (adjPricing: number) => void
}

export function JobMultipliersManager({
  jobId,
  formulaPricing,
  multipliers,
  onMultipliersChanged,
  onAdjPricingCalculated,
}: JobMultipliersManagerProps) {
  const [pendingMultiplier, setPendingMultiplier]   = useState<Multiplier | null>(null)
  const [actionLoading, setActionLoading]           = useState(false)
  const [showAddMultiplier, setShowAddMultiplier]   = useState(false)

  // ── Unlink only — removes the link but keeps the MultiplierR record ────────
  const handleUnlinkOnly = async () => {
    if (!pendingMultiplier) return
    setActionLoading(true)
    try {
      await unlinkMultiplierFromJob(jobId, pendingMultiplier.ID_MultiplierR)
      toast.success("Multiplier unlinked", {
        description: "The multiplier range still exists and can be used in other jobs.",
      })
      onMultipliersChanged()   // triggers reload → pricing fields update from server
    } catch (error) {
      console.error("[v0] Error unlinking multiplier:", error)
      toast.error("Failed to unlink multiplier")
    } finally {
      setActionLoading(false)
      setPendingMultiplier(null)
    }
  }

  // ── Unlink + delete — removes the link AND deletes the MultiplierR record ──
  const handleUnlinkAndDelete = async () => {
    if (!pendingMultiplier) return
    setActionLoading(true)
    try {
      // 1. Unlink from this job first
      await unlinkMultiplierFromJob(jobId, pendingMultiplier.ID_MultiplierR)

      // 2. Delete the multiplier record from the system
      const res = await fetch(`/api/multipliers/${pendingMultiplier.ID_MultiplierR}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? `Error ${res.status}`)
      }

      toast.success("Multiplier deleted", {
        description: "The multiplier range has been removed from the system.",
      })
      onMultipliersChanged()
    } catch (error: any) {
      console.error("[v0] Error deleting multiplier:", error)
      toast.error("Failed to delete multiplier", {
        description: error?.message ?? "Unknown error",
      })
    } finally {
      setActionLoading(false)
      setPendingMultiplier(null)
    }
  }

  // ── Add multiplier: link + reload so Adj Formula Pricing updates immediately ─
  const handleMultiplierAdded = async (multiplier: Multiplier, adjFormulaPricing: number) => {
    await onMultipliersChanged()
    setShowAddMultiplier(false)
  }

  const applicableMultiplier = findApplicableMultiplier(formulaPricing, multipliers)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pricing Multipliers</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddMultiplier(!showAddMultiplier)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Multiplier
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {showAddMultiplier && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <MultiplierSelector
              formulaPricing={formulaPricing}
              jobId={jobId}
              existingMultipliers={multipliers}
              onMultiplierSelected={handleMultiplierAdded}
            />
          </div>
        )}

        {multipliers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">
              No multipliers linked to this job.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              When no multiplier is linked, the default ranges are used automatically
              (0–$27k × 1.027 · $27k–$63k × 1.023 · &gt;$63k × 1.018).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {multipliers.map((multiplier) => {
              const isApplicable =
                applicableMultiplier?.ID_MultiplierR === multiplier.ID_MultiplierR
              const adjPricing = calculateAdjFormulaPricing(formulaPricing, multiplier)

              return (
                <div
                  key={multiplier.ID_MultiplierR}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isApplicable ? "border-gqm-green bg-gqm-green/5" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        ${multiplier.Start_value.toFixed(2)} – ${multiplier.End_value.toFixed(2)}
                      </span>
                      <Badge variant="secondary">×{multiplier.Multiplier}</Badge>
                      {isApplicable && (
                        <Badge className="bg-gqm-green text-white">Currently Applied</Badge>
                      )}
                    </div>
                    {isApplicable && (
                      <p className="text-xs text-muted-foreground">
                        Adj Formula Pricing: ${adjPricing.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingMultiplier(multiplier)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Unlink / delete dialog ─────────────────────────────────────── */}
        <AlertDialog
          open={pendingMultiplier !== null}
          onOpenChange={(open) => { if (!open && !actionLoading) setPendingMultiplier(null) }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Multiplier</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    You're removing the multiplier{" "}
                    <span className="font-semibold">
                      ${pendingMultiplier?.Start_value.toFixed(2)} – ${pendingMultiplier?.End_value.toFixed(2)}{" "}
                      ×{pendingMultiplier?.Multiplier}
                    </span>{" "}
                    from this job.
                  </p>
                  <p>
                    Do you want to <span className="font-semibold">keep it</span> in the system
                    (so it can be used in other jobs) or{" "}
                    <span className="font-semibold text-red-600">delete it permanently</span>?
                  </p>
                  <p className="text-xs text-slate-400">
                    Either way, pricing will be recalculated using the default multiplier ranges.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel disabled={actionLoading}>
                Cancel
              </AlertDialogCancel>
              {/* Unlink only — keep the record */}
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={handleUnlinkOnly}
                className="flex items-center gap-1.5"
              >
                <Unlink className="h-3.5 w-3.5" />
                {actionLoading ? "Removing…" : "Unlink (keep in system)"}
              </Button>
              {/* Unlink + delete */}
              <Button
                variant="destructive"
                disabled={actionLoading}
                onClick={handleUnlinkAndDelete}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {actionLoading ? "Deleting…" : "Delete permanently"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}