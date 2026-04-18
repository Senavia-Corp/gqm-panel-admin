"use client"

import React from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export interface PieDataItem {
  name: string
  value: number
  color?: string
}

const DEFAULT_COLORS = [
  "#1e4d2b", "#37D260", "#f59e0b", "#3b82f6", "#8b5cf6",
  "#ef4444", "#06b6d4", "#d1d5db", "#f97316", "#ec4899",
  "#84cc16", "#0ea5e9", "#a855f7", "#14b8a6", "#fb923c",
]

interface Props {
  data: PieDataItem[]
  height?: number
  innerRadius?: number
  outerRadius?: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value, payload: { pct } } = payload[0]
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md text-xs">
      <p className="font-semibold text-gray-700">{name}</p>
      <p className="text-gray-600 mt-1">
        Count: <span className="font-semibold">{value}</span>
      </p>
      {pct !== undefined && (
        <p className="text-gray-600">
          Share: <span className="font-semibold">{(pct * 100).toFixed(1)}%</span>
        </p>
      )}
    </div>
  )
}

export function StatusPieChart({ data, height = 320, innerRadius = 60, outerRadius = 100 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const enriched = data.map((d) => ({ ...d, pct: total > 0 ? d.value / total : 0 }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <Pie
          data={enriched}
          cx="50%"
          cy="42%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {enriched.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          layout="horizontal"
          align="center"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
          wrapperStyle={{ paddingTop: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
