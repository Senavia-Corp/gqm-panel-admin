"use client"

import React from "react"
import { SubcontractorsTable } from "@/components/organisms/SubcontractorsTable"
import { SubcontractorDetails } from "@/components/organisms/SubcontractorDetails"
import type { Subcontractor } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"

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

function resolveJobYearForPodioSync(job: any): number | undefined {
  const jobType = String(job?.Job_type ?? job?.job_type ?? "").toUpperCase()

  const pickDate =
    jobType === "PTL"
      ? (job?.Estimated_start_date ?? job?.estimated_start_date ?? null)
      : (job?.Date_assigned ?? job?.date_assigned ?? null)

  if (!pickDate) return undefined

  const d = new Date(pickDate)
  const y = d.getFullYear()
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
  jobYear,
}: Props) {
  console.log("Aqui el job de los subc", job);

  if (role !== "GQM_MEMBER") return null
  if (!job) return null

  const jobId = String(job?.ID_Jobs ?? job?.id ?? "")
  const jobPodioId = job.podio_item_id
  const jobYearForPodioSync = resolveJobYearForPodioSync(job)

  const handleUnlink = async ({ subcontractorId, syncPodio }: { subcontractorId: string; syncPodio: boolean }) => {
    const yearToSend = syncPodio ? jobYearForPodioSync : undefined

    if (syncPodio && !yearToSend) {
      throw new Error("Year is required when Sync Podio is enabled.")
    }

    const response = await apiFetch("/api/job-subcontractor", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        subcontractorId,
        sync_podio: syncPodio, // ✅ CRÍTICO
        year: yearToSend,      // ✅ CRÍTICO
      }),
    })

    if (!response.ok) {
      const raw = await response.text().catch(() => "")
      throw new Error(raw || "Failed to unlink subcontractor")
    }

    await onReload?.()
  }

  if (!selectedSubcontractor) {
    return (
      <SubcontractorsTable
        jobId={jobId}
        onViewDetails={setSelectedSubcontractor}
        subcontractors={job?.subcontractors || []}
        onLinkClick={onOpenLinkDialog}
        onUnlink={handleUnlink}
      />
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
