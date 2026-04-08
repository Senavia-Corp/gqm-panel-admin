"use client"

import React, { useEffect, useState, useMemo } from "react"
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  Briefcase,
  File,
  ConstructionIcon,
  WalletIcon,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Types ────────────────────────────────────────────────────────────────────

type JobType = "ALL" | "QID" | "PTL" | "PAR"

type WeeklyTask = {
  ID_Tasks: string
  Name: string | null
  Task_description: string | null
  Task_status: string | null
  Priority: string | null
  Designation_date: string | null
  Delivery_date: string | null
  job: {
    ID_Jobs: string
    Job_type: string
    Project_name: string | null
    Job_status: string | null
    [key: string]: any
  } | null
  member: {
    ID_Member: string
    Name?: string | null
    [key: string]: any
  } | null
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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function fmtShortDate(d: Date) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

function fmtFullDate(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function isToday(d: Date) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

// Returns [startCol, spanCols] for a task bar (1-indexed, 7 cols)
function getBarPosition(task: WeeklyTask, weekDays: Date[]): [number, number] {
  const weekStart = weekDays[0]
  const weekEnd   = weekDays[6]

  const parseDate = (iso: string | null) => iso ? new Date(iso + "T00:00:00") : null

  let start = parseDate(task.Designation_date)
  let end   = parseDate(task.Delivery_date)

  if (!start && !end) return [1, 7]

  // Clamp to week
  const clampedStart = start && start < weekStart ? weekStart : (start ?? weekStart)
  const clampedEnd   = end   && end   > weekEnd   ? weekEnd   : (end   ?? weekEnd)

  const startIdx = weekDays.findIndex(d =>
    d.getDate()  === clampedStart.getDate() &&
    d.getMonth() === clampedStart.getMonth()
  )
  const endIdx = weekDays.findIndex(d =>
    d.getDate()  === clampedEnd.getDate() &&
    d.getMonth() === clampedEnd.getMonth()
  )

  const col  = startIdx >= 0 ? startIdx + 1 : 1
  const span = endIdx >= 0 ? endIdx - (col - 1) + 1 : 7 - col + 1

  return [col, Math.max(1, span)]
}

// ─── Priority & Status config ─────────────────────────────────────────────────

type PriorityKey = "High" | "Medium" | "Low" | "Critical" | string

const PRIORITY_CONFIG: Record<string, { dot: string; badge: string; label: string }> = {
  Critical: { dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border border-red-200",     label: "Critical" },
  High:     { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border border-orange-200", label: "High" },
  Medium:   { dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700 border border-yellow-200", label: "Medium" },
  Low:      { dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700 border border-blue-200",   label: "Low" },
  default:  { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 border border-gray-200",   label: "—" },
}

function getPriority(p: string | null) {
  if (!p) return PRIORITY_CONFIG.default
  return PRIORITY_CONFIG[p] ?? { ...PRIORITY_CONFIG.default, label: p }
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bar: string; badge: string }> = {
  completed:   { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />, bar: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  "in progress":{ icon: <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />, bar: "bg-blue-400", badge: "bg-blue-50 text-blue-700 border border-blue-200" },
  pending:     { icon: <Clock className="h-3.5 w-3.5 text-amber-600" />,          bar: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border border-amber-200" },
  overdue:     { icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,    bar: "bg-red-400",     badge: "bg-red-50 text-red-700 border border-red-200" },
  default:     { icon: <Circle className="h-3.5 w-3.5 text-gray-400" />,          bar: "bg-gray-300",    badge: "bg-gray-50 text-gray-600 border border-gray-200" },
}

function getStatus(s: string | null) {
  if (!s) return { ...STATUS_CONFIG.default, label: "—" }
  const key = s.toLowerCase().trim()
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.default
  return { ...cfg, label: s }
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
      {/* Header row */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-white/20" />
        ))}
      </div>
      {/* Task rows */}
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
  isSelected,
  onClick,
}: {
  task: WeeklyTask
  weekDays: Date[]
  isSelected: boolean
  onClick: () => void
}) {
  const [col, span] = getBarPosition(task, weekDays)
  const priority    = getPriority(task.Priority)
  const status      = getStatus(task.Task_status)
  const jobType     = task.job?.Job_type ?? null

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-xl p-4 border transition-all duration-200 mb-2",
        isSelected
          ? "bg-white border-white shadow-lg scale-[1.01]"
          : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40",
      ].join(" ")}
    >
      {/* Top row: name + badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={["font-semibold text-sm truncate max-w-[220px]", isSelected ? "text-gray-900" : "text-white"].join(" ")}>
          {task.Name || task.ID_Tasks}
        </span>

        {/* Status badge */}
        <span className={["inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", status.badge].join(" ")}>
          {status.icon}
          {status.label}
        </span>

        {/* Priority badge */}
        <span className={["inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", priority.badge].join(" ")}>
          <span className={["h-1.5 w-1.5 rounded-full", priority.dot].join(" ")} />
          {priority.label}
        </span>

        {/* Job type badge */}
        {jobType && (
          <span className={["rounded-full px-2 py-0.5 text-xs font-bold", JOB_TYPE_COLORS[jobType] ?? "bg-gray-100 text-gray-600 border border-gray-200"].join(" ")}>
            {jobType}
          </span>
        )}
      </div>

      {/* Gantt bar grid */}
      <div className="grid grid-cols-7 gap-1 items-center">
        {Array.from({ length: 7 }, (_, idx) => {
          const dayCol = idx + 1
          const inBar  = dayCol >= col && dayCol < col + span
          const isStart = dayCol === col
          const isEnd   = dayCol === col + span - 1

          return (
            <div key={idx} className="h-6 flex items-center">
              {inBar ? (
                <div
                  className={[
                    "h-full w-full transition-all",
                    status.bar,
                    isStart && isEnd ? "rounded-full" : isStart ? "rounded-l-full" : isEnd ? "rounded-r-full" : "",
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

      {/* Dates row */}
      <div className={["flex items-center gap-4 mt-2 text-xs", isSelected ? "text-gray-500" : "text-white/60"].join(" ")}>
        <span>Start: {fmtFullDate(task.Designation_date)}</span>
        <span>Due: {fmtFullDate(task.Delivery_date)}</span>
        {task.job?.Project_name && (
          <span className="truncate">📋 {task.job.Project_name}</span>
        )}
      </div>
    </button>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function TaskDetail({ task, onClose }: { task: WeeklyTask; onClose: () => void }) {
  const priority = getPriority(task.Priority)
  const status   = getStatus(task.Task_status)
  const jobType  = task.job?.Job_type ?? null

  return (
    <div className="rounded-2xl border border-white/20 bg-white p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-tight">
            {task.Name || task.ID_Tasks}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{task.ID_Tasks}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="shrink-0 text-xs h-7">
          Close
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={["inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", status.badge].join(" ")}>
          {status.icon} {status.label}
        </span>
        <span className={["inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", priority.badge].join(" ")}>
          <span className={["h-2 w-2 rounded-full", priority.dot].join(" ")} />
          {priority.label} Priority
        </span>
        {jobType && (
          <span className={["rounded-full px-2.5 py-1 text-xs font-bold", JOB_TYPE_COLORS[jobType] ?? "bg-gray-100 text-gray-600"].join(" ")}>
            {jobType}
          </span>
        )}
      </div>

      {/* Description */}
      {task.Task_description && (
        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-4 leading-relaxed">
          {task.Task_description}
        </p>
      )}

      {/* Date grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Assigned</p>
          <p className="font-semibold text-gray-900 text-sm">{fmtFullDate(task.Designation_date)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Due</p>
          <p className="font-semibold text-gray-900 text-sm">{fmtFullDate(task.Delivery_date)}</p>
        </div>
      </div>

      {/* Job info */}
      {task.job && (
        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job</p>
          <p className="font-semibold text-gray-900 text-sm">{task.job.Project_name ?? task.job.ID_Jobs}</p>
          {task.job.Project_location && (
            <p className="text-xs text-gray-500 mt-0.5">📍 {task.job.Project_location}</p>
          )}
          {task.job.Job_status && (
            <p className="text-xs text-gray-500 mt-0.5">Status: {task.job.Job_status}</p>
          )}
        </div>
      )}

      {/* Member */}
      {task.member && (
        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Member</p>
          <p className="font-semibold text-gray-900 text-sm">{task.member.Name ?? task.member.ID_Member}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeeklyTasksPanel() {
  const [jobType, setJobType]         = useState<JobType>("ALL")
  const [tasks, setTasks]             = useState<WeeklyTask[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [scrollPage, setScrollPage]   = useState(0)   // for virtual paging in the list
  const PAGE_SIZE = 8

  const weekDays = useMemo(() => getWeekDays(), [])

  // Fetch
  useEffect(() => {
    setSelectedId(null)
    const run = async () => {
      try {
        setIsLoading(true)
        const qs = new URLSearchParams()
        if (jobType !== "ALL") qs.set("job_type", jobType)
        const res = await apiFetch(`/api/tasks/weekly?${qs.toString()}`, { cache: "no-store" })
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

  const selectedTask = useMemo(
    () => tasks.find((t) => t.ID_Tasks === selectedId) ?? null,
    [tasks, selectedId]
  )

  // Priority-sorted tasks
  const sortedTasks = useMemo(() => {
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
    return [...tasks].sort((a, b) => {
      const pa = order[a.Priority ?? ""] ?? 4
      const pb = order[b.Priority ?? ""] ?? 4
      return pa - pb
    })
  }, [tasks])

  const totalPages  = Math.ceil(sortedTasks.length / PAGE_SIZE)
  const pagedTasks  = sortedTasks.slice(scrollPage * PAGE_SIZE, (scrollPage + 1) * PAGE_SIZE)

  // Summary counts
  const summary = useMemo(() => {
    const total     = tasks.length
    const completed = tasks.filter(t => t.Task_status?.toLowerCase() === "completed").length
    const inProg    = tasks.filter(t => t.Task_status?.toLowerCase().includes("progress")).length
    const high      = tasks.filter(t => ["Critical","High"].includes(t.Priority ?? "")).length
    return { total, completed, inProg, high }
  }, [tasks])

  return (
    <div className="mb-6 bg-gqm-green-dark rounded-lg p-6 border-4 border-black">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-white" />
            <h2 className="text-white text-lg font-semibold">Weekly Tasks</h2>
          </div>
          <p className="text-white/70 text-sm mt-0.5">
            {fmtShortDate(weekDays[0])} – {fmtShortDate(weekDays[6])} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            {summary.completed} Done
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <Loader2 className="h-3.5 w-3.5 text-blue-300" />
            {summary.inProg} In Progress
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-300" />
            {summary.high} High Priority
          </span>
        </div>
      </div>

      {/* ── Job type filter ── */}
      <div className="mb-5">
        <Tabs value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
          <TabsList className="h-10 rounded-xl border bg-white/10 p-1">
            <TabsTrigger
              value="ALL"
              className="h-8 min-w-[80px] rounded-lg px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />All</span>
            </TabsTrigger>
            <TabsTrigger
              value="QID"
              className="h-8 min-w-[80px] rounded-lg px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-2"><File className="h-3.5 w-3.5" />QID</span>
            </TabsTrigger>
            <TabsTrigger
              value="PTL"
              className="h-8 min-w-[80px] rounded-lg px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-2"><ConstructionIcon className="h-3.5 w-3.5" />PTL</span>
            </TabsTrigger>
            <TabsTrigger
              value="PAR"
              className="h-8 min-w-[80px] rounded-lg px-5 text-sm font-semibold text-white data-[state=active]:bg-white data-[state=active]:text-gqm-green-dark"
            >
              <span className="flex items-center gap-2"><WalletIcon className="h-3.5 w-3.5" />PAR</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
              <p className={["text-xs font-semibold", today ? "text-gqm-green-dark" : "text-white/80"].join(" ")}>
                {DAY_LABELS[i]}
              </p>
              <p className={["text-sm font-bold tabular-nums", today ? "text-gqm-green-dark" : "text-white"].join(" ")}>
                {d.getDate()}
              </p>
              {today && <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-gqm-green" />}
            </div>
          )
        })}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <GanttSkeleton />
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-white/20 bg-white/10 py-14 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-white/40 mb-3" />
          <p className="text-white font-semibold">No tasks this week</p>
          <p className="text-white/60 text-sm mt-1">
            {jobType !== "ALL" ? `No ${jobType} tasks with delivery dates in this range.` : "No tasks with delivery dates in this week."}
          </p>
        </div>
      ) : (
        <div className={["gap-5", selectedTask ? "grid md:grid-cols-[1fr_340px]" : ""].join(" ")}>

          {/* Task list */}
          <div>
            {pagedTasks.map((task) => (
              <TaskRow
                key={task.ID_Tasks}
                task={task}
                weekDays={weekDays}
                isSelected={selectedId === task.ID_Tasks}
                onClick={() => setSelectedId(selectedId === task.ID_Tasks ? null : task.ID_Tasks)}
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
                  onClick={() => { setScrollPage(p => Math.max(0, p - 1)); setSelectedId(null) }}
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
                  onClick={() => { setScrollPage(p => Math.min(totalPages - 1, p + 1)); setSelectedId(null) }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedTask && (
            <div className="md:sticky md:top-4 self-start">
              <TaskDetail
                task={selectedTask}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4">
        <span className="text-xs text-white/50 font-medium uppercase tracking-wide">Legend</span>
        {[
          { bar: "bg-emerald-400", label: "Completed" },
          { bar: "bg-blue-400",    label: "In Progress" },
          { bar: "bg-amber-400",   label: "Pending" },
          { bar: "bg-red-400",     label: "Overdue" },
          { bar: "bg-gray-300",    label: "Other" },
        ].map(({ bar, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={["h-2.5 w-6 rounded-full", bar].join(" ")} />
            <span className="text-xs text-white/60">{label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}