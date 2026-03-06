import type { JobStatus } from "@/lib/types"

interface StatusBadgeProps {
  status: JobStatus | string
  className?: string
}

const statusStyles: Record<JobStatus, string> = {
  "Assigned/P. Quote": "bg-blue-600 text-white",
  "Waiting for Approval": "bg-amber-400 text-black",
  "Scheduled / Work in Progress": "bg-green-600 text-white",
  Cancelled: "bg-red-600 text-white",
  "Completed P. INV / POs": "bg-purple-600 text-white",
  Invoiced: "bg-emerald-600 text-white",
  HOLD: "bg-orange-500 text-white",
  PAID: "bg-emerald-700 text-white",
  Warranty: "bg-indigo-600 text-white",
  "Received-Stand By": "bg-slate-400 text-white",
  "Completed PVI": "bg-violet-500 text-white",
  Paid: "bg-emerald-700 text-white",
  "In Progress": "bg-teal-500 text-white",
  "Completed PVI / POs": "bg-fuchsia-500 text-white",
  Archived: "bg-gray-400 text-white",
}

function normalizeStatus(status: string): JobStatus | string {
  const value = status.trim()

  // Common variants -> canonical values matching lib/types.ts
  if (value === "Assigned/P.Quote" || value === "Assigned/P.Quote") return "Assigned/P. Quote"
  if (value === "Assigned/P. Quote") return "Assigned/P. Quote"

  if (
    value === "Schedule/Work in Progress" ||
    value === "Schedule / Work in Progress" ||
    value === "Scheduled/Work in Progress" ||
    value === "Scheduled / Work in Progress"
  )
    return "Scheduled / Work in Progress"

  if (value === "Completed P. INV/POs" || value === "Completed P. INV/POs")
    return "Completed P. INV / POs"

  if (value === "Completed PVI/POs" || value === "Completed PVI / POs")
    return "Completed PVI / POs"

  if (value === "Received - Stand By" || value === "Received - StandBy") return "Received-Stand By"

  if (value === "Schedule / Work in Progress") return "Scheduled / Work in Progress"

  if (value === "PAID") return "PAID"
  if (value.toLowerCase() === "paid") return "Paid"

  // Fallback: return trimmed original
  return value
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status)

  const style =
    statusStyles[normalizedStatus as JobStatus] ??
    "bg-gray-200 text-gray-900"

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${style} ${className}`}
    >
      {normalizedStatus}
    </span>
  )
}