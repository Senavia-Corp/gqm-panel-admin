import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"

interface MetricCardProps {
  name: string
  value: string
  change: number // ahora esto será el porcentaje (0-100)
  icon?: LucideIcon
}

export function MetricCard({ name, value, change, icon: Icon }: MetricCardProps) {
  const isPositive = change >= 0

  return (
    <Card className="border-0 overflow-hidden">
      <CardContent className="p-6 bg-white">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{name}</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold">{value}</p>
            {Icon && (
              <div className="bg-gray-100 p-3 rounded-lg">
                <Icon className="h-8 w-8 text-gray-500" />
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <div className="px-6 py-3" style={{ backgroundColor: "#37D260" }}>
        <div className="flex items-center gap-1 text-sm font-medium text-black">
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>Percentage: {Math.abs(change).toFixed(2)}%</span>
        </div>
      </div>
    </Card>
  )
}