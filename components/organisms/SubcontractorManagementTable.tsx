"use client"

import { Eye, Trash2 } from "lucide-react"
import type { Subcontractor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface SubcontractorManagementTableProps {
  subcontractors: Subcontractor[]
  onDelete?: (subcontractor: Subcontractor) => void
}

export function SubcontractorManagementTable({ subcontractors, onDelete }: SubcontractorManagementTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6">ID</TableHead>
            <TableHead className="px-4">Name</TableHead>
            <TableHead className="px-4">Organization</TableHead>
            <TableHead className="px-4">Status</TableHead>
            <TableHead className="px-4">Email</TableHead>
            <TableHead className="px-4">Score</TableHead>
            <TableHead className="px-6 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subcontractors.map((subcontractor) => (
            <TableRow key={subcontractor.ID_Subcontractor}>
              <TableCell className="px-6 py-4 font-mono text-sm">{subcontractor.ID_Subcontractor}</TableCell>
              <TableCell className="px-4 py-4 font-medium">{subcontractor.Name}</TableCell>
              <TableCell className="px-4 py-4">{subcontractor.Organization}</TableCell>
              <TableCell className="px-4 py-4">
                <Badge
                  variant={subcontractor.Status === "Active" ? "default" : "secondary"}
                  className={
                    subcontractor.Status === "Active"
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-400 hover:bg-gray-500"
                  }
                >
                  {subcontractor.Status}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-4 text-sm">{subcontractor.Email_Address}</TableCell>
              <TableCell className="px-4 py-4">
                <Badge className="bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/90">
                  {subcontractor.Score}
                </Badge>
              </TableCell>
              <TableCell className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/subcontractors/${subcontractor.ID_Subcontractor}`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-gray-800 text-white hover:bg-gray-900"
                    onClick={() => onDelete?.(subcontractor)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
