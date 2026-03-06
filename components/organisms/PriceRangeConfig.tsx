"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface PriceRange {
  id: string
  startValue: number
  endValue: number
  multiplier: number
}

export function PriceRangeConfig() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [ranges, setRanges] = useState<PriceRange[]>([
    { id: "1", startValue: 0, endValue: 500, multiplier: 1.015 },
    { id: "2", startValue: 500, endValue: 1000, multiplier: 1.020 },
    { id: "3", startValue: 1000, endValue: 2000, multiplier: 1.025 },
    { id: "4", startValue: 2000, endValue: 2500, multiplier: 1.027 },
    { id: "5", startValue: 2500, endValue: 5000, multiplier: 1.030 },
  ])

  const addRange = () => {
    const newRange: PriceRange = {
      id: Date.now().toString(),
      startValue: 0,
      endValue: 0,
      multiplier: 1.0,
    }
    setRanges([...ranges, newRange])
  }

  const deleteRange = (id: string) => {
    setRanges(ranges.filter((range) => range.id !== id))
  }

  const updateRange = (id: string, field: keyof PriceRange, value: number) => {
    setRanges(ranges.map((range) => (range.id === id ? { ...range, [field]: value } : range)))
  }

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between border-gqm-green text-gqm-green hover:bg-green-50"
      >
        <span>Configure Price Ranges</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isExpanded && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Price Range Multipliers</CardTitle>
              <Button onClick={addRange} size="sm" className="bg-gqm-green hover:bg-gqm-green/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Range
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ranges.map((range) => (
                <div key={range.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-4">
                  <div>
                    <Label className="mb-2 block text-xs">Start Value ($)</Label>
                    <Input
                      type="number"
                      value={range.startValue}
                      onChange={(e) => updateRange(range.id, "startValue", Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs">End Value ($)</Label>
                    <Input
                      type="number"
                      value={range.endValue}
                      onChange={(e) => updateRange(range.id, "endValue", Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs">Multiplier</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={range.multiplier}
                      onChange={(e) => updateRange(range.id, "multiplier", Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteRange(range.id)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
