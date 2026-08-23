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
import { useTranslations } from "@/components/providers/LocaleProvider"
import { apiFetch } from "@/lib/apiFetch"
import { useCan } from "@/hooks/useCan"

interface JobMultipliersManagerProps {
  jobId: string
  formulaPricing: number
  multipliers: Multiplier[]
  onMultipliersChanged: () => void | Promise<void>
  onAdjPricingCalculated: (adjPricing: number) => void
}

export function JobMultipliersManager({
  jobId,
  formulaPricing,
  multipliers,
  onMultipliersChanged,
  onAdjPricingCalculated,
}: JobMultipliersManagerProps) {
  const t = useTranslations("jobs")
  // Recurso `multiplier` propio en el API: sin el permiso, ni el botón Add ni
  // la papelera (que desvincula Y borra del catálogo) se ofrecen.
  const { can } = useCan(["multiplier:create", "multiplier:delete"])
  const [pendingMultiplier, setPendingMultiplier]   = useState<Multiplier | null>(null)
  const [actionLoading, setActionLoading]           = useState(false)
  const [showAddMultiplier, setShowAddMultiplier]   = useState(false)

  // ── Unlink only — removes the link but keeps the MultiplierR record ────────
  const handleUnlinkOnly = async () => {
    if (!pendingMultiplier) return
    setActionLoading(true)
    try {
      await unlinkMultiplierFromJob(jobId, pendingMultiplier.ID_MultiplierR)
      toast.success(t("pricingMulUnlinkedTitle"), {
        description: t("pricingMulUnlinkedDesc"),
      })
      onMultipliersChanged()   // triggers reload → pricing fields update from server
    } catch (error) {
      console.error("[v0] Error unlinking multiplier:", error)
      toast.error(t("pricingMulUnlinkError"))
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
      const res = await apiFetch(`/api/multipliers/${pendingMultiplier.ID_MultiplierR}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? `Error ${res.status}`)
      }

      toast.success(t("pricingMulDeletedTitle"), {
        description: t("pricingMulDeletedDesc"),
      })
      onMultipliersChanged()
    } catch (error: any) {
      console.error("[v0] Error deleting multiplier:", error)
      toast.error(t("pricingMulDeleteError"), {
        description: error?.message,
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
        <CardTitle>{t("pricingMulTitle")}</CardTitle>
        {can("multiplier:create") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddMultiplier(!showAddMultiplier)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("pricingMulAddBtn")}
          </Button>
        )}
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
              {t("pricingMulEmpty")}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t("pricingMulEmptyHint")}
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
                        <Badge className="bg-gqm-green text-white">{t("pricingMulApplied")}</Badge>
                      )}
                    </div>
                    {isApplicable && (
                      <p className="text-xs text-muted-foreground">
                        {t("pricingMulAdjLabel")} ${adjPricing.toFixed(2)}
                      </p>
                    )}
                  </div>
                  {can("multiplier:delete") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingMultiplier(multiplier)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
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
              <AlertDialogTitle>{t("pricingMulRemoveTitle")}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    {t("pricingMulRemoveDescPre")}{" "}
                    <span className="font-semibold">
                      ${pendingMultiplier?.Start_value.toFixed(2)} – ${pendingMultiplier?.End_value.toFixed(2)}{" "}
                      ×{pendingMultiplier?.Multiplier}
                    </span>{" "}
                    {t("pricingMulRemoveDescPost")}
                  </p>
                  <p>
                    {t("pricingMulRemoveKeepPre")} <span className="font-semibold">{t("pricingMulRemoveKeepText")}</span>{" "}
                    {t("pricingMulRemoveKeepMid")}{" "}
                    <span className="font-semibold text-red-600">{t("pricingMulRemoveDeleteText")}</span>?
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("pricingMulRemoveNote")}
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel disabled={actionLoading}>
                {t("pricingMulCancelBtn")}
              </AlertDialogCancel>
              {/* Unlink only — keep the record */}
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={handleUnlinkOnly}
                className="flex items-center gap-1.5"
              >
                <Unlink className="h-3.5 w-3.5" />
                {actionLoading ? t("pricingMulRemoving") : t("pricingMulUnlinkBtn")}
              </Button>
              {/* Unlink + delete */}
              <Button
                variant="destructive"
                disabled={actionLoading}
                onClick={handleUnlinkAndDelete}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {actionLoading ? t("pricingMulDeleting") : t("pricingMulDeleteBtn")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}