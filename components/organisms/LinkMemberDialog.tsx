"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, ChevronRight, Search, Link2 } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

type MemberRow = {
  ID_Member: string
  Member_Name?: string | null
  Company_Role?: string | null
  Email_Address?: string | null
  Phone_Number?: string | null
}

type ApiPage<T> = {
  page: number
  limit: number
  total: number
  results: T[]
}

type Props = {
  open: boolean
  onClose: () => void
  jobId: string
  defaultSyncPodio?: boolean
  jobYear?: number // <- importante para sync_podio
  onMemberLinked?: () => Promise<void> | void
}

const ROLE_OPTIONS = [
  { value: "Acc Rep Selling", label: "Acc Rep Selling" },
  { value: "Mgmt Member", label: "Mgmt Member" },
] as const

export function LinkMemberDialog({
  open,
  onClose,
  jobId,
  defaultSyncPodio = true,
  jobYear,
  onMemberLinked,
}: Props) {
  const { toast } = useToast()

  const [syncPodio, setSyncPodio] = React.useState<boolean>(defaultSyncPodio)
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(10)

  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<ApiPage<MemberRow>>({
    page: 1,
    limit,
    total: 0,
    results: [],
  })

  const [search, setSearch] = React.useState("")
  const [selectedMemberId, setSelectedMemberId] = React.useState<string>("")
  const [selectedRole, setSelectedRole] = React.useState<string>(ROLE_OPTIONS[0].value)

  const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / limit))

  const fetchMembers = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/members/members_table?page=${page}&limit=${limit}`, { method: "GET" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to fetch members table")
      setData(json)
    } catch (err) {
      console.error("[LinkMemberDialog] fetchMembers error:", err)
      toast({ title: "Error", description: "Failed to load members list.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [page, limit, toast])

  React.useEffect(() => {
    if (!open) return
    void fetchMembers()
  }, [open, fetchMembers])

  React.useEffect(() => {
    if (!open) return
    // reset cada vez que abre
    setSyncPodio(defaultSyncPodio)
    setPage(1)
    setSearch("")
    setSelectedMemberId("")
    setSelectedRole(ROLE_OPTIONS[0].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data.results

    return data.results.filter((m) => {
      const name = (m.Member_Name ?? "").toLowerCase()
      const companyRole = (m.Company_Role ?? "").toLowerCase()
      const email = (m.Email_Address ?? "").toLowerCase()
      const phone = (m.Phone_Number ?? "").toLowerCase()
      const id = (m.ID_Member ?? "").toLowerCase()
      return (
        name.includes(q) ||
        companyRole.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        id.includes(q)
      )
    })
  }, [data.results, search])

  const handleLink = async () => {
    if (!selectedMemberId) {
      toast({ title: "Select a member", description: "Please select a member to link.", variant: "destructive" })
      return
    }

    if (syncPodio && !jobYear) {
      toast({
        title: "Missing job year",
        description: "Year is required when Sync Podio is enabled.",
        variant: "destructive",
      })
      return
    }

    try {
      const qs = new URLSearchParams()
      qs.set("sync_podio", String(syncPodio))
      if (jobYear) qs.set("year", String(jobYear))

      const res = await apiFetch("/api/job-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          memberId: selectedMemberId,
          rol: selectedRole,
          sync_podio: syncPodio,
          year: jobYear,
        }),
      })

      const text = await res.text()
      let payload: any = null
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { raw: text }
      }

      if (!res.ok) {
        throw new Error(payload?.error || payload?.detail || "Failed to link member")
      }

      toast({ title: "Linked", description: "Member linked successfully." })
      await onMemberLinked?.()
      onClose()
    } catch (err) {
      console.error("[LinkMemberDialog] link error:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to link member.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!w-[95vw] !max-w-[1100px]">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <DialogTitle>Link Member to Job</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a member from the optimized list (paginated).
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
            <div className="leading-tight">
              <Label className="text-sm">Sync Podio</Label>
              <p className="text-xs text-muted-foreground">{syncPodio ? "Enabled" : "Disabled"}</p>
            </div>
            <Switch checked={syncPodio} onCheckedChange={setSyncPodio} />
          </div>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (current page)..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Page {data.page} of {totalPages} · Total {data.total}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-3 w-[160px]">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Company Role</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3 w-[140px] text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No results
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const isSelected = selectedMemberId === m.ID_Member
                    return (
                      <tr key={m.ID_Member} className="border-t">
                        <td className="p-3">{m.ID_Member}</td>
                        <td className="p-3">{m.Member_Name ?? "—"}</td>
                        <td className="p-3">{m.Company_Role ?? "—"}</td>
                        <td className="p-3">{m.Email_Address ?? "—"}</td>
                        <td className="p-3">{m.Phone_Number ?? "—"}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            className={isSelected ? "bg-gqm-green hover:bg-gqm-green/90" : ""}
                            onClick={() => setSelectedMemberId(m.ID_Member)}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedMemberId}
            className="bg-gqm-green hover:bg-gqm-green/90"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Link Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}