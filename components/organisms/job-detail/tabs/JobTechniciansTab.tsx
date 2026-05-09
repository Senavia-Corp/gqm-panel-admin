"use client"

import React from "react"
import dynamic from "next/dynamic"

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
    <div className="space-y-6">
      <LeadTechnicianTechniciansView jobId={jobId} job={job} />
    </div>
  )
}
