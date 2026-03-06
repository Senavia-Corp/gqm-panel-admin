"use client"

import { TechniciansTable } from "@/components/organisms/TechniciansTable"

interface LeadTechnicianTechniciansViewProps {
  jobId: string
  job: any
}

export function LeadTechnicianTechniciansView({ jobId, job }: LeadTechnicianTechniciansViewProps) {
  const subcontractor = job?.subcontractors?.[0]
  const technicians = subcontractor?.technicians || []

  return (
    <div>
      <TechniciansTable
        technicians={technicians}
        onViewDetails={(technician) => {
          // Handle view details if needed
        }}
      />
    </div>
  )
}
