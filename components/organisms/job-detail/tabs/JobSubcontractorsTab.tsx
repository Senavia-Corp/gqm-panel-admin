"use client"

import React from "react"
import { SubcontractorsTable } from "@/components/organisms/SubcontractorsTable"
import { SubcontractorDetails } from "@/components/organisms/SubcontractorDetails"
import type { Subcontractor } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"
import { JobOpportunitiesSection } from "./JobOpportunitiesSection"

type Props = {
  role: string
  job: any
  selectedSubcontractor: Subcontractor | null
  setSelectedSubcontractor: (value: Subcontractor | null) => void
  onOpenLinkDialog: () => void
  onReload: () => Promise<any> | void
  timelineEvents: any[]
  syncPodio: boolean
  jobYear?: number
  jobPodioId?: string
}

/**
 * FIX: derive year from the first numeric digit in the Job ID.
 * QID5xxx → 2025 | PTL6xxx → 2026 | PAR4xxx → 2024
 * Falls back to date-based resolution only if no numeric digit is found.
 */
function resolveJobYearFromId(job: any): number | undefined {
  const id = String(job?.ID_Jobs ?? job?.id ?? "").trim()
  if (id) {
    const match = id.match(/\d/)
    if (match) return 2020 + parseInt(match[0], 10)
  }
  // Fallback to date
  const jobType = String(job?.Job_type ?? job?.job_type ?? "").toUpperCase()
  const dateStr =
    jobType === "PTL"
      ? (job?.Estimated_start_date ?? job?.estimated_start_date ?? null)
      : (job?.Date_assigned ?? job?.date_assigned ?? null)
  if (!dateStr) return undefined
  const y = new Date(dateStr).getFullYear()
  return Number.isFinite(y) ? y : undefined
}

export function JobSubcontractorsTab({
  role,
  job,
  selectedSubcontractor,
  setSelectedSubcontractor,
  onOpenLinkDialog,
  onReload,
  timelineEvents,
  syncPodio,
}: Props) {
  if (role !== "GQM_MEMBER") return null
  if (!job) return null

  const jobId              = String(job?.ID_Jobs ?? job?.id ?? "")
  const jobPodioId         = job.podio_item_id
  // FIX: use ID-based year resolution
  const jobYearForPodioSync = resolveJobYearFromId(job)

  const handleUnlink = async ({ subcontractorId, syncPodio }: { subcontractorId: string; syncPodio: boolean }) => {
    const yearToSend = syncPodio ? jobYearForPodioSync : undefined
    if (syncPodio && !yearToSend) {
      throw new Error("Year is required when Sync Podio is enabled.")
    }
    const response = await apiFetch("/api/job-subcontractor", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, subcontractorId, sync_podio: syncPodio, year: yearToSend }),
    })
    if (!response.ok) {
      const raw = await response.text().catch(() => "")
      throw new Error(raw || "Failed to unlink subcontractor")
    }
    await onReload?.()
  }

  if (!selectedSubcontractor) {
    return (
      <div className="space-y-8">
        <SubcontractorsTable
          jobId={jobId}
          onViewDetails={setSelectedSubcontractor}
          subcontractors={job?.subcontractors || []}
          onLinkClick={onOpenLinkDialog}
          onUnlink={handleUnlink}
        />
        <JobOpportunitiesSection jobId={jobId} userRole={role} />
      </div>
    )
  }

  return (
    <SubcontractorDetails
      subcontractor={selectedSubcontractor}
      onBack={() => setSelectedSubcontractor(null)}
      jobId={jobId}
      client={job?.client}
      timelineEvents={timelineEvents}
      estimateCosts={job?.estimate_costs || []}
      defaultSyncPodio={syncPodio}
      jobYearForPodioSync={jobYearForPodioSync}
      jobPodioId={jobPodioId}
    />
  )
}