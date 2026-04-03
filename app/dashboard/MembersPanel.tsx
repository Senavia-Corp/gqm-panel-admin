"use client"

import React, { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Info,
  Medal,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Search,
  CircleUserRound,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  Timer,
  XCircle,
  Lock,
} from "lucide-react"

type JobTab = "ALL" | "QID" | "PTL" | "PAR"
type YearTab = "ALL" | "2026" | "2025" | "2024" | "2023"

type Props = {
  jobTab: JobTab
  yearTab: YearTab
}

/**
 * Backend shape (matches your Python response)
 */
type ApiMember = {
  rank: number
  member: { id: string; name: string; company_role?: string | null }
  totals: { all: number; qid: number; ptl: number; par: number }
  buckets: {
    pending: number
    in_progress: number
    completed: number
    cancelled: number
    closed: number
    completed_pct: number
  }
  status_breakdown?: Record<string, number>
}

type ApiResponse = {
  type: JobTab
  year: number | null
  role_filter: string
  pagination: {
    page: number
    limit: number
    total_members: number
    total_pages: number
  }
  members: ApiMember[]
}

const PENDING_HELP =
  "Pending includes: Assigned/P. Quote, Waiting for Approval, HOLD, Received-Stand By."
const INPROGRESS_HELP =
  "In Progress includes: Scheduled / Work in Progress, Assigned-In progress, In Progress."
const COMPLETED_HELP =
  "Completed includes: Completed P. INV / POs, Invoiced, PAID, Warranty, Completed PVI, Paid."
const CANCELLED_HELP = "Cancelled includes: Cancelled."
const CLOSED_HELP = 'Closed Jobs are jobs with status "PAID" (QID/PAR) or "Paid" (PTL).'

function medalIcon(rank: number) {
  if (rank === 1) return <Medal className="h-6 w-6 text-yellow-500" />
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />
  return null
}

function hashToIndex(str: string, mod: number) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % mod
}

function getAvatarTheme(memberId: string) {
  const themes = [
    { bg: "bg-blue-100", icon: "text-blue-700" },
    { bg: "bg-emerald-100", icon: "text-emerald-700" },
    { bg: "bg-violet-100", icon: "text-violet-700" },
    { bg: "bg-amber-100", icon: "text-amber-700" },
    { bg: "bg-rose-100", icon: "text-rose-700" },
    { bg: "bg-cyan-100", icon: "text-cyan-700" },
    { bg: "bg-indigo-100", icon: "text-indigo-700" },
    { bg: "bg-lime-100", icon: "text-lime-700" },
    { bg: "bg-fuchsia-100", icon: "text-fuchsia-700" },
    { bg: "bg-teal-100", icon: "text-teal-700" },
  ] as const

  return themes[hashToIndex(memberId, themes.length)]
}

// Mapea el bg tailwind a un color HEX para usar en gradients inline (solo lo que usas en themes)
function avatarBgToHex(bgClass: string) {
  const map: Record<string, string> = {
    "bg-blue-100": "#DBEAFE",
    "bg-emerald-100": "#D1FAE5",
    "bg-violet-100": "#EDE9FE",
    "bg-amber-100": "#FEF3C7",
    "bg-rose-100": "#FFE4E6",
    "bg-cyan-100": "#CFFAFE",
    "bg-indigo-100": "#E0E7FF",
    "bg-lime-100": "#ECFCCB",
    "bg-fuchsia-100": "#FAE8FF",
    "bg-teal-100": "#CCFBF1",
  }
  return map[bgClass] ?? "#E5E7EB"
}

function StatChip({
  label,
  value,
  Icon,
  accentClass,
}: {
  label: string
  value: number
  Icon: React.ElementType
  accentClass: string
}) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={["inline-flex h-8 w-8 items-center justify-center rounded-lg", accentClass].join(" ")}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

export default function MembersPanel({ jobTab, yearTab }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 50

  const [members, setMembers] = useState<ApiMember[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setPage(1)
    setSelectedMemberId(null)
  }, [jobTab, yearTab])

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)

        const qs = new URLSearchParams({
          type: jobTab,
          page: String(page),
          limit: String(limit),
          include_status_breakdown: "1",
        })

        if (yearTab !== "ALL") qs.set("year", yearTab)

        const res = await apiFetch(`/api/metrics/members/acc-rep-selling?${qs.toString()}`)
        if (!res.ok) throw new Error(`Failed members metrics: ${res.status}`)

        const data: ApiResponse = await res.json()

        setMembers(data.members ?? [])
        setTotal(data.pagination?.total_members ?? (data.members?.length ?? 0))
        setTotalPages(data.pagination?.total_pages ?? 1)
      } catch (e) {
        console.error("[members] metrics error:", e)
        setMembers([])
        setTotal(0)
        setTotalPages(1)
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [jobTab, yearTab, page])

  const selectedMember = useMemo(
    () => members.find((m) => m.member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  )

  const top10 = useMemo(() => members.slice(0, 10), [members])

  const filteredForPicker = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => (m.member.name ?? "").toLowerCase().includes(q))
  }, [members, search])

  const pageLabel = useMemo(() => {
    const safeTotalPages = Math.max(1, totalPages)
    return `Page ${page} / ${safeTotalPages}`
  }, [page, totalPages])

  return (
    <>
      {/* ===== 1) Carousel cards (summary) ===== */}
      <div className="mb-6 bg-gqm-green-dark rounded-lg p-6 border-4 border-black relative">
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("members-cards-scroller")
            if (!el) return
            el.scrollBy({ left: -340, behavior: "smooth" })
          }}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
        >
          <ChevronLeft className="h-6 w-6 text-black" />
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("members-cards-scroller")
            if (!el) return
            el.scrollBy({ left: 340, behavior: "smooth" })
          }}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
        >
          <ChevronRight className="h-6 w-6 text-black" />
        </button>

        <div
          id="members-cards-scroller"
          className="
            flex gap-4 overflow-x-auto pb-2 pr-2
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:h-0
            [&::-webkit-scrollbar]:w-0
          "
          style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
        >
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex-none w-[320px] rounded-xl bg-white overflow-hidden">
                  <div className="p-6">
                    <div className="h-4 w-44 bg-gray-200 rounded animate-pulse mb-3" />
                    <div className="h-3 w-36 bg-gray-100 rounded animate-pulse mb-5" />
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                      {Array.from({ length: 5 }).map((__, i) => (
                        <div key={i} className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                  <div className="px-6 py-3" style={{ backgroundColor: "#37D260" }}>
                    <div className="h-4 w-44 bg-black/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            members.map((m) => {
              const rank = m.rank ?? 0
              const pct = Number(m.buckets?.completed_pct ?? 0)
              const avatar = getAvatarTheme(m.member.id)

              return (
                <div
                  key={m.member.id}
                  className="
                    flex-none w-[320px] rounded-xl bg-white overflow-hidden border-0
                    shadow-sm hover:shadow-md transition
                    flex flex-col
                  "
                >
                  {/* Body */}
                  <div className="p-6 relative flex-1">
                    {/* Info tooltip */}
                    <div className="absolute left-3 top-3">
                      <div
                        title={[PENDING_HELP, INPROGRESS_HELP, COMPLETED_HELP, CANCELLED_HELP].join("\n")}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
                      >
                        <Info className="h-4 w-4 text-gray-700" />
                      </div>
                    </div>

                    {/* Medal top 3 */}
                    {rank >= 1 && rank <= 3 && <div className="absolute right-3 top-3">{medalIcon(rank)}</div>}

                    {/* Header: name/role + avatar */}
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-start pt-8">
                      <div className="min-w-0 pr-1">
                        <p className="text-lg font-semibold leading-tight truncate">{m.member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.member.company_role ?? "—"}</p>
                      </div>

                      <div
                        className={["h-12 w-12 rounded-full flex items-center justify-center", avatar.bg].join(" ")}
                        title={m.member.name}
                      >
                        <CircleUserRound className={["h-6 w-6", avatar.icon].join(" ")} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Total Jobs</div>
                      <div className="text-right font-semibold tabular-nums">{m.totals?.all ?? 0}</div>

                      <div className="text-muted-foreground">Pending Jobs</div>
                      <div className="text-right font-semibold tabular-nums">{m.buckets?.pending ?? 0}</div>

                      <div className="text-muted-foreground">In Progress Jobs</div>
                      <div className="text-right font-semibold tabular-nums">{m.buckets?.in_progress ?? 0}</div>

                      <div className="text-muted-foreground">Jobs Completed</div>
                      <div className="text-right font-semibold tabular-nums">{m.buckets?.completed ?? 0}</div>

                      <div className="text-muted-foreground">Jobs Cancelled</div>
                      <div className="text-right font-semibold tabular-nums">{m.buckets?.cancelled ?? 0}</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 mt-auto" style={{ backgroundColor: "#37D260" }}>
                    <div className="text-sm font-semibold text-black">{pct.toFixed(2)}% of Jobs Completed</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="bg-white"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="text-white text-sm">{pageLabel}</span>
          <Button
            variant="outline"
            className="bg-white"
            disabled={page >= Math.max(1, totalPages) || isLoading}
            onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* ===== 2) Bottom grid: Top10 + Individual member stats ===== */}
      <div className="grid gap-6 mb-6 md:grid-cols-2">
        {/* Top 10 closed jobs */}
        <div className="bg-gqm-green-dark rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-lg font-semibold">Top 10 members with most closed Jobs</h2>
              <p className="text-white/80 text-sm mt-1">Ranking by closed jobs</p>
            </div>

            <div title={CLOSED_HELP} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Info className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {top10.length === 0 && !isLoading ? (
              <p className="text-white/80 text-sm">No data.</p>
            ) : (
              top10.map((m) => {
                const rank = m.rank ?? 0
                const closed = m.buckets?.closed ?? 0
                const max = top10[0]?.buckets?.closed ?? 1
                const pct = max > 0 ? Math.round((closed / max) * 100) : 0

                const avatar = getAvatarTheme(m.member.id)
                const barColor = avatarBgToHex(avatar.bg)

                return (
                  <div key={m.member.id} className="grid items-center gap-3 [grid-template-columns:44px_260px_1fr]">
                    {/* rank badge */}
                    <div className="flex justify-center">
                      {rank <= 3 ? (
                        medalIcon(rank)
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white/10 text-white text-xs flex items-center justify-center">
                          {rank}
                        </div>
                      )}
                    </div>

                    {/* user + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={["h-10 w-10 rounded-full flex items-center justify-center shrink-0", avatar.bg].join(" ")}>
                        <CircleUserRound className={["h-5 w-5", avatar.icon].join(" ")} />
                      </div>

                      <div className="min-w-0 leading-tight">
                        <div className="text-white font-semibold text-sm truncate">{m.member.name}</div>
                        <div className="text-white/75 text-xs truncate">{m.member.company_role ?? "—"}</div>
                      </div>
                    </div>

                    {/* bar */}
                    <div className="w-full">
                      <div className="h-10 rounded-lg bg-white/95 overflow-hidden relative">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundImage: `linear-gradient(90deg,
                              rgba(255,255,255,0) 0%,
                              rgba(255,255,255,0) 20%,
                              ${barColor} 100%
                            )`,
                            opacity: 1,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <span className="text-sm font-semibold tabular-nums text-black">{closed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Individual member stats (INLINE details again) */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Individual Member Statistics</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedMember ? "Detailed breakdown for this member" : "Select a member to see detailed data"}
              </p>
            </div>

            {selectedMember && (
              <Button variant="outline" onClick={() => setSelectedMemberId(null)}>
                Back
              </Button>
            )}
          </div>

          {!selectedMember ? (
            <>
              <div className="mt-4 relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members..."
                  className="pl-9"
                />
              </div>

              {/* Picker cards */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredForPicker.map((m) => {
                  const avatar = getAvatarTheme(m.member.id)
                  return (
                    <button
                      key={m.member.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.member.id)}
                      className="
                        rounded-2xl border border-gray-200 bg-white p-4 text-left
                        hover:bg-gray-50 hover:shadow-sm transition
                        flex flex-col
                      "
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight">{m.member.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground leading-snug whitespace-normal break-words">
                            {m.member.company_role ?? "—"}
                          </div>
                        </div>

                        <div className={["h-10 w-10 rounded-full flex items-center justify-center shrink-0", avatar.bg].join(" ")}>
                          <CircleUserRound className={["h-5 w-5", avatar.icon].join(" ")} />
                        </div>
                      </div>

                      <div className="mt-3 text-sm">
                        <span className="text-muted-foreground">Total jobs: </span>
                        <span className="font-semibold tabular-nums">{m.totals?.all ?? 0}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="mt-5 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">{selectedMember.member.name}</div>

                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="whitespace-normal break-words">{selectedMember.member.company_role ?? "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm font-semibold">Rank #{selectedMember.rank}</span>
                  </div>
                </div>

                {/* Stats chips (color + icons kept) */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatChip
                    label="Total"
                    value={selectedMember.totals?.all ?? 0}
                    Icon={ClipboardList}
                    accentClass="bg-slate-100 text-slate-700"
                  />
                  <StatChip
                    label="Closed"
                    value={selectedMember.buckets?.closed ?? 0}
                    Icon={Lock}
                    accentClass="bg-emerald-100 text-emerald-700"
                  />
                  <StatChip
                    label="Pending"
                    value={selectedMember.buckets?.pending ?? 0}
                    Icon={Timer}
                    accentClass="bg-amber-100 text-amber-700"
                  />
                  <StatChip
                    label="In Progress"
                    value={selectedMember.buckets?.in_progress ?? 0}
                    Icon={CheckCircle2}
                    accentClass="bg-blue-100 text-blue-700"
                  />
                  <StatChip
                    label="Completed"
                    value={selectedMember.buckets?.completed ?? 0}
                    Icon={CheckCircle2}
                    accentClass="bg-violet-100 text-violet-700"
                  />
                  <StatChip
                    label="Cancelled"
                    value={selectedMember.buckets?.cancelled ?? 0}
                    Icon={XCircle}
                    accentClass="bg-rose-100 text-rose-700"
                  />
                </div>
              </div>

              {/* Jobs per status (vertical like before) */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      Jobs per Status
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Detailed breakdown of statuses for this member.</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {selectedMember.status_breakdown && Object.keys(selectedMember.status_breakdown).length > 0 ? (
                    Object.entries(selectedMember.status_breakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <div
                          key={status}
                          className="flex items-center justify-between rounded-lg border bg-white p-3 hover:bg-gray-50 transition"
                        >
                          <span className="text-sm">{status}</span>
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold tabular-nums text-gray-900">
                            {count}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                      No status breakdown available. (Make sure your backend returns `status_breakdown` when
                      `include_status_breakdown=1`.)
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}