"use client"

import MaintenancePanel from "./MaintenancePanel"

type JobCard = { key: string; name: string; value: string; pct: number; icon: any }

interface Props {
  isLoadingJobsMetrics: boolean
  jobsCards: JobCard[]
  statusDistribution: any[]
}

export default function JobsPanel({ isLoadingJobsMetrics, jobsCards, statusDistribution }: Props) {
  return <MaintenancePanel />
}