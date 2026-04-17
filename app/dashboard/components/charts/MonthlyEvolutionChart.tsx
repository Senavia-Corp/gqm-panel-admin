"use client"

import React from "react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface MonthlyDataPoint {
  label: string           // "2026-01" or "Q1 2026"
  quoted: number
  final_sold: number
  avg_final_pct: number   // 0–1
}

interface Props {
  data: MonthlyDataPoint[]
  height?: number
}

function formatMoney(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function formatPct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold">
            {p.name === "Avg Final %" ? formatPct(p.value) : formatMoney(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyEvolutionChart({ data, height = 300 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="money"
          tickFormatter={formatMoney}
          tick={{ fontSize: 11 }}
          width={60}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          tick={{ fontSize: 11 }}
          domain={[0, 1]}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        <Bar yAxisId="money" dataKey="quoted"     name="Total Quoted" fill="#d1d5db" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="money" dataKey="final_sold" name="Final Sold"   fill="#1e4d2b"  radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="avg_final_pct"
          name="Avg Final %"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3, fill: "#f59e0b" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
