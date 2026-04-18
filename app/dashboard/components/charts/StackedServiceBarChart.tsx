"use client"

import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

export interface ServiceSaleItem {
  service: string
  final: number
  premium_in_money: number
  count?: number
}

interface Props {
  data: ServiceSaleItem[]
  maxItems?: number
  height?: number
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
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: <span className="font-semibold">{formatMoney(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function StackedServiceBarChart({ data, maxItems = 12, height = 400 }: Props) {
  if (!data?.length) return null

  // Sort by final sold descending, take top N, group rest as "Other"
  const sorted = [...data].sort((a, b) => b.final - a.final)
  const top    = sorted.slice(0, maxItems)
  const rest   = sorted.slice(maxItems)

  if (rest.length > 0) {
    top.push({
      service:          "Other",
      final:            rest.reduce((s, r) => s + r.final, 0),
      premium_in_money: rest.reduce((s, r) => s + r.premium_in_money, 0),
      count:            rest.reduce((s, r) => s + (r.count ?? 0), 0),
    })
  }

  // Reverse so highest value appears at the top of the horizontal chart
  const chartData = top.reverse().map((s) => ({
    name:    s.service,
    "Final Sold":   s.final,
    "Premium $":    s.premium_in_money,
  }))

  // Dynamic height: at least 30px per row + legend/axis space
  const dynamicHeight = Math.max(height, chartData.length * 36 + 80)

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatMoney}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={160}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar dataKey="Final Sold" fill="#1e4d2b" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Premium $"  fill="#f59e0b" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
