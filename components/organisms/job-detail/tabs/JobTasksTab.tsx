"use client"

import { TaskBoard } from "@/components/organisms/TaskBoard"
import type { Task } from "@/lib/types"

type Props = {
  role:           string
  tasks:          Task[]
  onCreateTask:   () => void
  onTaskOpen:     (task: Task) => void
  onTaskStatusChange: (taskId: string, newStatus: string) => void
}

export function JobTasksTab({ tasks, onCreateTask, onTaskOpen, onTaskStatusChange }: Props) {
  const safeTasks = tasks ?? []

  const total     = safeTasks.length
  const done      = safeTasks.filter(t => t.Task_status === "Completed").length
  const inProg    = safeTasks.filter(t => t.Task_status === "Work-in-progress").length
  const notStart  = safeTasks.filter(t => t.Task_status === "Not started").length
  const overdue   = safeTasks.filter(t => {
    if (!t.Delivery_date) return false
    return new Date(t.Delivery_date as any) < new Date() && t.Task_status !== "Completed"
  }).length

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "20px",
        flexWrap:       "wrap",
        gap:            "12px",
      }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B2E1E", margin: 0 }}>
            Tasks
          </h2>
          {total > 0 && (
            <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0" }}>
              {done}/{total} completed
              {inProg > 0 && ` · ${inProg} in progress`}
              {overdue > 0 && (
                <span style={{ color: "#DC2626", fontWeight: 600 }}> · {overdue} overdue</span>
              )}
            </p>
          )}
        </div>

        <button
          onClick={onCreateTask}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "6px",
            padding:      "9px 20px",
            background:   "linear-gradient(135deg, #0B2E1E, #1A5C3A)",
            color:        "#fff",
            border:       "none",
            borderRadius: "9px",
            fontSize:     "13px",
            fontWeight:   600,
            cursor:       "pointer",
            boxShadow:    "0 2px 6px rgba(11,46,30,0.25)",
            transition:   "all 0.15s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> New Task
        </button>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div style={{
          height:       "5px",
          background:   "#F3F4F6",
          borderRadius: "99px",
          marginBottom: "20px",
          overflow:     "hidden",
        }}>
          <div style={{
            height:     "100%",
            width:      `${(done / total) * 100}%`,
            background: "linear-gradient(90deg, #059669, #34D399)",
            borderRadius: "99px",
            transition: "width 0.4s ease",
          }} />
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {total === 0 ? (
        <div style={{
          textAlign:    "center",
          padding:      "60px 24px",
          color:        "#9CA3AF",
          background:   "#FAFAFA",
          border:       "1.5px dashed #E5E7EB",
          borderRadius: "14px",
        }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
            No tasks yet
          </p>
          <p style={{ fontSize: "12px", marginBottom: "20px" }}>
            Create the first task for this job
          </p>
          <button
            onClick={onCreateTask}
            style={{
              padding:      "9px 24px",
              background:   "#0B2E1E",
              color:        "#fff",
              border:       "none",
              borderRadius: "8px",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >
            + Create Task
          </button>
        </div>
      ) : (
        <TaskBoard
          tasks={safeTasks}
          onTaskOpen={onTaskOpen}
          onTaskStatusChange={onTaskStatusChange}
        />
      )}
    </div>
  )
}