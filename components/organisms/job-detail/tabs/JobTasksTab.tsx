"use client"

import { useState, useEffect } from "react"
import { TaskBoard } from "@/components/organisms/TaskBoard"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { useQuery } from "@tanstack/react-query"
import type { Task } from "@/lib/types"

type Props = {
  role:           string
  tasks:          Task[]
  onCreateTask:   () => void
  onTaskOpen:     (task: Task) => void
  onTaskStatusChange: (taskId: string, newStatus: string) => void
  namesMap?: Record<string, string>
}

export function JobTasksTab({ tasks, onCreateTask, onTaskOpen, onTaskStatusChange, namesMap = {} }: Props) {
  const t = useTranslations("jobTasks")
  const { data: memberNames = {} } = useQuery<Record<string, string>>({
    queryKey: ["members_names_map"],
    queryFn: async () => {
      const r = await apiFetch("/api/members?page=1&limit=200")
      if (!r.ok) throw new Error("Failed to fetch members")
      const data = await r.json()
      const results: any[] = data?.results ?? data?.items ?? (Array.isArray(data) ? data : [])
      const map: Record<string, string> = {}
      results.forEach(m => {
        if (m.ID_Member) map[m.ID_Member] = m.Member_Name || m.Acc_Rep || m.ID_Member
      })
      return map
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  })

  const resolvedNamesMap = { ...namesMap, ...memberNames }
  const safeTasks = tasks ?? []

  const total     = safeTasks.length
  const done      = safeTasks.filter(t => t.Task_status === "Completed").length
  const inProg    = safeTasks.filter(t => t.Task_status === "Work-in-progress").length
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
            {t("title")}
          </h2>
          {total > 0 && (
            <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0" }}>
              {t("completedCount", { done, total })}
              {inProg > 0 && ` · ${t("inProgressCount", { count: inProg })}`}
              {overdue > 0 && (
                <span style={{ color: "#DC2626", fontWeight: 600 }}> · {t("overdueCount", { count: overdue })}</span>
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
          <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> {t("newTask")}
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
            {t("noTasks")}
          </p>
          <p style={{ fontSize: "12px", marginBottom: "20px" }}>
            {t("createFirstTask")}
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
            + {t("createTask")}
          </button>
        </div>
      ) : (
        <TaskBoard
          tasks={safeTasks}
          onTaskOpen={onTaskOpen}
          onTaskStatusChange={onTaskStatusChange}
          namesMap={resolvedNamesMap}
        />
      )}
    </div>
  )
}