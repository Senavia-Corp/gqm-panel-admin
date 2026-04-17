"use client"

import React from "react"

export function KpiSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 h-7 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-2 w-20 rounded bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* header */}
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-gray-200 animate-pulse" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="h-3 flex-1 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="w-full animate-pulse rounded-lg bg-gray-100" style={{ height }} />
  )
}

export function CardCarouselSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-none w-[280px] rounded-xl border bg-white p-5 shadow-sm">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-3 w-24 rounded bg-gray-100 animate-pulse" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="h-3 w-full rounded bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
