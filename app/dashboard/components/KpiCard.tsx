"use client"

import { InfoTooltip } from "./InfoTooltip"

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  Icon: LucideIcon
  accentClass?: string   // Tailwind bg + text for the icon bubble
  valueClass?: string    // Override for the value text colour
  large?: boolean        // Taller variant for the first row
  tooltip?: string       // Optional explanation for the metric
}

export function KpiCard({
  title,
  value,
  subtitle,
  Icon,
  accentClass = "bg-emerald-100 text-emerald-700",
  valueClass  = "text-gray-900",
  large       = false,
  tooltip,
}: KpiCardProps) {
  return (
    <div
      className={[
        "flex flex-col justify-between rounded-xl border bg-white shadow-sm",
        large ? "p-5" : "p-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {tooltip && <InfoTooltip content={tooltip} />}
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground leading-tight truncate">
            {title}
          </p>
        </div>
        <span
          className={[
            "inline-flex shrink-0 items-center justify-center rounded-lg",
            large ? "h-9 w-9" : "h-8 w-8",
            accentClass,
          ].join(" ")}
        >
          <Icon className={large ? "h-5 w-5" : "h-4 w-4"} />
        </span>
      </div>

      <div className="mt-2">
        <p className={["font-bold tabular-nums leading-none", large ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl", valueClass].join(" ")}>
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
