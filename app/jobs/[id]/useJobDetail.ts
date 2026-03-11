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

export function useJobDetail(jobId: string) {
  const [job, setJob] = useState<JobDTO | null>(null)
  const [originalJob, setOriginalJob] = useState<JobDTO | null>(null)
  const [changedFields, setChangedFields] = useState<ChangedFields>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

  // ── Mark changed ────────────────────────────────────────────────────────────
  const markChanged = useCallback((key: string) => {
    setChangedFields((prev) => new Set([...prev, key]))
  }, [])

  const getValue = (j: any, uiKey: string, pyKey: string) =>
    j?.[uiKey] !== undefined ? j[uiKey] : j?.[pyKey]

  // ── Manual patch (direct payload, no field mapping) ─────────────────────────
  const patch = useCallback(
    async (updates: Record<string, any>, opts?: SaveOptions) => {
      const idJob = job?.ID_Jobs
      if (!idJob) throw new Error("Job ID_Jobs is missing")

      // FIX: derive year from Job ID and pass it to updateJob
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

  // ── Intelligent SAVE — maps UI field keys → Python field names ──────────────
  const save = useCallback(
    async (opts?: SaveOptions) => {
      const idJob = job?.ID_Jobs
      if (!idJob) throw new Error("Job ID_Jobs is missing")
      if (changedFields.size === 0) return

      // FIX: derive year from Job ID (not from dates — dates can have offsets)
      const year = resolveYearFromJobId(idJob)

      const payload: UpdateJobRequest = {}

      changedFields.forEach((field) => {
        switch (field) {
          // ── Details fields ────────────────────────────────────────────────
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
          case "pricingTarget":
            payload.Pricing_target = (job as any)?.Pricing_target ?? null
            break
          case "permit":
            payload.Permit = (job as any)?.Permit ?? null
            break
        }

        // ── Pricing numeric fields ────────────────────────────────────────
        if (field.startsWith("pricing.")) {
          const key = field.replace("pricing.", "")
          switch (key) {
            case "gqmFormulaPricing":
              payload.Gqm_formula_pricing = job?.Gqm_formula_pricing ?? null; break
            case "gqmAdjFormulaPricing":
              payload.Gqm_adj_formula_pricing = job?.Gqm_adj_formula_pricing ?? null; break
            case "gqmTargetReturn":
              payload.Gqm_target_return = job?.Gqm_target_return ?? null; break
            case "gqmTargetSoldPricing":
              payload.Gqm_target_sold_pricing = job?.Gqm_target_sold_pricing ?? null; break
            case "gqmPremiumInMoney":
              payload.Gqm_premium_in_money = job?.Gqm_premium_in_money ?? null; break
            case "gqmFinalSoldPricing":
              payload.Gqm_final_sold_pricing = job?.Gqm_final_sold_pricing ?? null; break
            case "gqmFinalPercentage":
              payload.Gqm_final_percentage = job?.Gqm_final_percentage ?? null; break
            case "estimatedRent":
              payload.Estimated_rent = (job as any)?.Estimated_rent ?? null; break
            case "estimatedMaterial":
              payload.Estimated_material = (job as any)?.Estimated_material ?? null; break
            case "estimatedCity":
              payload.Estimated_city = (job as any)?.Estimated_city ?? null; break
            case "techFormulaPricing":
              payload.Tech_formula_pricing = (job as any)?.Tech_formula_pricing ?? null; break
            case "accReceivable":
              payload.Acc_receivable = (job as any)?.Acc_receivable ?? null; break
            case "gqmFinalFormPricing":
              payload.Gqm_final_form_pricing = (job as any)?.Gqm_final_form_pricing ?? null; break
            case "gqmFinalAdjFormPricing":
              payload.Gqm_final_adj_form_pricing = (job as any)?.Gqm_final_adj_form_pricing ?? null; break
            case "gqmFinalTargetReturn":
              payload.Gqm_final_target_return = (job as any)?.Gqm_final_target_return ?? null; break
            case "gqmFinalPremInMoney":
              payload.Gqm_final_prem_in_money = (job as any)?.Gqm_final_prem_in_money ?? null; break
            // ── Fees Paid section ──────────────────────────────────────────
            case "totalMaterialsFees":
              payload.Gqm_total_materials_fees = (job as any)?.Gqm_total_materials_fees ?? null; break
            case "paidFees":
              payload.Gqm_paid_fees = (job as any)?.Gqm_paid_fees ?? null; break
            case "bldgDeptFees":
              payload.Bldg_dept_fees = (job as any)?.Bldg_dept_fees ?? null; break
          }
        }
      })



      setIsSaving(true)
      try {
        // FIX: pass year so the proxy forwards ?year= to Python
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