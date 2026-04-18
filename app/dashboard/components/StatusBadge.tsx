"use client"

import React from "react"

const STATUS_STYLES: Record<string, string> = {
  // Paid / closed
  paid:              "bg-emerald-100 text-emerald-800 border-emerald-200",
  paid_ptl:          "bg-emerald-100 text-emerald-800 border-emerald-200",
  // Invoiced
  invoiced:          "bg-yellow-100 text-yellow-800 border-yellow-200",
  // Completed (pending invoice)
  "completed p. inv/pos": "bg-blue-100 text-blue-800 border-blue-200",
  completed:         "bg-blue-100 text-blue-800 border-blue-200",
  "completed pvi":   "bg-blue-100 text-blue-800 border-blue-200",
  "completed pvi / pos": "bg-blue-100 text-blue-800 border-blue-200",
  // In progress
  "in progress":     "bg-sky-100 text-sky-800 border-sky-200",
  "assigned-in progress": "bg-sky-100 text-sky-800 border-sky-200",
  "scheduled / work in progress": "bg-sky-100 text-sky-800 border-sky-200",
  // Pending / waiting
  "assigned/p. quote":       "bg-amber-100 text-amber-800 border-amber-200",
  "waiting for approval":    "bg-amber-100 text-amber-800 border-amber-200",
  hold:              "bg-amber-100 text-amber-800 border-amber-200",
  "received-stand by": "bg-amber-100 text-amber-800 border-amber-200",
  // Cancelled / overdue
  cancelled:         "bg-red-100 text-red-800 border-red-200",
  overdue:           "bg-red-100 text-red-800 border-red-200",
  // Warranty
  warranty:          "bg-purple-100 text-purple-800 border-purple-200",
  // Default
  default:           "bg-gray-100 text-gray-700 border-gray-200",
}

function resolveStyle(status: string) {
  const key = status.trim().toLowerCase()
  return STATUS_STYLES[key] ?? STATUS_STYLES.default
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        resolveStyle(status),
        className,
      ].join(" ")}
    >
      {status}
    </span>
  )
}

/** Returns a hex background colour for table row colouring by status */
export function statusRowBg(status: string): string {
  const key = status.trim().toLowerCase()
  if (key === "paid" || key === "paid_ptl") return "#f0fdf4"           // green-50
  if (key === "invoiced")                   return "#fefce8"           // yellow-50
  if (key === "cancelled" || key === "overdue") return "#fff1f2"       // red-50
  if (key.startsWith("completed"))          return "#eff6ff"           // blue-50
  return ""
}
