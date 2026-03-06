"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Multiplier } from "@/lib/types"
import {
  fetchMultipliers,
  createMultiplier,
  linkMultiplierToJob,
  unlinkMultiplierFromJob,
} from "@/lib/services/multiplier-service"
import { calculateAdjFormulaPricing } from "@/lib/services/multiplier-service"
import { useToast } from "@/hooks/use-toast"

interface MultiplierSelectorProps {
  formulaPricing: number
  onMultiplierSelected: (multiplier: Multiplier, adjFormulaPricing: number) => void
  jobId?: string
  existingMultipliers?: Multiplier[]
}

export function MultiplierSelector({
  formulaPricing,
  onMultiplierSelected,
  jobId,
  existingMultipliers = [],
}: MultiplierSelectorProps) {
  const { toast } = useToast()
  const [multipliers, setMultipliers] = useState<Multiplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedMultiplierId, setSelectedMultiplierId] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const [overlappingMultiplier, setOverlappingMultiplier] = useState<Multiplier | null>(null)
  const [pendingMultiplier, setPendingMultiplier] = useState<Multiplier | null>(null)

  const [newMultiplier, setNewMultiplier] = useState({
    startValue: "",
    endValue: "",
    multiplier: "",
  })

  useEffect(() => {
    loadMultipliers()
  }, [])

  const loadMultipliers = async () => {
    try {
      const data = await fetchMultipliers()
      setMultipliers(data || [])
    } catch (error) {
      console.error("[v0] Error loading multipliers:", error)
      setMultipliers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMultiplier = async () => {
    const selected = multipliers.find((m) => m.ID_MultiplierR === selectedMultiplierId)
    if (!selected) return

    // Check for overlapping ranges with existing multipliers
    if (jobId && existingMultipliers.length > 0) {
      const overlapping = existingMultipliers.find(
        (em) =>
          (selected.Start_value >= em.Start_value && selected.Start_value <= em.End_value) ||
          (selected.End_value >= em.Start_value && selected.End_value <= em.End_value) ||
          (selected.Start_value <= em.Start_value && selected.End_value >= em.End_value),
      )

      if (overlapping) {
        setOverlappingMultiplier(overlapping)
        setPendingMultiplier(selected)
        setShowReplaceConfirm(true)
        return
      }
    }

    await linkAndApplyMultiplier(selected)
  }

  const linkAndApplyMultiplier = async (multiplier: Multiplier, unlinkOldId?: string) => {
    const adjFormulaPricing = calculateAdjFormulaPricing(formulaPricing, multiplier)

    if (jobId) {
      try {
        if (unlinkOldId) {
          await unlinkMultiplierFromJob(jobId, unlinkOldId)
        }

        await linkMultiplierToJob(jobId, multiplier.ID_MultiplierR)
        toast({
          title: "Success",
          description: "Multiplier linked successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to link multiplier",
          variant: "destructive",
        })
        return
      }
    }

    onMultiplierSelected(multiplier, adjFormulaPricing)
    setSelectedMultiplierId("")
  }

  const handleReplaceConfirm = async () => {
    if (pendingMultiplier && overlappingMultiplier) {
      await linkAndApplyMultiplier(pendingMultiplier, overlappingMultiplier.ID_MultiplierR)
    }
    setShowReplaceConfirm(false)
    setPendingMultiplier(null)
    setOverlappingMultiplier(null)
  }

  const handleReplaceCancel = () => {
    setShowReplaceConfirm(false)
    setPendingMultiplier(null)
    setOverlappingMultiplier(null)
  }

  const handleCreateMultiplier = async () => {
    setCreating(true)
    try {
      const startValue = Number.parseFloat(newMultiplier.startValue)
      const endValue = Number.parseFloat(newMultiplier.endValue)
      const multiplierValue = Number.parseFloat(newMultiplier.multiplier)

      if (isNaN(startValue) || isNaN(endValue) || isNaN(multiplierValue)) {
        toast({
          title: "Error",
          description: "Please enter valid numbers for all fields",
          variant: "destructive",
        })
        setCreating(false)
        return
      }

      if (startValue >= endValue) {
        toast({
          title: "Error",
          description: "Start value must be less than end value",
          variant: "destructive",
        })
        setCreating(false)
        return
      }

      // Check for overlapping ranges with existing multipliers
      if (jobId && existingMultipliers.length > 0) {
        const overlapping = existingMultipliers.find(
          (em) =>
            (startValue >= em.Start_value && startValue <= em.End_value) ||
            (endValue >= em.Start_value && endValue <= em.End_value) ||
            (startValue <= em.Start_value && endValue >= em.End_value),
        )

        if (overlapping) {
          const created = await createMultiplier({
            Start_value: startValue,
            End_value: endValue,
            Multiplier: multiplierValue,
          })

          setOverlappingMultiplier(overlapping)
          setPendingMultiplier(created)
          setShowReplaceConfirm(true)
          setShowCreateDialog(false)
          setNewMultiplier({ startValue: "", endValue: "", multiplier: "" })
          await loadMultipliers()
          setCreating(false)
          return
        }
      }

      const created = await createMultiplier({
        Start_value: startValue,
        End_value: endValue,
        Multiplier: multiplierValue,
      })

      const adjFormulaPricing = calculateAdjFormulaPricing(formulaPricing, created)

      if (jobId) {
        await linkMultiplierToJob(jobId, created.ID_MultiplierR)
      }

      onMultiplierSelected(created, adjFormulaPricing)

      toast({
        title: "Success",
        description: "Multiplier created and linked successfully",
      })

      setShowCreateDialog(false)
      setNewMultiplier({ startValue: "", endValue: "", multiplier: "" })
      await loadMultipliers()
    } catch (error) {
      console.error("[v0] Error creating multiplier:", error)
      toast({
        title: "Error",
        description: "Failed to create multiplier",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  if (formulaPricing <= 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please enter a GQM (Formula) Pricing value to select or create a multiplier.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="multiplier" className="mb-2 block">
            Select Multiplier Range
          </Label>
          {loading ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading multipliers...
            </div>
          ) : (
            <Select value={selectedMultiplierId} onValueChange={setSelectedMultiplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a multiplier range" />
              </SelectTrigger>
              <SelectContent>
                {multipliers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No multipliers available
                  </SelectItem>
                ) : (
                  multipliers.map((m) => (
                    <SelectItem key={m.ID_MultiplierR} value={m.ID_MultiplierR}>
                      ${m.Start_value} - ${m.End_value} (×{m.Multiplier})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button type="button" variant="outline" disabled={!selectedMultiplierId} onClick={handleSelectMultiplier}>
          Link Multiplier
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full bg-transparent"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create New Multiplier
      </Button>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Multiplier</DialogTitle>
            <DialogDescription>Define a new price range and multiplier value.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="startValue">Start Value *</Label>
              <Input
                id="startValue"
                type="number"
                step="0.01"
                placeholder="e.g., 0"
                value={newMultiplier.startValue}
                onChange={(e) => setNewMultiplier({ ...newMultiplier, startValue: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="endValue">End Value *</Label>
              <Input
                id="endValue"
                type="number"
                step="0.01"
                placeholder="e.g., 500"
                value={newMultiplier.endValue}
                onChange={(e) => setNewMultiplier({ ...newMultiplier, endValue: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="multiplierValue">Multiplier *</Label>
              <Input
                id="multiplierValue"
                type="number"
                step="0.001"
                placeholder="e.g., 1.027"
                value={newMultiplier.multiplier}
                onChange={(e) => setNewMultiplier({ ...newMultiplier, multiplier: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateMultiplier} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create & Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReplaceConfirm} onOpenChange={(open) => !open && handleReplaceCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Existing Multiplier?</DialogTitle>
            <DialogDescription>
              A multiplier with an overlapping range already exists:
              {overlappingMultiplier && (
                <div className="mt-2 rounded-md bg-muted p-2">
                  ${overlappingMultiplier.Start_value} - ${overlappingMultiplier.End_value} (×
                  {overlappingMultiplier.Multiplier})
                </div>
              )}
              Do you want to unlink it and add the new one?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleReplaceCancel}>
              Cancel
            </Button>
            <Button onClick={handleReplaceConfirm}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
