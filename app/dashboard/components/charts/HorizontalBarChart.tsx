"use client"

import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

export interface HorizontalBarItem {
  label: string
  value: number
  secondary?: number   // e.g. premium
  badge?: string       // shown next to bar (e.g. avg final %)
}

interface Props {
  data: HorizontalBarItem[]
  primaryLabel?: string
  secondaryLabel?: string
  height?: number
  primaryColor?: string
  secondaryColor?: string
}

function formatMoney(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold">{formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function HorizontalBarChart({
  data,
  primaryLabel   = "Final Sold",
  secondaryLabel = "Premium $",
  height,
  primaryColor   = "#1e4d2b",
  secondaryColor = "#f59e0b",
}: Props) {
  const rowHeight = 48
  const computedHeight = height ?? Math.max(data.length * rowHeight + 48, 200)

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 70, left: 8, bottom: 4 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis type="number" tickFormatter={formatMoney} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />

        <Bar dataKey="value" name={primaryLabel} fill={primaryColor} radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={primaryColor} />
          ))}
        </Bar>

        {data[0]?.secondary !== undefined && (
          <Bar dataKey="secondary" name={secondaryLabel} fill={secondaryColor} radius={[0, 4, 4, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
