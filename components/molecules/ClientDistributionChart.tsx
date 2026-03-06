"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts"

interface ClientData {
  name: string
  value: number
  color: string
  percentage: number
}

interface ClientDistributionChartProps {
  clientData: ClientData[]
}

export function ClientDistributionChart({ clientData }: ClientDistributionChartProps) {
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)

  // Color palette for different clients
  const colors = [
    "#fbbf24", // amber-400
    "#f59e0b", // amber-500
    "#eab308", // yellow-500
    "#ca8a04", // yellow-600
    "#fb923c", // orange-400
    "#f97316", // orange-500
    "#ef4444", // red-500
    "#84cc16", // lime-500
    "#22c55e", // green-500
    "#10b981", // emerald-500
  ]

  // Assign colors to client data
  const chartData = clientData.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
  }))

  return (
    <Card className="bg-gqm-green-dark overflow-hidden">
      <CardHeader className="text-white pb-3">
        <CardTitle className="text-xl font-semibold">Client Job Distribution</CardTitle>
        <p className="text-sm opacity-90 mt-1">Distribution of jobs by client for 2025</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {chartData.map((client, index) => (
            <Button
              key={index}
              size="sm"
              className={
                selectedClient?.name === client.name
                  ? "bg-[#37D260] text-black hover:bg-[#2bc252] h-8 text-xs font-medium"
                  : "bg-transparent text-white border-white hover:bg-white/10 h-8 text-xs border"
              }
              onClick={() => setSelectedClient(client)}
            >
              {client.name}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
              >
                {selectedClient && (
                  <Label
                    value={`${selectedClient.percentage.toFixed(1)}%`}
                    position="center"
                    fill="white"
                    style={{ fontSize: "32px", fontWeight: "bold" }}
                  />
                )}
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-white text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
