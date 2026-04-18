"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Subcontractor } from "@/lib/types"
import { Search, Eye, LinkIcon, Trash2, Loader2, User, Building2, Users, Calculator, Tag } from "lucide-react"
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
import { apiFetch } from "@/lib/apiFetch"

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
  const [syncPodioUnlink, setSyncPodioUnlink] = useState(true)

  // Totals per subcontractor
  const [subTotals, setSubTotals] = useState<Record<string, { formula: number; adjFormula: number }>>({})
  const [loadingTotals, setLoadingTotals] = useState(false)

  const fetchSubcontractorTotals = useCallback(async () => {
    if (!jobId || !subcontractors.length) return
    try {
      setLoadingTotals(true)
      
      const results: Record<string, { formula: number; adjFormula: number }> = {}
      
      await Promise.all(
        subcontractors.map(async (sub) => {
          const subId = String(sub.ID_Subcontractor || "")
          if (!subId) return

          try {
            const res = await apiFetch(`/api/order?ID_Jobs=${jobId}&ID_Subcontractor=${subId}`)
            if (!res.ok) return
            const data = await res.json()
            
            const orders: any[] = Array.isArray(data) ? data : data.results || data.items || data.data || []
            
            const subFormula = orders.reduce((sum, o) => sum + Number(o.Formula ?? o.formula ?? 0), 0)
            const subAdjFormula = orders.reduce((sum, o) => sum + Number(o.Adj_formula ?? o.adj_formula ?? 0), 0)
            
            const key = subId.trim().toUpperCase().replace(/^SUBC-?/, "")
            results[key] = { formula: subFormula, adjFormula: subAdjFormula }
          } catch (err) {
            console.error(`Error fetching totals for sub ${subId}:`, err)
          }
        })
      )
      
      setSubTotals(results)
    } catch (err) {
      console.error("[SubcontractorsTable] Error in fetchSubcontractorTotals:", err)
    } finally {
      setLoadingTotals(false)
    }
  }, [jobId, subcontractors])

  useEffect(() => {
    fetchSubcontractorTotals()
  }, [fetchSubcontractorTotals])

  const filteredSubcontractors = subcontractors.filter(
    (sub) =>
      (sub.Name ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.Organization ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.ID_Subcontractor ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleUnlinkClick = (subcontractor: any) => {
    setSubcontractorToUnlink(subcontractor)
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
      fetchAllOrders() // refresh totals after unlinking (though orders should be gone too)
    } catch (error) {
      console.error("Error unlinking subcontractor:", error)
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Stylized Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gqm-green/10 text-gqm-green-dark ring-1 ring-gqm-green/20">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Linked Subcontractors</h3>
              <Badge variant="secondary" className="rounded-full bg-slate-200 text-slate-600 border-none px-2 py-0">
                {subcontractors.length}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm border-slate-200 bg-white focus:ring-gqm-green/20 rounded-xl"
              />
            </div>
            {onLinkClick && (
              <Button 
                onClick={onLinkClick} 
                className="h-9 rounded-xl bg-gqm-green text-white hover:bg-gqm-green/90 shadow-sm px-4 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <LinkIcon className="h-3.5 w-3.5 mr-2" />
                Link Subcontractor
              </Button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-50 hover:bg-transparent">
                <TableHead className="px-6 h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-400">ID</TableHead>
                <TableHead className="px-4 h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Subcontractor</TableHead>
                <TableHead className="px-4 h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Formula Total</TableHead>
                <TableHead className="px-4 h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Adj Formula Total</TableHead>
                <TableHead className="px-6 h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubcontractors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-slate-200" />
                      <p className="text-sm text-slate-400 font-medium">No subcontractors linked to this job</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubcontractors.map((sub) => {
                  const orgText = normalizeOrg(sub.Organization)
                  const normalizeId = (id: string) => id.trim().toUpperCase().replace(/^SUBC-?/, "")
                  const subIdKey = normalizeId(String(sub.ID_Subcontractor || ""))
                  const totals = subTotals[subIdKey] || { formula: 0, adjFormula: 0 }
                  
                  return (
                    <TableRow key={sub.ID_Subcontractor} className="border-b border-slate-50 last:border-0 group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-slate-400">{sub.ID_Subcontractor}</span>
                      </TableCell>

                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200 group-hover:bg-white transition-colors">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-700 truncate">{sub.Name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-slate-400 text-xs">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{orgText || "Individual"}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                            <Calculator className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-semibold text-slate-600 tabular-nums">
                            ${totals.formula.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                            <Tag className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-bold text-emerald-700 tabular-nums">
                            ${totals.adjFormula.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-gqm-yellow hover:text-gqm-green-dark"
                            onClick={() => onViewDetails(sub)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {onUnlink && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleUnlinkClick(sub)}
                              title="Unlink"
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
      </div>

      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent className="sm:max-w-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Subcontractor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink <span className="font-bold text-slate-700">{subcontractorToUnlink?.Name}</span> from this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="leading-tight">
              <Label className="text-sm font-semibold text-slate-700">Sync Podio</Label>
              <p className="text-[11px] text-slate-400 mt-0.5">{syncPodioUnlink ? "Remote data will be updated" : "Only local change will occur"}</p>
            </div>
            <Switch checked={syncPodioUnlink} onCheckedChange={setSyncPodioUnlink} disabled={unlinking} />
          </div>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={unlinking} className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUnlink} 
              disabled={unlinking} 
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {unlinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                "Unlink Subcontractor"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}