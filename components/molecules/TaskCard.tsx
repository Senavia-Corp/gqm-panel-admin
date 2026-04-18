"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Calendar, Clock, User, Building2, Wrench, ArrowRight } from "lucide-react"
import type { Task } from "@/lib/types"

interface TaskCardProps {
  task: Task
  onOpen: (task: Task) => void
  namesMap?: Record<string, string>
}

// ── Priority styles ───────────────────────────────────────────────────────────

const PRIORITY_META = {
  High:   { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
  Medium: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
  Low:    { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#60A5FA" },
}

// ── Date helpers ─────────────────────────────────────────────────────────────
// Handles both ISO "YYYY-MM-DD" and RFC 2822 "Mon, DD Mmm YYYY HH:MM:SS GMT"

function extractDateParts(d: string | null | undefined): [number, number, number] | null {
  if (!d) return null
  const s = String(d).trim()
  if (!s || s === "null") return null
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return [parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)]
  const dt = new Date(s)
  if (isNaN(dt.getTime())) return null
  return [dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()]
}

function formatDate(d: string | null | undefined): string {
  const parts = extractDateParts(d)
  if (!parts) return ""
  const dt = new Date(parts[0], parts[1], parts[2], 12, 0, 0)
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function isOverdue(d: string | null | undefined): boolean {
  const parts = extractDateParts(d)
  if (!parts) return false
  return new Date(parts[0], parts[1], parts[2], 23, 59, 59) < new Date()
}

// ── Assignee chip ─────────────────────────────────────────────────────────────

function nameInitials(name: string): string {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
}

function AssigneeChip({ task, namesMap = {} }: { task: Task; namesMap?: Record<string, string> }) {
  if (task.ID_Member) {
    const name = namesMap[task.ID_Member] || task.ID_Member
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <div style={{
          width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #0B2E1E, #1A5C3A)",
          color: "#fff", fontSize: "7px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {nameInitials(name)}
        </div>
        <span style={{ fontSize: "10px", color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
          {name}
        </span>
      </div>
    )
  }

  if (task.ID_Subcontractor) {
    const name = namesMap[task.ID_Subcontractor] || task.ID_Subcontractor
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <div style={{
          width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
          background: "#F3F4F6", border: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Building2 size={11} color="#6B7280" />
        </div>
        <span style={{ fontSize: "10px", color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
          {name}
        </span>
      </div>
    )
  }

  if (task.ID_Technician) {
    const name = namesMap[task.ID_Technician] || task.ID_Technician
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <div style={{
          width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
          background: "#F3F4F6", border: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Wrench size={10} color="#6B7280" />
        </div>
        <span style={{ fontSize: "10px", color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
          {name}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <div style={{
        width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
        background: "#F9FAFB", border: "1px dashed #D1D5DB",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <User size={10} color="#D1D5DB" />
      </div>
      <span style={{ fontSize: "10px", color: "#D1D5DB", fontStyle: "italic" }}>Unassigned</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskCard({ task, onOpen, namesMap = {} }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.ID_Tasks })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0 : 1,
  }

  const priority  = task.Priority as keyof typeof PRIORITY_META | undefined
  const pMeta     = priority ? PRIORITY_META[priority] : null
  const overdue   = isOverdue(task.Delivery_date as any)
  const startLabel = formatDate(task.Designation_date as any)
  const dueLabel   = formatDate(task.Delivery_date as any)

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => onOpen(task)}
        style={{
          background:   "#fff",
          border:       `1px solid ${overdue ? "#FECACA" : "#E5E7EB"}`,
          borderRadius: "10px",
          padding:      "11px 13px 11px",
          cursor:       "pointer",
          transition:   "box-shadow 0.15s ease, border-color 0.15s ease, transform 0.1s ease",
          position:     "relative",
          userSelect:   "none",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow    = "0 4px 16px rgba(0,0,0,0.10)"
          ;(e.currentTarget as HTMLElement).style.borderColor = overdue ? "#FCA5A5" : "#D1D5DB"
          ;(e.currentTarget as HTMLElement).style.transform   = "translateY(-1px)"
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow    = "none"
          ;(e.currentTarget as HTMLElement).style.borderColor = overdue ? "#FECACA" : "#E5E7EB"
          ;(e.currentTarget as HTMLElement).style.transform   = "translateY(0)"
        }}
      >
        {/* Overdue accent bar */}
        {overdue && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "3px",
            background: "#EF4444", borderRadius: "10px 10px 0 0",
          }} />
        )}

        {/* Row 1: drag handle + title + priority badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "6px" }}>
          <button
            {...listeners}
            onClick={e => e.stopPropagation()}
            style={{
              cursor: "grab", color: "#D1D5DB", background: "none",
              border: "none", padding: "2px 0 0", flexShrink: 0, lineHeight: 1,
            }}
            aria-label="Drag task"
          >
            <GripVertical size={14} />
          </button>

          <span style={{
            flex: 1, fontSize: "13px", fontWeight: 600,
            color: "#111827", lineHeight: 1.35,
          }}>
            {task.Name ?? "Untitled task"}
          </span>

          {pMeta && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              fontSize: "10px", fontWeight: 700, color: pMeta.color,
              background: pMeta.bg, border: `1px solid ${pMeta.border}`,
              borderRadius: "5px", padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: pMeta.dot, flexShrink: 0 }} />
              {task.Priority}
            </span>
          )}
        </div>

        {/* Description */}
        {task.Task_description && (
          <p style={{
            fontSize: "11px", color: "#6B7280", lineHeight: 1.5,
            marginBottom: "9px", paddingLeft: "20px",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          } as React.CSSProperties}>
            {task.Task_description}
          </p>
        )}

        {/* Divider */}
        <div style={{ height: "1px", background: "#F3F4F6", margin: "0 0 9px 20px" }} />

        {/* Dates row */}
        {(startLabel || dueLabel) && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            paddingLeft: "20px", marginBottom: "8px", flexWrap: "wrap",
          }}>
            {startLabel && (
              <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#6B7280" }}>
                <Calendar size={10} color="#9CA3AF" />
                <span>{startLabel}</span>
              </div>
            )}
            {startLabel && dueLabel && (
              <ArrowRight size={9} color="#D1D5DB" />
            )}
            {dueLabel && (
              <div style={{
                display: "flex", alignItems: "center", gap: "3px",
                fontSize: "10px",
                color: overdue ? "#DC2626" : "#6B7280",
                fontWeight: overdue ? 600 : 400,
              }}>
                <Clock size={10} color={overdue ? "#DC2626" : "#9CA3AF"} />
                <span>{dueLabel}{overdue ? " · Overdue" : ""}</span>
              </div>
            )}
          </div>
        )}

        {/* Assignee row */}
        <div style={{ paddingLeft: "20px" }}>
          <AssigneeChip task={task} namesMap={namesMap} />
        </div>
      </div>
    </div>
  )
}
