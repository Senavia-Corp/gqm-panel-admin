"use client"

import Link from "next/link"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Trash2, Landmark, Mail, Phone } from "lucide-react"
import type { BuildingDeptRow } from "@/lib/types"

interface Props {
  rows: BuildingDeptRow[]
  onDelete: (row: BuildingDeptRow) => void
}

/** Normalizes string | string[] | null → string[] */
function toArr(val: string | string[] | null | undefined): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean) as string[]
  return [val]
}

export function BuildingDeptTable({ rows, onDelete }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Landmark className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500">No building departments found</p>
        <p className="text-xs text-slate-400">Try adjusting your search or add a new one</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-28">ID</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">City</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Location</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Phone</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const emails = toArr(row.Office_Email)
            const phones = toArr(row.Phone)

            return (
              <TableRow key={row.ID_BldgDept} className="hover:bg-slate-50/60 transition-colors">

                {/* ID */}
                <TableCell>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                    {row.ID_BldgDept}
                  </span>
                </TableCell>

                {/* City */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <Landmark className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      {row.City_BldgDept ?? "—"}
                    </span>
                  </div>
                </TableCell>

                {/* Location */}
                <TableCell>
                  <span className="text-sm text-slate-600">{row.Location ?? "—"}</span>
                </TableCell>

                {/* Email */}
                <TableCell>
                  {emails.length > 0 ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="text-sm text-slate-600 truncate">{emails[0]}</span>
                      {emails.length > 1 && (
                        <span className="flex-shrink-0 text-[11px] font-semibold text-slate-400">
                          +{emails.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>

                {/* Phone */}
                <TableCell>
                  {phones.length > 0 ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="text-sm text-slate-600 truncate">{phones[0]}</span>
                      {phones.length > 1 && (
                        <span className="flex-shrink-0 text-[11px] font-semibold text-slate-400">
                          +{phones.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>

                {/* Actions — always visible */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/building-departments/${row.ID_BldgDept}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        title="View details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
