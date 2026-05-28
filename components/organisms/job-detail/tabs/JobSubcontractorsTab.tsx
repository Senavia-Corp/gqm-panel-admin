"use client"

import React, { useState, useEffect } from "react"
import { SubcontractorsTable } from "@/components/organisms/SubcontractorsTable"
import { SubcontractorDetails } from "@/components/organisms/SubcontractorDetails"
import type { Subcontractor } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"
import { useQuery } from "@tanstack/react-query"
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

function resolveJobYearFromId(job: any): number | undefined {
  const id = String(job?.ID_Jobs ?? job?.id ?? "").trim()
  if (id) {
    const match = id.match(/\d/)
    if (match) return 2020 + parseInt(match[0], 10)
  }
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
  const isTech = role === "LEAD_TECHNICIAN"
  const { data: techSubId, isLoading: loadingTech } = useQuery<string | null>({
    queryKey: ["technician_sub_id"],
    queryFn: async () => {
      const userData = localStorage.getItem("user_data")
      if (!userData) return null
      const user = JSON.parse(userData)
      const res = await apiFetch(`/api/technician/${user.id}`)
      if (!res.ok) throw new Error("Failed to fetch tech")
      const data = await res.json()
      return data?.subcontractor?.ID_Subcontractor || null
    },
    enabled: isTech,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })

  if (role !== "GQM_MEMBER" && role !== "LEAD_TECHNICIAN") return null
  if (!job) return null
  if (loadingTech) return <div className="p-8 text-center text-slate-400">Loading subcontractor information...</div>

  const jobId              = String(job?.ID_Jobs ?? job?.id ?? "")
  const jobPodioId         = job.podio_item_id
  const jobYearForPodioSync = resolveJobYearFromId(job)

  const handleUnlink = async ({ subcontractorId, syncPodio }: { subcontractorId: string; syncPodio: boolean }) => {
    if (isTech) return // Guard
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

  // Filter subcontractors for technicians
  const allSubcontractors = job?.subcontractors || []
  const filteredSubcontractors = isTech 
    ? allSubcontractors.filter((s: any) => s.ID_Subcontractor === techSubId)
    : allSubcontractors

  if (!selectedSubcontractor) {
    return (
      <div className="space-y-8">
        <SubcontractorsTable
          jobId={jobId}
          onViewDetails={setSelectedSubcontractor}
          subcontractors={filteredSubcontractors}
          onLinkClick={isTech ? undefined : onOpenLinkDialog}
          onUnlink={isTech ? undefined : handleUnlink}
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
      bills={job?.financial_docs || []}
      jobSubcontractors={job?.subcontractors || []}
      defaultSyncPodio={syncPodio}
      jobYearForPodioSync={jobYearForPodioSync}
      jobPodioId={jobPodioId}
      role={role}
    />
  )
}