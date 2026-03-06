"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Calendar, Clock, User } from "lucide-react"
import type { Task } from "@/lib/types"

interface TaskCardProps {
  task: Task
  onOpen: (task: Task) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_META = {
  High:   { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
  Medium: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
  Low:    { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#60A5FA" },
}

function formatDate(d: string | null | undefined): string {
  if (!d) return ""
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ""
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function getInitials(id: string): string {
  // ID_Technician is usually like "TCH-001" — show last 3 chars
  return id?.slice(-3).toUpperCase() ?? "?"
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskCard({ task, onOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.ID_Tasks })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0 : 1,
  }

  const priority = task.Priority as keyof typeof PRIORITY_META | undefined
  const pMeta    = priority ? PRIORITY_META[priority] : null
  const overdue  = isOverdue(task.Delivery_date as any)
  const dueLabel = formatDate(task.Delivery_date as any)
  const assignLabel = formatDate(task.Designation_date as any)

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => onOpen(task)}
        style={{
          background:   "#fff",
          border:       "1px solid #E5E7EB",
          borderRadius: "10px",
          padding:      "12px 13px 10px",
          cursor:       "pointer",
          transition:   "box-shadow 0.15s ease, border-color 0.15s ease, transform 0.1s ease",
          position:     "relative",
          userSelect:   "none",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow    = "0 4px 16px rgba(0,0,0,0.10)"
          ;(e.currentTarget as HTMLElement).style.borderColor = "#D1D5DB"
          ;(e.currentTarget as HTMLElement).style.transform   = "translateY(-1px)"
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow    = "none"
          ;(e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB"
          ;(e.currentTarget as HTMLElement).style.transform   = "translateY(0)"
        }}
      >
        {/* Overdue accent bar */}
        {overdue && (
          <div style={{
            position:     "absolute",
            top:          0,
            left:         0,
            right:        0,
            height:       "3px",
            background:   "#EF4444",
            borderRadius: "10px 10px 0 0",
          }} />
        )}

        {/* Row 1: drag handle + title + priority badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "6px" }}>
          <button
            {...listeners}
            onClick={e => e.stopPropagation()}
            style={{
              cursor:     "grab",
              color:      "#D1D5DB",
              background: "none",
              border:     "none",
              padding:    "1px 0 0",
              flexShrink: 0,
              lineHeight: 1,
            }}
            aria-label="Drag task"
          >
            <GripVertical size={14} />
          </button>

          <span style={{
            flex:       1,
            fontSize:   "13px",
            fontWeight: 600,
            color:      "#111827",
            lineHeight: 1.35,
          }}>
            {task.Name ?? "Untitled task"}
          </span>

          {pMeta && (
            <span style={{
              fontSize:     "10px",
              fontWeight:   700,
              color:        pMeta.color,
              background:   pMeta.bg,
              border:       `1px solid ${pMeta.border}`,
              borderRadius: "5px",
              padding:      "1px 7px",
              whiteSpace:   "nowrap",
              flexShrink:   0,
            }}>
              {task.Priority}
            </span>
          )}
        </div>

        {/* Description */}
        {task.Task_description && (
          <p style={{
            fontSize:   "11px",
            color:      "#6B7280",
            lineHeight: 1.45,
            marginBottom: "8px",
            paddingLeft:  "20px",
            display:    "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow:   "hidden",
          } as React.CSSProperties}>
            {task.Task_description}
          </p>
        )}

        {/* Divider */}
        <div style={{ height: "1px", background: "#F3F4F6", margin: "6px 0 8px 20px" }} />

        {/* Footer row */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        "10px",
          paddingLeft: "20px",
          flexWrap:   "wrap",
        }}>

          {/* Technician avatar */}
          {task.ID_Technician && (
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        "4px",
              fontSize:   "10px",
              color:      "#374151",
            }}>
              <div style={{
                width:          "18px",
                height:         "18px",
                borderRadius:   "50%",
                background:     "#0B2E1E",
                color:          "#fff",
                fontSize:       "7px",
                fontWeight:     700,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                flexShrink:     0,
              }}>
                {getInitials(task.ID_Technician)}
              </div>
              <span style={{ color: "#6B7280" }}>{task.ID_Technician}</span>
            </div>
          )}

          {/* Due date */}
          {dueLabel && (
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        "3px",
              fontSize:   "10px",
              color:      overdue ? "#DC2626" : "#6B7280",
              fontWeight: overdue ? 600 : 400,
              marginLeft: "auto",
            }}>
              <Clock size={11} />
              <span>{overdue ? "Overdue · " : ""}{dueLabel}</span>
            </div>
          )}
        </div>

        {/* Member badge (if present and different from technician) */}
        {task.ID_Member && (
          <div style={{
            marginTop:  "6px",
            paddingLeft: "20px",
            display:    "flex",
            alignItems: "center",
            gap:        "4px",
            fontSize:   "10px",
            color:      "#6B7280",
          }}>
            <User size={10} />
            <span>{task.ID_Member}</span>
          </div>
        )}
      </div>
    </div>
  )
}