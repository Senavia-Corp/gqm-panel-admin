import { useMemo, useState } from "react"

type StatusData = {
  name: string
  value: number
  color?: string
  percentage?: number
}

type Props = {
  statusData: StatusData[]
  /** altura total del componente (incluye leyenda). Si no se pasa, usa 420px por defecto */
  height?: number
}

/**
 * SVG bar chart showing top 5 statuses by value.
 * - Tooltip on hover shows count + percentage.
 * - Renders legend below the chart (prevents truncated long labels).
 * - height prop controls total component height (defaults to 420).
 */
export default function TopStatusBarChart({ statusData, height = 420 }: Props) {
  const top5 = useMemo(() => {
    return (statusData || [])
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [statusData])

  const maxValue = useMemo(() => {
    return Math.max(1, ...(top5.map((d) => d.value)))
  }, [top5])

  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null)

  // layout: reduce espacio inferior para evitar huecos grandes
  const padding = { top: 28, right: 20, bottom: 72, left: 48 } // bottom reducido
  const svgViewWidth = 900
  const svgViewHeight = 520 // altura base ajustada
  const innerWidth = svgViewWidth - padding.left - padding.right
  const innerHeight = svgViewHeight - padding.top - padding.bottom
  const barGap = 22
  const n = top5.length || 1
  const barWidth = Math.max(28, (innerWidth - barGap * (n - 1)) / n)

  // palette (same as before) but allow status-provided colors
  const palette = ["#9AD0FF", "#FFD166", "#EF476F", "#2DD4BF", "#FFB6C1"]

  return (
    <div
      className="border-0 rounded-xl bg-white p-6 flex flex-col"
      // allow parent grid to size it; minHeight to avoid collapse
      style={{ minHeight: height }}
    >
      <div className="mb-2 text-lg font-semibold">Top 5 Status with most Jobs</div>
      <p className="text-sm opacity-90 mt-1">The 5 states used by GQM with the highest number of jobs</p>

      {top5.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">No data</div>
      ) : (
        <>
          <div style={{ position: "relative", flex: 1, minHeight: 260 }}>
            <svg
              viewBox={`0 0 ${svgViewWidth} ${svgViewHeight}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Top 5 job statuses bar chart"
            >
              <g transform={`translate(${padding.left}, ${padding.top})`}>
                {/* Y axis ticks and gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                  const y = innerHeight - innerHeight * t
                  const valueLabel = Math.round(maxValue * t)
                  return (
                    <g key={i}>
                      <line x1={-10} x2={innerWidth} y1={y} y2={y} stroke="#eee" strokeWidth={1} />
                      <text x={-16} y={y + 4} fontSize={12} textAnchor="end" fill="#475569">
                        {valueLabel}
                      </text>
                    </g>
                  )
                })}

                {/* bars */}
                {top5.map((d, i) => {
                  const x = i * (barWidth + barGap)
                  const barH = Math.round((d.value / maxValue) * innerHeight)
                  const y = innerHeight - barH
                  const color = d.color || palette[i % palette.length]
                  return (
                    <g key={d.name} transform={`translate(${x},0)`}>
                      <rect
                        x={0}
                        y={y}
                        width={barWidth}
                        height={barH}
                        rx={10}
                        fill={color}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(evt) =>
                          setHover({
                            idx: i,
                            x: evt.clientX,
                            y: evt.clientY,
                          })
                        }
                        onMouseMove={(evt) =>
                          setHover({
                            idx: i,
                            x: evt.clientX,
                            y: evt.clientY,
                          })
                        }
                        onMouseLeave={() => setHover(null)}
                      />
                      {/* optional small value on top of bar when tall enough */}
                      {barH > 28 && (
                        <text
                          x={barWidth / 2}
                          y={y + 16}
                          fontSize={12}
                          textAnchor="middle"
                          fill="#041226"
                          style={{ fontWeight: 600 }}
                        >
                          {d.value}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>

            {/* Tooltip */}
            {hover !== null && top5[hover.idx] && (
              <div
                className="z-50 rounded border bg-white px-3 py-2 text-sm shadow"
                style={{
                  position: "fixed",
                  left: hover.x + 12,
                  top: hover.y + 12,
                  pointerEvents: "none",
                  minWidth: 120,
                }}
              >
                <div className="font-medium">{top5[hover.idx].name}</div>
                <div className="text-xs text-muted-foreground">
                  {top5[hover.idx].value} jobs — {(Number(top5[hover.idx].percentage ?? 0).toFixed(2))}% of selection
                </div>
              </div>
            )}
          </div>

          {/* Legend area: shows color + name + value + pct */}
          <div className="mt-2 flex flex-wrap items-center gap-3"> {/* mt reducido */}
            {top5.map((d, i) => {
              const color = d.color || palette[i % palette.length]
              return (
                <div key={d.name} className="flex items-center gap-2 min-w-[180px]">
                  <span style={{ width: 14, height: 14, backgroundColor: color, borderRadius: 4, display: "inline-block" }} />
                  <div className="text-sm">
                    <div className="font-medium leading-4" title={d.name}>
                      {d.name.length > 30 ? d.name.slice(0, 30) + "…" : d.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.value} jobs — {(Number(d.percentage ?? 0).toFixed(2))}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}