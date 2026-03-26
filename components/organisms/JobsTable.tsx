"use client"

import { Pencil, Trash2, Building2, User } from "lucide-react"
import type { JobDTO, JobType } from "@/lib/types"
import { StatusBadge } from "@/components/atoms/StatusBadge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

type JobsTableVariant = "ALL" | JobType

interface JobsTableProps {
  jobs: JobDTO[]
  tableVariant?: JobsTableVariant
  onEdit?: (jobId: string) => void
  onDelete?: (job: JobDTO) => void
  userRole?: "GQM_MEMBER" | "LEAD_TECHNICIAN"
}

function safeDateLabel(dateString: string | null | undefined) {
  if (!dateString) return "-"

  const m = String(dateString).match(/\b(\d{1,2})\s([A-Za-z]{3})\s(\d{4})\b/)
  if (m) {
    const dd = m[1].padStart(2, "0")
    const mon = m[2].toLowerCase()
    const yyyy = m[3]

    const monthMap: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    }

    const mm = monthMap[mon]
    if (mm) {
      const iso = `${yyyy}-${mm}-${dd}T00:00:00Z`
      const d = new Date(iso)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { timeZone: "UTC" })
      }
    }
  }

  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString(undefined, { timeZone: "UTC" })
}

function getMidColumnConfig(variant: JobsTableVariant) {
  if (variant === "ALL" || variant === "QID") return { key: "project", header: "Project Name" }
  if (variant === "PTL") return { key: "location", header: "Location" }
  return { key: "none", header: "" }
}

function ClientAvatar() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gqm-green/10 ring-1 ring-gqm-green/20">
      <Building2 className="h-4 w-4 text-gqm-green-dark" />
    </div>
  )
}

function RepAvatar() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gqm-yellow/30 ring-1 ring-gqm-yellow/50">
      <User className="h-4 w-4 text-gqm-green-dark" />
    </div>
  )
}

const ConvertToPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-"
  return `${(value * 100).toFixed(2)}%`
}

export function JobsTable({ jobs, tableVariant = "ALL", onEdit, onDelete, userRole }: JobsTableProps) {
  const isPar = tableVariant === "PAR"
  const isPtl = tableVariant === "PTL"
  const isQid = tableVariant === "QID"
  const mid = getMidColumnConfig(tableVariant)

  const dateHeader = isPtl ? "Start Date" : isQid || isPar ? "Date Assigned" : "Date"

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6">Job ID</TableHead>
            <TableHead className="px-4">Client</TableHead>
            <TableHead className="px-4">Representative</TableHead>
            {!isPar && <TableHead className="px-4">{mid.header}</TableHead>}
            <TableHead className="px-4">Target Sold Pricing</TableHead>
            <TableHead className="px-4">Target %</TableHead>
            <TableHead className="px-4">Status</TableHead>
            <TableHead className="px-6 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => {
            const firstMember = Array.isArray(job.members) && job.members.length > 0 ? job.members[0] : null
            const client = job.client

            const repName =
              (firstMember as any)?.Member_Name ||
              (firstMember as any)?.Acc_Rep ||
              (firstMember as any)?.Name ||
              (firstMember as any)?.name ||
              null

            const repId = (firstMember as any)?.ID_Member || (firstMember as any)?.id || null

            const clientCommunity =
              (client as any)?.Client_Community ||
              (client as any)?.Prop_Manager ||
              (client as any)?.Parent_Company ||
              (client as any)?.Parent_Mgmt_Company ||
              null

            const clientId = (client as any)?.ID_Client || null

            let midValue: string = "-"
            if (!isPar) {
              if (mid.key === "project") midValue = (job.Project_name as any) ?? "-"
              else if (mid.key === "location") midValue = (job as any)?.Project_location ?? "-"
            }

            const gqmFormula = (job as any)?.Gqm_formula_pricing ?? (job as any)?.gqm_formula_pricing ?? "-"

            const jobType = (job as any)?.Job_type
            const dateRaw =
              jobType === "PTL" ? (job as any)?.Estimated_start_date : (job as any)?.Date_assigned ?? (job as any)?.Estimated_start_date

            return (
              <TableRow key={job.ID_Jobs}>
                {/* Id Jobs */}
                <TableCell className="px-6 py-4 font-medium text-sm">{job.ID_Jobs}</TableCell>

                {/* Client */}
                <TableCell className="px-4 py-4">
                  {client ? (
                    <div className="flex items-center gap-3">
                      <ClientAvatar />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{clientCommunity ?? "Client"}</span>
                        <span className="text-xs text-muted-foreground">{clientId ?? "-"}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No client associated</span>
                  )}
                </TableCell>

                {/* Representative */}
                <TableCell className="px-4 py-4">
                  {repName ? (
                    <div className="flex items-center gap-3">
                      <RepAvatar />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{repName}</span>
                        <span className="text-xs text-muted-foreground">{repId ?? "-"}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No representative</span>
                  )}
                </TableCell>

                {/* Project Name / Mid Value */}
                {!isPar && <TableCell className="px-4 py-4 font-medium">{midValue || "-"}</TableCell>}

                {/* Target Sold Pricing */}
                <TableCell className="px-6 py-4 font-medium text-sm">${job.Gqm_target_sold_pricing ?? "-"}</TableCell>

                {/* Target Return */}
                <TableCell className="px-6 py-4 font-medium text-sm">{ConvertToPercentage(job.Gqm_target_return) ?? "-"}</TableCell>

                <TableCell className="px-4 py-4">
                  <StatusBadge status={job.Job_status as any} />
                </TableCell>

                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/jobs/${job.ID_Jobs}`}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80"
                        onClick={() => onEdit?.(job.ID_Jobs)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>

                    {userRole === "GQM_MEMBER" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-red-500 text-white hover:bg-red-600"
                        onClick={() => onDelete?.(job)}
                        title="Delete job"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}