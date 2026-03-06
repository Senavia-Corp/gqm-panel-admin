"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Subcontractor } from "@/lib/types"
import { Search, Eye, LinkIcon, Trash2, Loader2, User, Building2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface SubcontractorsTableProps {
  jobId: string
  onViewDetails: (subcontractor: Subcontractor) => void
  subcontractors?: any[]
  onLinkClick?: () => void
  onUnlink?: (args: { subcontractorId: string; syncPodio: boolean }) => Promise<void>
}

function normalizeOrg(raw: any): string {
  if (raw === null || raw === undefined) return ""
  if (Array.isArray(raw)) return raw.map((r) => String(r).trim()).filter(Boolean).join(", ")
  if (typeof raw === "object") {
    try {
      const vals = Object.values(raw)
      if (vals.length > 0) return String(vals[0]).trim()
    } catch {
      return String(raw)
    }
  }
  let s = String(raw).trim()
  s = s.replace(/\\"/g, '"').replace(/\\'/g, "'")
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) s = s.slice(1, -1).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1)
  s = s.replace(/^[\{\[\]"'\s]+|[\}\]\s"']+$/g, "").trim()
  return s
}

export function SubcontractorsTable({
  jobId,
  onViewDetails,
  subcontractors = [],
  onLinkClick,
  onUnlink,
}: SubcontractorsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false)
  const [subcontractorToUnlink, setSubcontractorToUnlink] = useState<any>(null)
  const [unlinking, setUnlinking] = useState(false)

  // ✅ nuevo: toggle para el unlink
  const [syncPodioUnlink, setSyncPodioUnlink] = useState(true)

  const filteredSubcontractors = subcontractors.filter(
    (sub) =>
      (sub.Name ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.Organization ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.ID_Subcontractor ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleUnlinkClick = (subcontractor: any) => {
    setSubcontractorToUnlink(subcontractor)
    // opcional: por defecto ON cada vez que abres
    setSyncPodioUnlink(true)
    setUnlinkDialogOpen(true)
  }

  const handleConfirmUnlink = async () => {
    if (!subcontractorToUnlink || !onUnlink) return

    setUnlinking(true)
    try {
      await onUnlink({
        subcontractorId: subcontractorToUnlink.ID_Subcontractor,
        syncPodio: syncPodioUnlink,
      })
      setUnlinkDialogOpen(false)
      setSubcontractorToUnlink(null)
    } catch (error) {
      console.error("Error unlinking subcontractor:", error)
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold">All Subcontractors</h3>
          <Badge variant="secondary" className="rounded-full">
            {subcontractors.length}
          </Badge>
        </div>
        {onLinkClick && (
          <Button onClick={onLinkClick} className="bg-gqm-green text-white hover:bg-gqm-green/90">
            <LinkIcon className="h-4 w-4 mr-2" />
            Link Subcontractor
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subcontractors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">ID</TableHead>
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4">Organization</TableHead>
              <TableHead className="px-4">Score</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubcontractors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No subcontractors linked to this job yet</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredSubcontractors.map((subcontractor) => {
                const orgText = normalizeOrg(subcontractor.Organization)
                return (
                  <TableRow key={subcontractor.ID_Subcontractor}>
                    <TableCell className="px-6 py-4 font-mono text-sm">{subcontractor.ID_Subcontractor}</TableCell>

                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gqm-yellow/10 text-gqm-yellow-600 ring-1 ring-gqm-yellow/20">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{subcontractor.Name}</span>
                          {subcontractor.Email && <span className="text-xs text-muted-foreground">{String(subcontractor.Email)}</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gqm-green/10 text-gqm-green-dark ring-1 ring-gqm-green/20">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{orgText || "—"}</span>
                          {subcontractor.Address && <span className="text-xs text-muted-foreground">{String(subcontractor.Address)}</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <Badge className="bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80">{subcontractor.Score ?? "—"}</Badge>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <Badge
                        variant={subcontractor.Status === "Active" ? "default" : "secondary"}
                        className={subcontractor.Status === "Active" ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        {subcontractor.Status}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80"
                          onClick={() => onViewDetails(subcontractor)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {onUnlink && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleUnlinkClick(subcontractor)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Subcontractor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink {subcontractorToUnlink?.Name} from this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* ✅ nuevo: toggle */}
          <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="leading-tight">
              <Label className="text-sm">Sync Podio</Label>
              <p className="text-xs text-muted-foreground">{syncPodioUnlink ? "Enabled" : "Disabled"}</p>
            </div>
            <Switch checked={syncPodioUnlink} onCheckedChange={setSyncPodioUnlink} disabled={unlinking} />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlink} disabled={unlinking} className="bg-red-600 hover:bg-red-700">
              {unlinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                "Unlink"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}