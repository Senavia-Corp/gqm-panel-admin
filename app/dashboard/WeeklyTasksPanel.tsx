"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useTranslations } from "@/components/providers/LocaleProvider"
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  File,
  ConstructionIcon,
  WalletIcon,
  User,
  MapPin,
  ExternalLink,
  Search,
  X,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

type JobType = "ALL" | "QID" | "PTL" | "PAR"
type TaskStatusFilter = "ALL" | "Not started" | "Work-in-progress" | "Completed"

type WeeklyTask = {
  ID_Tasks: string
  Name: string | null
  Task_description: string | null
  Task_status: string | null
  Priority: string | null
  Designation_date: string | null
  Delivery_date: string | null
  ID_Subcontractor: string | null
  job: {
    ID_Jobs: string
    Job_type: string
    Project_name: string | null
    Project_location: string | null
    Job_status: string | null
    [key: string]: any
  } | null
  member: {
    ID_Member: string
    Member_Name?: string | null
    Company_Role?: string | null
    Name?: string | null
    [key: string]: any
  } | null
  subcontractor: {
    ID_Subcontractor: string
    Name: string | null
    Organization: string | null
  } | null
}

type FilterOption = { id: string; name: string }

// ─── Picker row types ──────────────────────────────────────────────────────────

type MemberRow = {
  ID_Member: string
  Member_Name: string | null
  Company_Role: string | null
}

type SubRow = {
  ID_Subcontractor: string
  Name: string | null
  Organization: string | null
}

type JobRow = {
  ID_Jobs: string
  Project_name: string | null
  Job_type: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(): Date[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_KEYS = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"]
const MONTH_KEYS = [
  "monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun",
  "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec",
]

function fmtShortDate(d: Date, t: any) {
  return `${t(MONTH_KEYS[d.getMonth()])} ${d.getDate()}`
}

function fmtFullDate(iso: string | null, t: any) {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  return `${t(MONTH_KEYS[d.getMonth()])} ${d.getDate()}, ${d.getFullYear()}`
}

function isToday(d: Date) {
  const t = new Date()
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  )
}

function getMemberName(member: WeeklyTask["member"]): string | null {
  if (!member) return null
  return member.Member_Name ?? member.Name ?? null
}

// Cleans PostgreSQL array literals: {"Org Name"} → Org Name
function cleanPgArray(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed.slice(1, -1).replace(/"/g, "").split(",")[0].trim() || null
  }
  return value
}

// Returns [startCol, spanCols] for a task bar (1-indexed, 7 cols)
function getBarPosition(task: WeeklyTask, weekDays: Date[]): [number, number] {
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  const parseDate = (iso: string | null) =>
    iso ? new Date(iso + "T00:00:00") : null

  let start = parseDate(task.Designation_date)
  let end = parseDate(task.Delivery_date)

  if (!start && !end) return [1, 7]

  const clampedStart =
    start && start < weekStart ? weekStart : start ?? weekStart
  const clampedEnd = end && end > weekEnd ? weekEnd : end ?? weekEnd

  const startIdx = weekDays.findIndex(
    (d) =>
      d.getDate() === clampedStart.getDate() &&
      d.getMonth() === clampedStart.getMonth()
  )
  const endIdx = weekDays.findIndex(
    (d) =>
      d.getDate() === clampedEnd.getDate() &&
      d.getMonth() === clampedEnd.getMonth()
  )

  const col = startIdx >= 0 ? startIdx + 1 : 1
  const span = endIdx >= 0 ? endIdx - (col - 1) + 1 : 7 - col + 1

  return [col, Math.max(1, span)]
}

// ─── Priority & Status config ─────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  string,
  { dot: string; badge: string; key: string }
> = {
  Critical: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border border-red-200",
    key: "priorityCritical",
  },
  High: {
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700 border border-orange-200",
    key: "priorityHigh",
  },
  Medium: {
    dot: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    key: "priorityMedium",
  },
  Low: {
    dot: "bg-blue-400",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    key: "priorityLow",
  },
  default: {
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    key: "priorityNone",
  },
}

function getPriority(p: string | null, t: any) {
  const cfg = (p && PRIORITY_CONFIG[p]) ? PRIORITY_CONFIG[p] : PRIORITY_CONFIG.default
  return { ...cfg, label: t(cfg.key) }
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; bar: string; badge: string; key?: string }
> = {
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
    bar: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    key: "statusCompleted",
  },
  "in progress": {
    icon: <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />,
    bar: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    key: "statusInProgress",
  },
  "work-in-progress": {
    icon: <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />,
    bar: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    key: "statusInProgress",
  },
  pending: {
    icon: <Clock className="h-3.5 w-3.5 text-amber-600" />,
    bar: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    key: "legendPending",
  },
  "not started": {
    icon: <Circle className="h-3.5 w-3.5 text-gray-500" />,
    bar: "bg-gray-300",
    badge: "bg-gray-50 text-gray-600 border border-gray-200",
    key: "statusNotStarted",
  },
  overdue: {
    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,
    bar: "bg-red-400",
    badge: "bg-red-50 text-red-700 border border-red-200",
    key: "legendOverdue",
  },
  default: {
    icon: <Circle className="h-3.5 w-3.5 text-gray-400" />,
    bar: "bg-gray-300",
    badge: "bg-gray-50 text-gray-600 border border-gray-200",
    key: "legendOther",
  },
}

function getStatus(s: string | null, t: any) {
  if (!s) return { ...STATUS_CONFIG.default, label: t(STATUS_CONFIG.default.key!) }
  const key = s.toLowerCase().trim()
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.default
  return { ...cfg, label: cfg.key ? t(cfg.key) : s }
}

const JOB_TYPE_COLORS: Record<string, string> = {
  QID: "bg-violet-100 text-violet-700 border border-violet-200",
  PTL: "bg-cyan-100 text-cyan-700 border border-cyan-200",
  PAR: "bg-rose-100 text-rose-700 border border-rose-200",
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GanttSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-7 gap-1 mb-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-white/20" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-3 rounded-xl bg-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-4 w-36 bg-white/20 rounded" />
            <div className="h-5 w-16 bg-white/15 rounded-full" />
            <div className="h-5 w-16 bg-white/15 rounded-full" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            <div
              className="h-7 rounded-full bg-white/20"
              style={{ gridColumn: `${(i % 3) + 1} / span ${3 + (i % 2)}` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Task row (Gantt entry) ────────────────────────────────────────────────────

function TaskRow({
  task,
  weekDays,
  onClick,
}: {
  task: WeeklyTask
  weekDays: Date[]
  onClick: () => void
}) {
  const t = useTranslations("dashboard")
  const [col, span] = getBarPosition(task, weekDays)
  const priority = getPriority(task.Priority, t)
  const status = getStatus(task.Task_status, t)
  const jobType = task.job?.Job_type ?? null
  const memberName = getMemberName(task.member)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 sm:p-4 border transition-all duration-200 mb-2 bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-[1.005]"
    >
      {/* Top row: name + badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-semibold text-sm truncate max-w-[150px] sm:max-w-[220px] text-white">
          {task.Name || task.ID_Tasks}
        </span>

        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            status.badge,
          ].join(" ")}
        >
          {status.icon}
          {status.label}
        </span>

        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            priority.badge,
          ].join(" ")}
        >
          <span className={["h-1.5 w-1.5 rounded-full", priority.dot].join(" ")} />
          {priority.label}
        </span>

        {jobType && (
          <span
            className={[
              "rounded-full px-2 py-0.5 text-xs font-bold",
              JOB_TYPE_COLORS[jobType] ??
                "bg-gray-100 text-gray-600 border border-gray-200",
            ].join(" ")}
          >
            {jobType}
          </span>
        )}
      </div>

      {/* Gantt bar grid */}
      <div className="grid grid-cols-7 gap-1 items-center">
        {Array.from({ length: 7 }, (_, idx) => {
          const dayCol = idx + 1
          const inBar = dayCol >= col && dayCol < col + span
          const isStart = dayCol === col
          const isEnd = dayCol === col + span - 1

          return (
            <div key={idx} className="h-6 flex items-center">
              {inBar ? (
                <div
                  className={[
                    "h-full w-full transition-all",
                    status.bar,
                    isStart && isEnd
                      ? "rounded-full"
                      : isStart
                      ? "rounded-l-full"
                      : isEnd
                      ? "rounded-r-full"
                      : "",
                    "opacity-90",
                  ].join(" ")}
                />
              ) : (
                <div className="h-px w-full bg-white/10" />
              )}
            </div>
          )
        })}
      </div>

      {/* Info row: dates + job + member */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-white/60">
        <span>{t("taskStart")} {fmtFullDate(task.Designation_date, t)}</span>
        <span>{t("taskDue")} {fmtFullDate(task.Delivery_date, t)}</span>
        {task.job && (
          <span className="truncate">
            <span className="text-white/40 mr-1">{t("colJob")}</span>
            <span className="font-medium text-white/75">
              #{task.job.ID_Jobs}
            </span>
            {task.job.Project_name && (
              <span className="text-white/60"> · {task.job.Project_name}</span>
            )}
          </span>
        )}
        {memberName && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 text-white/40" />
            <span className="text-white/75">{memberName}</span>
            {task.member?.Company_Role && (
              <span className="text-white/40">· {task.member.Company_Role}</span>
            )}
          </span>
        )}
        {!memberName && task.subcontractor && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-white/40" />
            <span className="text-white/75">{task.subcontractor.Name ?? task.subcontractor.ID_Subcontractor}</span>
            {task.subcontractor.Organization && (
              <span className="text-white/40">· {cleanPgArray(task.subcontractor.Organization)}</span>
            )}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Task Detail Dialog ────────────────────────────────────────────────────────

function TaskDetailDialog({
  task,
  onClose,
}: {
  task: WeeklyTask | null
  onClose: () => void
}) {
  const t = useTranslations("dashboard")
  if (!task) return null

  const priority = getPriority(task.Priority, t)
  const status = getStatus(task.Task_status, t)
  const jobType = task.job?.Job_type ?? null
  const memberName = getMemberName(task.member)

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900 pr-6">
            {task.Name || task.ID_Tasks}
          </DialogTitle>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{task.ID_Tasks}</p>
        </DialogHeader>

        {/* Status + Priority + Job type */}
        <div className="flex flex-wrap gap-2">
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              status.badge,
            ].join(" ")}
          >
            {status.icon} {status.label}
          </span>
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              priority.badge,
            ].join(" ")}
          >
            <span className={["h-2 w-2 rounded-full", priority.dot].join(" ")} />
            {priority.label} {t("dialogPrioritySuffix")}
          </span>
          {jobType && (
            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-bold",
                JOB_TYPE_COLORS[jobType] ??
                  "bg-gray-100 text-gray-600 border border-gray-200",
              ].join(" ")}
            >
              {jobType}
            </span>
          )}
        </div>

        {/* Description */}
        {task.Task_description && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {t("dialogDescription")}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {task.Task_description}
            </p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs text-gray-400 mb-1">{t("dialogAssigned")}</p>
            <p className="font-semibold text-gray-900 text-sm">
              {fmtFullDate(task.Designation_date, t)}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs text-gray-400 mb-1">{t("dialogDue")}</p>
            <p className="font-semibold text-gray-900 text-sm">
              {fmtFullDate(task.Delivery_date, t)}
            </p>
          </div>
        </div>

        {/* Job section */}
        {task.job && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                {t("dialogJob")}
              </p>
              <Link
                href={`/jobs/${task.job.ID_Jobs}`}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {t("dialogViewJob")} <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400 font-mono">
                  #{task.job.ID_Jobs}
                </span>
                {jobType && (
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-xs font-bold",
                      JOB_TYPE_COLORS[jobType] ??
                        "bg-gray-100 text-gray-600 border border-gray-200",
                    ].join(" ")}
                  >
                    {jobType}
                  </span>
                )}
              </div>
              {task.job.Project_name && (
                <p className="font-semibold text-gray-900 text-sm">
                  {task.job.Project_name}
                </p>
              )}
              {task.job.Project_location && (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  {task.job.Project_location}
                </p>
              )}
              {task.job.Job_status && (
                <p className="text-xs text-gray-500">
                  <span className="text-gray-400">{t("dialogStatus")} </span>
                  {task.job.Job_status}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Member section */}
        {task.member && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t("dialogAssignedMember")}
            </p>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gqm-green/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-gqm-green" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {memberName ?? task.member.ID_Member}
                </p>
                {task.member.Company_Role && (
                  <p className="text-xs text-gray-500">{task.member.Company_Role}</p>
                )}
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {task.member.ID_Member}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subcontractor section */}
        {task.subcontractor && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t("dialogAssignedSub")}
            </p>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {task.subcontractor.Name ?? task.subcontractor.ID_Subcontractor}
                </p>
                {task.subcontractor.Organization && (
                  <p className="text-xs text-gray-500">
                    {cleanPgArray(task.subcontractor.Organization)}
                  </p>
                )}
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {task.subcontractor.ID_Subcontractor}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Member Picker Dialog ──────────────────────────────────────────────────────

function MemberPickerDialog({
  onSelect,
  onClose,
}: {
  onSelect: (o: FilterOption) => void
  onClose: () => void
}) {
  const t = useTranslations("dashboard")
  const [items, setItems] = useState<MemberRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
        if (q) qs.set("q", q)
        const res = await apiFetch(`/api/members/table?${qs}`, {
          cache: "no-store",
        })
        const data = await res.json()
        if (!cancelled) {
          setItems(data.results ?? [])
          setTotal(data.total ?? 0)
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [q, page])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("filterByMember")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gqm-green/30"
            placeholder={t("searchMembersEllipsis")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 -mx-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              {t("loadingEllipsis")}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {t("noMembersFound")}
            </div>
          ) : (
            items.map((m) => (
              <button
                key={m.ID_Member}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                onClick={() =>
                  onSelect({
                    id: m.ID_Member,
                    name: m.Member_Name ?? m.ID_Member,
                  })
                }
              >
                <p className="font-medium text-sm text-gray-900">
                  {m.Member_Name ?? m.ID_Member}
                </p>
                {m.Company_Role && (
                  <p className="text-xs text-gray-400">{m.Company_Role}</p>
                )}
              </button>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Subcontractor Picker Dialog ──────────────────────────────────────────────

function SubcontractorPickerDialog({
  onSelect,
  onClose,
}: {
  onSelect: (o: FilterOption) => void
  onClose: () => void
}) {
  const t = useTranslations("dashboard")
  const [items, setItems] = useState<SubRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 10

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
        if (q) qs.set("q", q)
        const res = await apiFetch(`/api/subcontractors_table?${qs}`, {
          cache: "no-store",
        })
        const data = await res.json()
        if (!cancelled) {
          setItems(data.results ?? [])
          setTotal(data.total ?? 0)
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [q, page])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("filterBySubcontractor")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gqm-green/30"
            placeholder={t("searchSubsEllipsis")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 -mx-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              {t("loadingEllipsis")}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {t("noSubsFound")}
            </div>
          ) : (
            items.map((s) => (
              <button
                key={s.ID_Subcontractor}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                onClick={() =>
                  onSelect({
                    id: s.ID_Subcontractor,
                    name: s.Name ?? s.ID_Subcontractor,
                  })
                }
              >
                <p className="font-medium text-sm text-gray-900">
                  {s.Name ?? s.ID_Subcontractor}
                </p>
                {s.Organization && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {cleanPgArray(s.Organization)}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Job Picker Dialog ─────────────────────────────────────────────────────────

function JobPickerDialog({
  onSelect,
  onClose,
}: {
  onSelect: (o: FilterOption) => void
  onClose: () => void
}) {
  const t = useTranslations("dashboard")
  const [items, setItems] = useState<JobRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 10

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
        if (q) qs.set("search", q)
        const res = await apiFetch(`/api/jobs?${qs}`, { cache: "no-store" })
        const data = await res.json()
        if (!cancelled) {
          setItems(data.results ?? [])
          setTotal(data.total ?? 0)
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [q, page])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("filterByJob")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gqm-green/30"
            placeholder={t("searchJobsEllipsis")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 -mx-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              {t("loadingEllipsis")}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {t("noJobsFound")}
            </div>
          ) : (
            items.map((j) => (
              <button
                key={j.ID_Jobs}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                onClick={() =>
                  onSelect({
                    id: j.ID_Jobs,
                    name: j.Project_name ?? j.ID_Jobs,
                  })
                }
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono text-gray-400">
                    #{j.ID_Jobs}
                  </span>
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-xs font-bold",
                      JOB_TYPE_COLORS[j.Job_type] ??
                        "bg-gray-100 text-gray-600 border border-gray-200",
                    ].join(" ")}
                  >
                    {j.Job_type}
                  </span>
                </div>
                {j.Project_name && (
                  <p className="font-medium text-sm text-gray-900">
                    {j.Project_name}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({
  label,
  activeLabel,
  onClick,
  onClear,
}: {
  label: string
  activeLabel?: string | null
  onClick: () => void
  onClear: () => void
}) {
  const active = !!activeLabel
  return (
    <div className="inline-flex items-stretch rounded-full overflow-hidden">
      <button
        type="button"
        onClick={onClick}
        className={[
          "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border-y border-l transition-colors",
          active
            ? "rounded-l-full bg-white text-gqm-green-dark border-white"
            : "rounded-full border-r bg-white/10 text-white border-white/20 hover:bg-white/20",
        ].join(" ")}
      >
        {label}
        {active && (
          <span className="font-semibold text-gqm-green-dark truncate max-w-[100px]">
            : {activeLabel}
          </span>
        )}
      </button>
      {active && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="inline-flex items-center justify-center px-1.5 bg-white border-y border-r border-white rounded-r-full text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeeklyTasksPanel() {
  const t = useTranslations("dashboard")
  const [jobType, setJobType] = useState<JobType>("ALL")
  const [tasks, setTasks] = useState<WeeklyTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [scrollPage, setScrollPage] = useState(0)
  const PAGE_SIZE = 8

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("ALL")
  const [memberFilter, setMemberFilter] = useState<FilterOption | null>(null)
  const [subFilter, setSubFilter] = useState<FilterOption | null>(null)
  const [jobFilter, setJobFilter] = useState<FilterOption | null>(null)

  // Picker open state
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const [subPickerOpen, setSubPickerOpen] = useState(false)
  const [jobPickerOpen, setJobPickerOpen] = useState(false)

  // Detail dialog
  const [detailTask, setDetailTask] = useState<WeeklyTask | null>(null)

  const weekDays = useMemo(() => getWeekDays(), [])

  // Fetch
  useEffect(() => {
    setDetailTask(null)
    const run = async () => {
      try {
        setIsLoading(true)
        const qs = new URLSearchParams()
        if (jobType !== "ALL") qs.set("job_type", jobType)
        const res = await apiFetch(`/api/tasks/weekly?${qs.toString()}`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`Failed weekly tasks: ${res.status}`)
        const data: WeeklyTask[] = await res.json()
        setTasks(Array.isArray(data) ? data : [])
        setScrollPage(0)
      } catch (e) {
        console.error("[weekly tasks] error:", e)
        setTasks([])
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [jobType])

  // Reset page when filters change
  useEffect(() => {
    setScrollPage(0)
  }, [statusFilter, memberFilter, subFilter, jobFilter])

  // Priority sort + client-side filters
  const filteredTasks = useMemo(() => {
    const order: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    }
    let result = [...tasks].sort((a, b) => {
      const pa = order[a.Priority ?? ""] ?? 4
      const pb = order[b.Priority ?? ""] ?? 4
      return pa - pb
    })

    if (statusFilter !== "ALL") {
      result = result.filter(
        (t) =>
          t.Task_status?.toLowerCase() === statusFilter.toLowerCase()
      )
    }

    if (memberFilter) {
      result = result.filter(
        (t) => t.member?.ID_Member === memberFilter.id
      )
    }

    if (subFilter) {
      result = result.filter(
        (t) => t.ID_Subcontractor === subFilter.id
      )
    }

    if (jobFilter) {
      result = result.filter((t) => t.job?.ID_Jobs === jobFilter.id)
    }

    return result
  }, [tasks, statusFilter, memberFilter, subFilter, jobFilter])

  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE)
  const pagedTasks = filteredTasks.slice(
    scrollPage * PAGE_SIZE,
    (scrollPage + 1) * PAGE_SIZE
  )

  // Summary counts (over raw tasks, not filtered)
  const summary = useMemo(() => {
    const completed = tasks.filter(
      (t) => t.Task_status?.toLowerCase() === "completed"
    ).length
    const inProg = tasks.filter((t) =>
      t.Task_status?.toLowerCase().includes("progress")
    ).length
    const high = tasks.filter((t) =>
      ["Critical", "High"].includes(t.Priority ?? "")
    ).length
    return { total: tasks.length, completed, inProg, high }
  }, [tasks])

  const hasActiveFilters =
    statusFilter !== "ALL" || !!memberFilter || !!subFilter || !!jobFilter

  return (
    <div className="mb-6 bg-gqm-green-dark rounded-lg p-3 sm:p-6 border-4 border-black">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-white" />
            <h2 className="text-white text-lg font-semibold">{t("weeklyTasks")}</h2>
          </div>
          <p className="text-white/70 text-sm mt-0.5">
            {fmtShortDate(weekDays[0], t)} – {fmtShortDate(weekDays[6], t)} ·{" "}
            {hasActiveFilters
              ? `${filteredTasks.length} ${t("ofPagination")} ${tasks.length} ${t("tasksSuffix")}`
              : `${tasks.length} ${tasks.length !== 1 ? t("tasksSuffix") : t("taskSuffix")}`}
          </p>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            {summary.completed} {t("summaryDone")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <Loader2 className="h-3.5 w-3.5 text-blue-300" />
            {summary.inProg} {t("summaryInProgress")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-300" />
            {summary.high} {t("summaryHighPriority")}
          </span>
        </div>
      </div>

      {/* ── Job type filter ── */}
      <div className="mb-4 overflow-x-auto pb-1">
        <Tabs value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
          <TabsList className="h-10 rounded-xl border bg-white/10 p-1">
            <TabsTrigger
              value="ALL"
              className="h-8 min-w-[60px] sm:min-w-[80px] rounded-lg px-3 sm:px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-1 sm:gap-2">
                <Briefcase className="h-3.5 w-3.5" />{t("all_m")}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="QID"
              className="h-8 min-w-[60px] sm:min-w-[80px] rounded-lg px-3 sm:px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-1 sm:gap-2">
                <File className="h-3.5 w-3.5" />QID
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="PTL"
              className="h-8 min-w-[60px] sm:min-w-[80px] rounded-lg px-3 sm:px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-1 sm:gap-2">
                <ConstructionIcon className="h-3.5 w-3.5" />PTL
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="PAR"
              className="h-8 min-w-[60px] sm:min-w-[80px] rounded-lg px-3 sm:px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-1 sm:gap-2">
                <WalletIcon className="h-3.5 w-3.5" />PAR
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Additional filters ── */}
      {/* Status row - scrollable on mobile */}
      <div className="overflow-x-auto pb-1 mb-3">
        <div className="flex items-center gap-1 bg-white/10 rounded-full p-1 w-max">
          {(
            [
              { value: "ALL", label: t("statusAllStatus") },
              { value: "Not started", label: t("statusNotStarted") },
              { value: "Work-in-progress", label: t("statusInProgress") },
              { value: "Completed", label: t("statusCompleted") },
            ] as { value: TaskStatusFilter; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={[
                "rounded-full px-3 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap",
                statusFilter === value
                  ? "bg-white text-gqm-green-dark"
                  : "text-white/70 hover:text-white",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Member filter */}
        <FilterChip
          label={t("filterMember")}
          activeLabel={memberFilter?.name}
          onClick={() => setMemberPickerOpen(true)}
          onClear={() => setMemberFilter(null)}
        />

        {/* Subcontractor filter */}
        <FilterChip
          label={t("filterSubcontractor")}
          activeLabel={subFilter?.name}
          onClick={() => setSubPickerOpen(true)}
          onClear={() => setSubFilter(null)}
        />

        {/* Job filter */}
        <FilterChip
          label={t("filterJob")}
          activeLabel={jobFilter?.name}
          onClick={() => setJobPickerOpen(true)}
          onClear={() => setJobFilter(null)}
        />

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL")
              setMemberFilter(null)
              setSubFilter(null)
              setJobFilter(null)
            }}
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors ml-1"
          >
            <X className="h-3 w-3" /> {t("clearAll")}
          </button>
        )}
      </div>

      {/* ── Day header ── */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {weekDays.map((d, i) => {
          const today = isToday(d)
          return (
            <div
              key={i}
              className={[
                "rounded-lg py-2 px-1 text-center",
                today ? "bg-white shadow-sm" : "bg-white/10",
              ].join(" ")}
            >
              <p
                className={[
                  "text-xs font-semibold",
                  today ? "text-gqm-green-dark" : "text-white/80",
                ].join(" ")}
              >
                {t(DAY_KEYS[i])}
              </p>
              <p
                className={[
                  "text-sm font-bold tabular-nums",
                  today ? "text-gqm-green-dark" : "text-white",
                ].join(" ")}
              >
                {d.getDate()}
              </p>
              {today && (
                <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-gqm-green" />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <GanttSkeleton />
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-white/20 bg-white/10 py-14 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-white/40 mb-3" />
          <p className="text-white font-semibold">{t("noTasksFound")}</p>
          <p className="text-white/60 text-sm mt-1">
            {hasActiveFilters
              ? t("tryAdjustingFilters")
              : jobType !== "ALL"
              ? t("errorNoTasksForJobType", { type: jobType })
              : t("noTasksThisWeek")}
          </p>
        </div>
      ) : (
        <div>
          {pagedTasks.map((task) => (
            <TaskRow
              key={task.ID_Tasks}
              task={task}
              weekDays={weekDays}
              onClick={() => setDetailTask(task)}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-8"
                disabled={scrollPage === 0}
                onClick={() => setScrollPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-white/80 text-xs tabular-nums">
                {scrollPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-8"
                disabled={scrollPage >= totalPages - 1}
                onClick={() =>
                  setScrollPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4">
        <span className="text-xs text-white/50 font-medium uppercase tracking-wide">
          {t("legendLabel")}
        </span>
        {[
          { bar: "bg-emerald-400", label: t("legendCompleted") },
          { bar: "bg-blue-400", label: t("legendInProgress") },
          { bar: "bg-amber-400", label: t("legendPending") },
          { bar: "bg-red-400", label: t("legendOverdue") },
          { bar: "bg-gray-300", label: t("legendOther") },
        ].map(({ bar, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={["h-2.5 w-6 rounded-full", bar].join(" ")} />
            <span className="text-xs text-white/60">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Picker dialogs ── */}
      {memberPickerOpen && (
        <MemberPickerDialog
          onSelect={(o) => {
            setMemberFilter(o)
            setMemberPickerOpen(false)
          }}
          onClose={() => setMemberPickerOpen(false)}
        />
      )}
      {subPickerOpen && (
        <SubcontractorPickerDialog
          onSelect={(o) => {
            setSubFilter(o)
            setSubPickerOpen(false)
          }}
          onClose={() => setSubPickerOpen(false)}
        />
      )}
      {jobPickerOpen && (
        <JobPickerDialog
          onSelect={(o) => {
            setJobFilter(o)
            setJobPickerOpen(false)
          }}
          onClose={() => setJobPickerOpen(false)}
        />
      )}

      {/* ── Task detail dialog ── */}
      <TaskDetailDialog
        task={detailTask}
        onClose={() => setDetailTask(null)}
      />
    </div>
  )
}
