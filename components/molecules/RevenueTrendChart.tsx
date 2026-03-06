"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

const revenueData = [
  { point: "5k", value: 20 },
  { point: "10k", value: 45 },
  { point: "15k", value: 38 },
  { point: "20k", value: 55 },
  { point: "25k", value: 35 },
  { point: "30k", value: 65 },
  { point: "35k", value: 95 },
  { point: "40k", value: 80 },
  { point: "45k", value: 55 },
  { point: "50k", value: 70 },
  { point: "55k", value: 60 },
  { point: "60k", value: 68 },
]

export function RevenueTrendChart() {
  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Revenue Trend</CardTitle>
        <Select defaultValue="2025">
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="point" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value: any) => [`${value}%`, "Revenue"]}
              contentStyle={{
                backgroundColor: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px",
              }}
            />
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
