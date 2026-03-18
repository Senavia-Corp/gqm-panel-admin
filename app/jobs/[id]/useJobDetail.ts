"use client"

import { useCallback, useMemo, useState } from "react"
import type { JobDTO, UpdateJobRequest } from "@/lib/types"
import { fetchJobById, updateJob } from "@/lib/services/jobs-service"

type ChangedFields = Set<string>
type SaveOptions = { sync_podio?: boolean }

// Derives the Podio workspace year from the Job ID.
// Rule: first numeric digit → 2020 + digit
// QID5123→2025 | PTL6001→2026 | PAR4567→2024 | PAR60039→2026
function resolveYearFromJobId(jobId: string | null | undefined): number | undefined {
  if (!jobId) return undefined
  const match = String(jobId).match(/\d/)
  return match ? 2020 + parseInt(match[0], 10) : undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Fields that are CALCULATED by the backend calculator and must NEVER be
// included in a PATCH payload. The server always overwrites them after saving.
// Sending them would be a no-op at best, misleading at worst.
// ─────────────────────────────────────────────────────────────────────────────
const CALCULATED_FIELDS = new Set([
  "estimatedRent",
  "estimatedMaterial",
  "estimatedCity",
  "techFormulaPricing",
  "pricing.estimatedRent",
  "pricing.estimatedMaterial",
  "pricing.estimatedCity",
  "pricing.techFormulaPricing",
  "pricing.gqmFormulaPricing",
  "pricing.gqmAdjFormulaPricing",
  "pricing.gqmTargetReturn",
  "pricing.gqmPremiumInMoney",
  "pricing.gqmFinalSoldPricing",
  "pricing.gqmFinalPercentage",
  "pricing.gqmFinalFormPricing",
  "pricing.gqmFinalAdjFormPricing",
  "pricing.gqmFinalTargetReturn",
  "pricing.gqmFinalPremInMoney",
  "pricing.totalMaterialsFees",
  "pricing.paidFees",
  "pricing.bldgDeptFees",
  "pricing.totalChangeOrders",
  "pricing.accReceivable",
])

export function useJobDetail(jobId: string) {
  const [job,           setJob]           = useState<JobDTO | null>(null)
  const [originalJob,   setOriginalJob]   = useState<JobDTO | null>(null)
  const [changedFields, setChangedFields] = useState<ChangedFields>(new Set())
  const [isLoading,     setIsLoading]     = useState(false)
  const [isSaving,      setIsSaving]      = useState(false)

  // ── Reload ──────────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!jobId || jobId === "create") return
    setIsLoading(true)
    try {
      const data = await fetchJobById(jobId)
      setJob(data)
      setOriginalJob(data)
      setChangedFields(new Set())
      return data
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  // ── Mark changed ─────────────────────────────────────────────────────────
  // Calculated fields are silently ignored — they cannot be "changed" by the user.
  const markChanged = useCallback((key: string) => {
    if (CALCULATED_FIELDS.has(key)) return
    setChangedFields((prev) => new Set([...prev, key]))
  }, [])

  const getValue = (j: any, uiKey: string, pyKey: string) =>
    j?.[uiKey] !== undefined ? j[uiKey] : j?.[pyKey]

  // ── Manual patch (direct payload, no field mapping) ──────────────────────
  const patch = useCallback(
    async (updates: Record<string, any>, opts?: SaveOptions) => {
      const idJob = job?.ID_Jobs
      if (!idJob) throw new Error("Job ID_Jobs is missing")

      const year = resolveYearFromJobId(idJob)

      setIsSaving(true)
      try {
        await updateJob(idJob, updates as any, {
          sync_podio: opts?.sync_podio ?? false,
          year,
        })
        setChangedFields(new Set())
        await reload()
      } finally {
        setIsSaving(false)
      }
    },
    [job?.ID_Jobs, reload],
  )

  // ── Intelligent SAVE — maps UI field keys → Python field names ───────────
  // Only manual / user-input fields are included in the payload.
  // Calculated fields are intentionally excluded — the backend recalculates
  // them automatically after every save.
  const save = useCallback(
    async (opts?: SaveOptions) => {
      const idJob = job?.ID_Jobs
      if (!idJob) throw new Error("Job ID_Jobs is missing")
      if (changedFields.size === 0) return

      const year = resolveYearFromJobId(idJob)

      const payload: UpdateJobRequest = {}

      changedFields.forEach((field) => {
        // Skip any field that is backend-calculated — these are never sent
        if (CALCULATED_FIELDS.has(field)) return

        switch (field) {
          // ── Details fields ──────────────────────────────────────────────
          case "status":
            payload.Job_status = getValue(job, "status", "Job_status")
            break
          case "serviceType":
            payload.Service_type = getValue(job, "serviceType", "Service_type")
            break
          case "projectName":
            payload.Project_name = getValue(job, "projectName", "Project_name")
            break
          case "projectLocation":
            payload.Project_location = getValue(job, "projectLocation", "Project_location")
            break
          case "poWtnWo":
            payload.Po_wtn_wo = getValue(job, "poWtnWo", "Po_wtn_wo")
            break
          case "dateAssigned":
            payload.Date_assigned = getValue(job, "dateAssigned", "Date_assigned")
            break
          case "estimatedStartDate":
            payload.Estimated_start_date = getValue(job, "estimatedStartDate", "Estimated_start_date")
            break
          case "estimatedDuration":
            payload.Estimated_project_duration = getValue(job, "estimatedDuration", "Estimated_project_duration")
            break
          case "dateReceived":
            payload.Date_Received = getValue(job, "dateReceived", "Date_Received")
            break
          case "estimatedCompletionDate":
            payload.Estimated_completion_date = getValue(job, "estimatedCompletionDate", "Estimated_completion_date")
            break
          case "additionalDetail":
            payload.Additional_detail = getValue(job, "additionalDetail", "Additional_detail")
            break
          case "ptlSuperintendent":
            payload.Ptl_Superintendent = getValue(job, "ptlSuperintendent", "Ptl_Superintendent")
            break
          case "ptlPropertyId":
            payload.Ptl_property_id = getValue(job, "ptlPropertyId", "Ptl_property_id")
            break
          case "ID_Client":
            payload.ID_Client = (job as any)?.ID_Client ?? null
            break
          case "client": {
            const id =
              (job as any)?.ID_Client ??
              (job as any)?.client?.ID_Client ??
              (job as any)?.client?.id ??
              null
            payload.ID_Client = id
            break
          }

          // ── Manual pricing fields (the only editable ones) ──────────────
          case "pricingTarget":
            payload.Pricing_target = (job as any)?.Pricing_target ?? null
            break
          case "permit":
            payload.Permit = (job as any)?.Permit ?? null
            break
        }

        // ── Manual pricing numeric fields ──────────────────────────────────
        // Only Gqm_target_sold_pricing is user-editable in the pricing tab.
        // All other pricing.* fields are calculated and guarded by CALCULATED_FIELDS above.
        if (field.startsWith("pricing.")) {
          const key = field.replace("pricing.", "")
          switch (key) {
            case "gqmTargetSoldPricing":
              payload.Gqm_target_sold_pricing = job?.Gqm_target_sold_pricing ?? null
              break
            // All other pricing.* keys are in CALCULATED_FIELDS and never reach here
          }
        }
      })

      setIsSaving(true)
      try {
        await updateJob(idJob, payload, {
          sync_podio: opts?.sync_podio ?? false,
          year,
        })
        setChangedFields(new Set())
        await reload()
      } finally {
        setIsSaving(false)
      }
    },
    [job, changedFields, reload],
  )

  const hasChanges = useMemo(() => changedFields.size > 0, [changedFields])

  return {
    job,
    setJob,
    originalJob,
    changedFields,
    markChanged,
    hasChanges,
    isLoading,
    isSaving,
    reload,
    patch,
    save,
  }
}