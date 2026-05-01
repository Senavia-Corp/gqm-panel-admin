"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Link2,
  Users,
  Zap,
  ZapOff,
  CheckCircle2,
  UserCheck,
} from "lucide-react"
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
  jobYear?: number
  onMemberLinked?: () => Promise<void> | void
}

const ROLE_OPTIONS = [
  { value: "Acc Rep Selling", label: "Acc Rep Selling" },
  { value: "Mgmt Member",     label: "Mgmt Member" },
] as const

// ── Avatar helpers ─────────────────────────────────────────────────────────
const PALETTE = ["bg-emerald-500","bg-sky-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-teal-500"]
function avatarBg(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i)
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function initials(name?: string | null) {
  if (!name) return "?"
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

// ── Inline debounce hook ───────────────────────────────────────────────────
// Elimina esta función si ya tienes un hook useDebounce en tu proyecto
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Member table row (desktop) ─────────────────────────────────────────────
function MemberTableRow({
  member,
  isSelected,
  onSelect,
}: {
  member: MemberRow
  isSelected: boolean
  onSelect: () => void
}) {
  const name = member.Member_Name ?? "—"
  const bg   = avatarBg(String(member.Member_Name ?? member.ID_Member))

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-t transition-colors ${
        isSelected ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-slate-50"
      }`}
    >
      <td className="p-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${bg}`}>
            {initials(member.Member_Name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800" title={name}>{name}</p>
            <p className="text-[11px] text-slate-400">{member.ID_Member}</p>
          </div>
        </div>
      </td>
      <td className="p-3 text-sm text-slate-600">{member.Company_Role ?? "—"}</td>
      <td className="p-3 max-w-[200px]">
        <span className="block truncate text-sm text-slate-600" title={member.Email_Address ?? ""}>
          {member.Email_Address ?? "—"}
        </span>
      </td>
      <td className="p-3 text-sm text-slate-600">{member.Phone_Number ?? "—"}</td>
      <td className="p-3 text-right">
        {isSelected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Selected
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
            Select
          </span>
        )}
      </td>
    </tr>
  )
}

// ── Member list item (mobile) ──────────────────────────────────────────────
function MemberListItem({
  member,
  isSelected,
  onSelect,
}: {
  member: MemberRow
  isSelected: boolean
  onSelect: () => void
}) {
  const name = member.Member_Name ?? "—"
  const bg   = avatarBg(String(member.Member_Name ?? member.ID_Member))

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
        isSelected ? "bg-emerald-50" : "active:bg-slate-50"
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${bg}`}>
        {initials(member.Member_Name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <p className="text-[11px] text-slate-500 truncate">
          {member.Company_Role ?? "—"}
          {member.Email_Address ? ` · ${member.Email_Address}` : ""}
        </p>
      </div>
      <div className="flex-shrink-0">
        {isSelected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Selected
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
            Select
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main dialog ────────────────────────────────────────────────────────────
export function LinkMemberDialog({
  open,
  onClose,
  jobId,
  defaultSyncPodio = true,
  jobYear,
  onMemberLinked,
}: Props) {
  const { toast } = useToast()

  const [syncPodio, setSyncPodio]               = React.useState<boolean>(defaultSyncPodio)
  const [page, setPage]                         = React.useState(1)
  const limit                                   = 10
  const [loading, setLoading]                   = React.useState(false)
  const [linking, setLinking]                   = React.useState(false)
  const [data, setData]                         = React.useState<ApiPage<MemberRow>>({ page: 1, limit, total: 0, results: [] })
  const [search, setSearch]                     = React.useState("")
  const [selectedMemberId, setSelectedMemberId] = React.useState<string>("")

  // FIX: cache del miembro seleccionado para mantener el preview al cambiar página
  const [selectedMemberCache, setSelectedMemberCache] = React.useState<MemberRow | null>(null)

  // FIX: rol siempre tiene un valor por defecto válido — es parte de PK en la DB
  const [selectedRole, setSelectedRole] = React.useState<string>(ROLE_OPTIONS[0].value)

  const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / limit))

  // FIX: debounce del search para disparar fetch al servidor
  // La búsqueda era solo client-side sobre la página actual, por eso el miembro
  // logueado no aparecía si estaba en otra página
  const debouncedSearch = useDebounce(search, 350)

  // Resetear a página 1 cuando cambia el término de búsqueda
  React.useEffect(() => { setPage(1) }, [debouncedSearch])

  // FIX: fetch incluye ?q= → búsqueda server-side sobre todos los registros
  const fetchMembers = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim())

      const res  = await apiFetch(`/api/members/table?${params.toString()}`, { method: "GET" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || json?.detail || "Failed to fetch members")
      setData(json)
    } catch (err) {
      console.error("[LinkMemberDialog] fetchMembers error:", err)
      toast({ title: "Error", description: "Failed to load members list.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, toast])

  React.useEffect(() => { if (open) void fetchMembers() }, [open, fetchMembers])

  // Reset al abrir el dialog
  React.useEffect(() => {
    if (!open) return
    setSyncPodio(defaultSyncPodio)
    setPage(1)
    setSearch("")
    setSelectedMemberId("")
    setSelectedMemberCache(null)
    setSelectedRole(ROLE_OPTIONS[0].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Al seleccionar un miembro, cachear para mantener preview al cambiar de página
  const handleSelect = (member: MemberRow) => {
    if (selectedMemberId === member.ID_Member) {
      setSelectedMemberId("")
      setSelectedMemberCache(null)
    } else {
      setSelectedMemberId(member.ID_Member)
      setSelectedMemberCache(member)
    }
  }

  // Miembro a mostrar en el preview: busca en página actual, si no usa el cache
  const selectedMember =
    data.results.find((m) => m.ID_Member === selectedMemberId) ?? selectedMemberCache

  const handleLink = async () => {
    if (!selectedMemberId) {
      toast({ title: "No member selected", description: "Please select a member to link.", variant: "destructive" })
      return
    }
    // FIX: validar que rol no sea vacío (es parte de la PK en job_member)
    if (!selectedRole) {
      toast({ title: "Role required", description: "Please select a project role.", variant: "destructive" })
      return
    }
    if (syncPodio && !jobYear) {
      toast({ title: "Missing job year", description: "Year is required when Sync Podio is enabled.", variant: "destructive" })
      return
    }

    setLinking(true)
    try {
      const res = await apiFetch("/api/job-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          memberId: selectedMemberId,
          rol: selectedRole,   // siempre presente — requerido por el proxy y la DB
          sync_podio: syncPodio,
          year: jobYear,
        }),
      })

      const text = await res.text()
      let payload: any = null
      try { payload = JSON.parse(text) } catch { payload = { raw: text } }

      if (!res.ok) throw new Error(payload?.error || payload?.detail || "Failed to link member")

      toast({
        title: "Member linked",
        description: `${selectedMember?.Member_Name ?? selectedMemberId} added as ${selectedRole}.`,
      })
      await onMemberLinked?.()
      onClose()
    } catch (err) {
      console.error("[LinkMemberDialog] link error:", err)
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to link member.", variant: "destructive" })
    } finally {
      setLinking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!w-[95vw] !max-w-[1000px] flex flex-col gap-0 overflow-hidden p-0 max-h-[calc(100svh-2rem)]">

        {/* ── Header ─ fixed ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-semibold text-slate-900">Link Member to Job</DialogTitle>
              <p className="mt-0.5 text-xs text-slate-500 hidden sm:block">
                Select a team member and assign their project role.
              </p>
            </div>
          </div>

          {/* Podio sync toggle */}
          <button
            type="button"
            onClick={() => setSyncPodio((v) => !v)}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm transition-all ${
              syncPodio
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
            }`}
          >
            {syncPodio
              ? <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-emerald-400 text-emerald-500" />
              : <ZapOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            }
            <span className="text-xs font-semibold">
              <span className="hidden sm:inline">Podio </span>
              {syncPodio ? "ON" : "OFF"}
            </span>
            {syncPodio && jobYear && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {jobYear}
              </span>
            )}
          </button>
        </div>

        {/* ── Body ─ scrollable ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 p-4 sm:gap-4 sm:p-6">

          {/* ── Controls bar ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, email…"
                className="pl-9 text-sm"
              />
              {loading && (
                <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
              )}
            </div>

            {/* Role + pagination */}
            <div className="flex items-center gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="flex-1 sm:w-[180px] sm:flex-initial text-sm">
                  <UserCheck className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="Project role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[54px] text-center text-xs">
                  {data.page} / {totalPages}
                </span>
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ── Mobile list ─────────────────────────────────────────────── */}
          <div className="md:hidden rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
                  <span className="text-sm">Loading members…</span>
                </div>
              ) : data.results.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  {search ? `No results for "${debouncedSearch}"` : "No members found"}
                </p>
              ) : (
                data.results.map((m) => (
                  <MemberListItem
                    key={m.ID_Member}
                    member={m}
                    isSelected={selectedMemberId === m.ID_Member}
                    onSelect={() => handleSelect(m)}
                  />
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-400">
                {debouncedSearch
                  ? `${data.total} result${data.total !== 1 ? "s" : ""}`
                  : `${data.total} members`}
              </span>
              {selectedMemberId && !data.results.find((m) => m.ID_Member === selectedMemberId) && (
                <span className="text-xs text-emerald-600 font-medium">✓ Selected (other page)</span>
              )}
            </div>
          </div>

          {/* ── Desktop table ────────────────────────────────────────────── */}
          <div className="hidden md:block rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="max-h-[380px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="p-3">Member</th>
                    <th className="p-3">Company Role</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 w-[120px] text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
                          <span className="text-sm">Loading members…</span>
                        </div>
                      </td>
                    </tr>
                  ) : data.results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                        {search ? `No results for "${debouncedSearch}"` : "No members found"}
                      </td>
                    </tr>
                  ) : (
                    data.results.map((m) => (
                      <MemberTableRow
                        key={m.ID_Member}
                        member={m}
                        isSelected={selectedMemberId === m.ID_Member}
                        onSelect={() => handleSelect(m)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
              <span className="text-xs text-slate-400">
                {debouncedSearch
                  ? `${data.total} result${data.total !== 1 ? "s" : ""} for "${debouncedSearch}"`
                  : `${data.total} total members`}
              </span>
              {selectedMemberId && !data.results.find((m) => m.ID_Member === selectedMemberId) && (
                <span className="text-xs text-emerald-600 font-medium">
                  ✓ Member selected (on another page)
                </span>
              )}
            </div>
          </div>

          {/* ── Preview del miembro seleccionado ────────────────────────── */}
          {selectedMember && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${avatarBg(String(selectedMember.Member_Name ?? selectedMember.ID_Member))}`}>
                {initials(selectedMember.Member_Name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-emerald-800">
                  {selectedMember.Member_Name ?? selectedMember.ID_Member}
                </p>
                <p className="text-xs text-emerald-600">
                  Will be linked as <strong>{selectedRole}</strong>
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-emerald-500" />
            </div>
          )}

        </div>

        {/* ── Footer ─ fixed ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <Button variant="outline" onClick={onClose} disabled={linking}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedMemberId || !selectedRole || linking}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            {linking ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Linking…
              </>
            ) : (
              <>
                <Link2 className="mr-1.5 h-4 w-4" />
                Link Member
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}