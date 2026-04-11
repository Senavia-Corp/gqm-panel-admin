"use client"

import React from "react"
import MaintenancePanel from "./MaintenancePanel"

type JobTab = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

type Props = {
  jobTab: JobTab
  yearTab: YearTab
}

export default function ClientsPanel({ jobTab, yearTab }: Props) {
  return <MaintenancePanel />
}