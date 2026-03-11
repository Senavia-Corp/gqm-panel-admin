/**
 * lib/utils/resolveJobYear.ts  (or wherever you keep shared utilities)
 *
 * Resolves the year a job belongs to based on its ID.
 *
 * Rule: the first numeric digit in the Job ID encodes the last digit of the year.
 *   Digit → Year
 *   0 → 2020 | 1 → 2021 | 2 → 2022 | ... | 5 → 2025 | 6 → 2026
 *
 * Examples:
 *   QID5123  → 2025
 *   QID6123  → 2026
 *   PTL4567  → 2024
 *   PAR60039 → 2026
 */

export function resolveJobYearFromId(jobId: string | null | undefined): number | undefined {
  if (!jobId) return undefined
  const match = String(jobId).match(/\d/)
  if (match) return 2020 + parseInt(match[0], 10)
  return undefined
}

export function resolveJobYear(job: any): number | undefined {
  const fromId = resolveJobYearFromId(job?.ID_Jobs ?? job?.id ?? job?.jobId ?? null)
  if (fromId !== undefined) return fromId

  // Fallback: date-based (legacy — less reliable due to date offsets)
  const jobType = String(job?.Job_type ?? job?.job_type ?? "").toUpperCase()
  const pickDate =
    jobType === "PTL"
      ? (job?.Estimated_start_date ?? job?.estimated_start_date ?? null)
      : (job?.Date_assigned ?? job?.date_assigned ?? null)

  if (!pickDate) return undefined
  const d = new Date(pickDate)
  const y = d.getFullYear()
  return Number.isFinite(y) && y > 2000 ? y : undefined
}