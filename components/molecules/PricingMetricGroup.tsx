export interface PricingMetric {
  label: string
  value: string | number
  editable?: boolean
}

interface PricingMetricGroupProps {
  title: string
  metrics: PricingMetric[]
  children?: React.ReactNode
}

export function PricingMetricGroup({ title, metrics, children }: PricingMetricGroupProps) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
            <span className="text-sm text-gray-600">{metric.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{metric.value}</span>
              {metric.editable && (
                <button className="text-gray-400 hover:text-gray-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}
