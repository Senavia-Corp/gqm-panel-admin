"use client"

import React, { useState, useEffect } from "react"
import { SubcontractorsTable } from "@/components/organisms/SubcontractorsTable"
import { SubcontractorDetails } from "@/components/organisms/SubcontractorDetails"
import { LinkTechnicianModal } from "@/components/organisms/LinkTechnicianModal"
import { TechniciansTable } from "@/components/organisms/TechniciansTable"
import type { Subcontractor } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"
import { useQuery } from "@tanstack/react-query"
import { JobOpportunitiesSection } from "./JobOpportunitiesSection"
import { esPersonalInterno } from "@/lib/types"

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
  const RESTRICTED_ROLES = ["LEAD_TECHNICIAN", "SUBCONTRACTOR"]
  const isRestrictedRole = RESTRICTED_ROLES.includes(role)
  const isTech = role === "LEAD_TECHNICIAN"
  const isSubcontractor = role === "SUBCONTRACTOR"
  const [linkTechOpen, setLinkTechOpen] = useState(false)

  const { data: userSubId, isLoading: loadingSubId } = useQuery<string | null>({
    queryKey: ["restricted_sub_id"],
    queryFn: async () => {
      const userData = localStorage.getItem("user_data")
      if (!userData) return null
      const user = JSON.parse(userData)
      
      if (isSubcontractor) return user.id
      
      if (isTech) {
        const res = await apiFetch(`/api/technician/${user.id}`)
        if (!res.ok) throw new Error("Failed to fetch tech")
        const data = await res.json()
        return data?.subcontractor?.ID_Subcontractor || null
      }
      return null
    },
    enabled: isRestrictedRole,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })

  // FULL_ADMIN no estaba en la lista, asi que a un Full Admin esta pestaña le
  // salia COMPLETAMENTE EN BLANCO (verificado en el desplegado).
  if (!esPersonalInterno(role) && role !== "LEAD_TECHNICIAN" && role !== "SUBCONTRACTOR") return null
  if (!job) return null
  if (loadingSubId) return <div className="p-8 text-center text-slate-400">Loading subcontractor information...</div>

  const jobId              = String(job?.ID_Jobs ?? job?.id ?? "")
  const jobPodioId         = job.podio_item_id
  const jobYearForPodioSync = resolveJobYearFromId(job)

  const handleLinkTechnician = async (techId: string) => {
    const res = await apiFetch("/api/job-technician", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, technicianId: techId })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data?.error || "Failed to link technician")
    }
    setLinkTechOpen(false)
    await onReload?.()
  }

  const handleUnlinkTechnician = async (techId: string) => {
    if (isRestrictedRole && !isSubcontractor) return // Guard
    const res = await apiFetch("/api/job-technician", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, technicianId: techId })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data?.error || "Failed to unlink technician")
    }
    await onReload?.()
  }

  const handleUnlink = async ({ subcontractorId, syncPodio }: { subcontractorId: string; syncPodio: boolean }) => {
    if (isRestrictedRole) return // Guard
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

  // Filter subcontractors for restricted roles
  const allSubcontractors = job?.subcontractors || []
  const filteredSubcontractors = isRestrictedRole 
    ? allSubcontractors.filter((s: any) => s.ID_Subcontractor === userSubId)
    : allSubcontractors

  const linkedTechnicians = job?.technicians || []

  if (!selectedSubcontractor) {
    return (
      <div className="space-y-8">
        <SubcontractorsTable
          jobId={jobId}
          onViewDetails={setSelectedSubcontractor}
          subcontractors={filteredSubcontractors}
          onLinkClick={isRestrictedRole ? undefined : onOpenLinkDialog}
          onUnlink={isRestrictedRole ? undefined : handleUnlink}
        />

        <div className="space-y-4">
          <TechniciansTable
            technicians={linkedTechnicians}
            onViewDetails={() => {}}
            onLinkClick={isSubcontractor ? () => setLinkTechOpen(true) : undefined}
            onUnlinkClick={isSubcontractor ? handleUnlinkTechnician : undefined}
          />
        </div>

        {!isRestrictedRole && <JobOpportunitiesSection jobId={jobId} userRole={role} />}

        <LinkTechnicianModal
          open={linkTechOpen}
          onClose={() => setLinkTechOpen(false)}
          onLink={handleLinkTechnician}
          excludeIds={linkedTechnicians.map((t: any) => t.ID_Technician)}
        />
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