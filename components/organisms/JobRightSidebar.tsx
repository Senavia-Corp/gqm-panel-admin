"use client"

import { ClientCard } from "@/components/organisms/ClientCard"
import { TechnicianJobSidebar } from "@/components/organisms/TechnicianJobSidebar"
import { JobSidebarChat } from "@/components/organisms/job-detail/JobSidebarChat"
import { mapClientDetailsToClient } from "@/lib/mappers/client.mapper"
import type { JobDTO, UserRole } from "@/lib/types"

type Props = {
  role: UserRole
  job:  JobDTO
}

export function JobRightSidebar({ role, job }: Props) {

  if (role === "LEAD_TECHNICIAN") {
    return (
      <div className="space-y-6">
        <TechnicianJobSidebar job={job} subcontractor={job?.subcontractors?.[0]} />
      </div>
    )
  }

  const jobId = (job as any)?.ID_Jobs ?? (job as any)?.id ?? null

  return (
    <div className="space-y-6">
      {job.client ? <ClientCard client={mapClientDetailsToClient(job.client)} /> : null}
      {jobId ? <JobSidebarChat jobId={jobId} /> : null}
    </div>
  )
}
