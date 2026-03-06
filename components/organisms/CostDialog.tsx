"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Cost } from "./CostBreakdownTable"

interface CostDialogProps {
  isOpen: boolean
  onClose: () => void
  cost?: Cost | null
  onSave: (cost: Omit<Cost, "id"> & { id?: string }) => void
}

export function CostDialog({ isOpen, onClose, cost, onSave }: CostDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    quantity: 1,
    unitPrice: 0,
    type: "Materials" as Cost["type"],
    description: "",
  })

  useEffect(() => {
    if (cost) {
      setFormData({
        name: cost.name,
        quantity: cost.quantity,
        unitPrice: cost.unitPrice,
        type: cost.type,
        description: "",
      })
    } else {
      setFormData({
        name: "",
        quantity: 1,
        unitPrice: 0,
        type: "Materials",
        description: "",
      })
    }
  }, [cost, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const total = formData.quantity * formData.unitPrice
    onSave({
      ...(cost && { id: cost.id }),
      name: formData.name,
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      total,
      type: formData.type,
    })
    onClose()
  }

  const total = formData.quantity * formData.unitPrice

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cost ? "Edit Cost" : "Add New Cost"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name" className="mb-2 block">
                Cost Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Concrete Mix"
                required
              />
            </div>

            <div>
              <Label htmlFor="type" className="mb-2 block">
                Cost Type
              </Label>
              <Select value={formData.type} onValueChange={(value: Cost["type"]) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Labor">Labor</SelectItem>
                  <SelectItem value="Materials">Materials</SelectItem>
                  <SelectItem value="Permits">Permits</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="quantity" className="mb-2 block">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="unitPrice" className="mb-2 block">
                Unit Price ($)
              </Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="mb-2 block">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about this cost..."
              rows={3}
            />
          </div>

          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Cost:</span>
              <span className="text-2xl font-bold text-gqm-green">${total.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gqm-green hover:bg-gqm-green/90">
              {cost ? "Update Cost" : "Add Cost"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
