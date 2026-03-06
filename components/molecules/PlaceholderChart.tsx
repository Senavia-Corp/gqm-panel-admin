"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import { MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

const barData = [
  { month: "JAN", value1: 25000, value2: 30000 },
  { month: "FEB", value1: 20000, value2: 15000 },
  { month: "MAR", value1: 35000, value2: 28000 },
  { month: "APR", value1: 22000, value2: 40000 },
  { month: "MAY", value1: 30000, value2: 25000 },
  { month: "JUN", value1: 28000, value2: 35000 },
]

export function PlaceholderChart() {
  return (
    <Card className="border-2 bg-gqm-green-dark">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg text-white">Header</CardTitle>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a4d2e" />
            <XAxis dataKey="month" tick={{ fill: "#fff", fontSize: 12 }} axisLine={{ stroke: "#1a4d2e" }} />
            <YAxis
              tick={{ fill: "#fff", fontSize: 12 }}
              axisLine={{ stroke: "#1a4d2e" }}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-white text-sm">Legend</span>}
            />
            <Bar dataKey="value1" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            <Bar dataKey="value2" fill="#37D260" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
