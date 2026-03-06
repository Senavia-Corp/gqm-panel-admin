"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus } from "lucide-react"
import type { Multiplier } from "@/lib/types"
import {
  unlinkMultiplierFromJob,
  findApplicableMultiplier,
  calculateAdjFormulaPricing,
} from "@/lib/services/multiplier-service"
import { toast } from "sonner"
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
import { MultiplierSelector } from "./MultiplierSelector"

interface JobMultipliersManagerProps {
  jobId: string
  formulaPricing: number
  multipliers: Multiplier[]
  onMultipliersChanged: () => void
  onAdjPricingCalculated: (adjPricing: number) => void
}

export function JobMultipliersManager({
  jobId,
  formulaPricing,
  multipliers,
  onMultipliersChanged,
  onAdjPricingCalculated,
}: JobMultipliersManagerProps) {
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [showAddMultiplier, setShowAddMultiplier] = useState(false)

  const handleUnlinkMultiplier = async (multiplierId: string) => {
    // Check if this is the only applicable multiplier for current pricing
    const applicableMultiplier = findApplicableMultiplier(formulaPricing, multipliers)

    if (applicableMultiplier && applicableMultiplier.ID_MultiplierR === multiplierId) {
      const otherApplicable = multipliers.find(
        (m) => m.ID_MultiplierR !== multiplierId && formulaPricing >= m.Start_value && formulaPricing <= m.End_value,
      )

      if (!otherApplicable) {
        toast.error("Cannot unlink this multiplier", {
          description:
            "This is the only multiplier that applies to the current Formula Pricing. Add another valid multiplier before unlinking this one.",
        })
        setUnlinkingId(null)
        return
      }
    }

    try {
      await unlinkMultiplierFromJob(jobId, multiplierId)
      toast.success("Multiplier unlinked successfully")
      onMultipliersChanged()
      setUnlinkingId(null)
    } catch (error) {
      console.error("[v0] Error unlinking multiplier:", error)
      toast.error("Failed to unlink multiplier")
    }
  }

  const handleMultiplierAdded = (multiplier: Multiplier, adjFormulaPricing: number) => {
    console.log("[v0] Multiplier added, adj pricing:", adjFormulaPricing)
    onAdjPricingCalculated(adjFormulaPricing)    
    setShowAddMultiplier(false)
  }

  const applicableMultiplier = findApplicableMultiplier(formulaPricing, multipliers)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pricing Multipliers</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddMultiplier(!showAddMultiplier)}>
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
          <p className="text-sm text-muted-foreground">
            No multipliers linked to this job. Add one to calculate Adjusted Formula Pricing.
          </p>
        ) : (
          <div className="space-y-2">
            {multipliers.map((multiplier) => {
              const isApplicable =
                applicableMultiplier && applicableMultiplier.ID_MultiplierR === multiplier.ID_MultiplierR
              const adjPricing = calculateAdjFormulaPricing(formulaPricing, multiplier)

              return (
                <div
                  key={multiplier.ID_MultiplierR}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isApplicable ? "border-gqm-green bg-gqm-green/5" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        ${multiplier.Start_value.toFixed(2)} - ${multiplier.End_value.toFixed(2)}
                      </span>
                      <Badge variant="secondary">×{multiplier.Multiplier}</Badge>
                      {isApplicable && <Badge className="bg-gqm-green text-white">Currently Applied</Badge>}
                    </div>
                    {isApplicable && (
                      <p className="text-xs text-muted-foreground">Adj Formula Pricing: ${adjPricing.toFixed(2)}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setUnlinkingId(multiplier.ID_MultiplierR)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <AlertDialog open={unlinkingId !== null} onOpenChange={(open) => !open && setUnlinkingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unlink Multiplier?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unlink this multiplier from the job? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => unlinkingId && handleUnlinkMultiplier(unlinkingId)}>
                Unlink
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
