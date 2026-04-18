"use client"

import React from "react"

interface SectionCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * Standard white card used for every dashboard section.
 * Matches the existing GQM design language (black border, rounded-xl, shadow).
 */
export function SectionCard({ title, subtitle, action, children, className = "" }: SectionCardProps) {
  return (
    <div className={["rounded-xl border-2 border-black bg-white shadow-sm", className].join(" ")}>
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
