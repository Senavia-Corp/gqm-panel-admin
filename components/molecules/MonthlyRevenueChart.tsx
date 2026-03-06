"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const monthlyData = [
  { month: "5k", value: 20 },
  { month: "10k", value: 35 },
  { month: "15k", value: 28 },
  { month: "20k", value: 45 },
  { month: "25k", value: 38 },
  { month: "30k", value: 55 },
  { month: "35k", value: 100 },
  { month: "40k", value: 48 },
  { month: "45k", value: 60 },
  { month: "50k", value: 42 },
  { month: "55k", value: 50 },
  { month: "60k", value: 55 },
]

export function MonthlyRevenueChart() {
  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Monthly Revenue</CardTitle>
        <Select defaultValue="october">
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="october">October</SelectItem>
            <SelectItem value="november">November</SelectItem>
            <SelectItem value="december">December</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value: any) => [`$${value * 43.64}`, "Revenue"]}
              contentStyle={{
                backgroundColor: "#37D260",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                padding: "8px",
                fontWeight: "600",
              }}
            />
            <defs>
              <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d1fae5" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#d1fae5" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} fill="url(#colorMonthly)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
