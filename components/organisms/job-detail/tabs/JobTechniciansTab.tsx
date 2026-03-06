"use client"

import React from "react"
import dynamic from "next/dynamic"

const TechnicianJobSidebar = dynamic(
  () => import("@/components/organisms/TechnicianJobSidebar").then((mod) => mod.TechnicianJobSidebar),
  { ssr: false },
)

const LeadTechnicianTechniciansView = dynamic(
  () => import("@/components/organisms/LeadTechnicianTechniciansView").then((mod) => mod.LeadTechnicianTechniciansView),
  { ssr: false },
)

type Props = {
  role: string
  jobId: string
  job: any
}

export function JobTechniciansTab({ role, jobId, job }: Props) {
  if (role !== "LEAD_TECHNICIAN") return null
  if (!job) return null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <LeadTechnicianTechniciansView jobId={jobId} job={job} />
      </div>

      <div className="space-y-6">
        <TechnicianJobSidebar job={job} subcontractor={job?.subcontractors?.[0]} />
      </div>
    </div>
  )
}
