"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Loader2, ChevronLeft, ChevronRight, Link2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/apiFetch"

type TableResponse = {
  page: number
  limit: number
  total: number
  results: Array<{
    ID_Subcontractor: string
    Name?: string
    Organization?: any
    Status?: string
    Email_Address?: string
    Score?: number
  }>
}

interface LinkSubcontractorDialogProps {
  open: boolean
  onClose: () => void
  jobId: string
  onSubcontractorLinked: () => void

  /**
   * Si quieres que el toggle sea "heredado" del JobDetailPage,
   * pásalo como prop y úsalo como default.
   */
  defaultSyncPodio?: boolean
  jobYear?: number
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function LinkSubcontractorDialog({
  open,
  onClose,
  jobId,
  onSubcontractorLinked,
  defaultSyncPodio = true,
  jobYear
}: LinkSubcontractorDialogProps) {
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<TableResponse["results"]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("") // opcional: "Active"

  const [syncPodio, setSyncPodio] = useState<boolean>(defaultSyncPodio)

  const totalPages = useMemo(() => {
    const pages = Math.ceil((total || 0) / limit)
    return Math.max(1, pages)
  }, [total, limit])

  useEffect(() => {
    if (!open) return
    setPage(1)
    setSearchTerm("")
    setDebouncedSearch("")
    setStatusFilter("")
    setSyncPodio(defaultSyncPodio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    if (!open) return
    void fetchSubcontractors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, statusFilter])

  const fetchSubcontractors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("mode", "table")
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (statusFilter) params.set("status", statusFilter)

      const response = await fetch(`/api/subcontractors?${params.toString()}`, { method: "GET" })
      if (!response.ok) throw new Error("Failed to fetch subcontractors table")

      const data = (await response.json()) as TableResponse

      setRows(Array.isArray(data.results) ? data.results : [])
      setTotal(Number(data.total || 0))
    } catch (error) {
      console.error("Error fetching subcontractors:", error)
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows
    const q = debouncedSearch.toLowerCase()

    return rows.filter((s) => {
      const id = String(s.ID_Subcontractor ?? "").toLowerCase()
      const name = String(s.Name ?? "").toLowerCase()
      const org = normalizeOrg(s.Organization).toLowerCase()
      const email = String(s.Email_Address ?? "").toLowerCase()
      return id.includes(q) || name.includes(q) || org.includes(q) || email.includes(q)
    })
  }, [rows, debouncedSearch])

  const handleLinkSubcontractor = async (subcontractorId: string) => {
    setLinking(subcontractorId)
    try {
      if (!jobId || !subcontractorId) {
        console.error("[link dialog] Missing ids:", { jobId, subcontractorId })
        return
      }
      
      const response = await apiFetch("/api/job-subcontractor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, subcontractorId, sync_podio: syncPodio, year: jobYear }),
      })
      

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as any)?.error || "Failed to link subcontractor")
      }

      onSubcontractorLinked()
      onClose()
    } catch (error) {
      console.error("Error linking subcontractor:", error)
    } finally {
      setLinking(null)
    }
  }

  const canPrev = page > 1
  const canNext = page < totalPages

  const goPrev = () => setPage((p) => clamp(p - 1, 1, totalPages))
  const goNext = () => setPage((p) => clamp(p + 1, 1, totalPages))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="
    w-[96vw]
    max-w-[96vw]
    sm:max-w-none
    lg:w-[90vw]
    lg:max-w-[90vw]
    xl:w-[82vw]
    xl:max-w-[82vw]
    max-h-[85vh]
    overflow-hidden
    flex flex-col
  ">
        <DialogHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-xl">Link Subcontractor to Job</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a subcontractor from the optimized list (paginated).
              </p>
            </div>

            {/* ✅ Sync Podio toggle (link/unlink) */}
            <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
              <div className="leading-tight">
                <Label htmlFor="sync-podio-subc" className="text-sm">
                  Sync Podio
                </Label>
                <p className="text-xs text-muted-foreground">{syncPodio ? "Enabled" : "Disabled"}</p>
              </div>
              <Switch id="sync-podio-subc" checked={syncPodio} onCheckedChange={setSyncPodio} />
            </div>
          </div>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search (current page)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                }}
                className="pl-10"
              />
            </div>

            <Button
              variant={statusFilter === "Active" ? "default" : "outline"}
              onClick={() => {
                setPage(1)
                setStatusFilter((s) => (s === "Active" ? "" : "Active"))
              }}
              className={statusFilter === "Active" ? "bg-gqm-green hover:bg-gqm-green/90" : ""}
            >
              Active
            </Button>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>{" "}
              <span className="hidden md:inline">· Total {total}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrev} disabled={!canPrev || loading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goNext} disabled={!canNext || loading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-white">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead className="px-4">ID</TableHead>
                    <TableHead className="px-4">Name</TableHead>
                    <TableHead className="px-4">Organization</TableHead>
                    <TableHead className="px-4">Email</TableHead>
                    <TableHead className="px-4">Score</TableHead>
                    <TableHead className="px-4">Status</TableHead>
                    <TableHead className="px-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <p className="text-muted-foreground">No subcontractors found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((s) => {
                      const org = normalizeOrg(s.Organization)
                      return (
                        <TableRow key={s.ID_Subcontractor}>
                          <TableCell className="px-4 py-3 font-mono text-sm">{s.ID_Subcontractor}</TableCell>
                          <TableCell className="px-4 py-3 font-medium">{s.Name || "—"}</TableCell>
                          <TableCell className="px-4 py-3">{org || "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-sm">{s.Email_Address || "—"}</TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge className="bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80">
                              {s.Score ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge
                              variant={s.Status === "Active" ? "default" : "secondary"}
                              className={s.Status === "Active" ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              {s.Status ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleLinkSubcontractor(s.ID_Subcontractor)}
                              disabled={linking !== null}
                              className="bg-gqm-green text-white hover:bg-gqm-green/90"
                            >
                              {linking === s.ID_Subcontractor ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Linking...
                                </>
                              ) : (
                                <>
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Link
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}