"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { Task, TaskStatus } from "@/lib/types"
import { TaskCard } from "@/components/molecules/TaskCard"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TaskBoardProps {
  tasks: Task[]
  onTaskOpen: (task: Task) => void
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
  namesMap?: Record<string, string>
}

const STATUS_COLUMNS: {
  id: TaskStatus
  label: string
  accent: string
  bg: string
  dot: string
  emptyMsg: string
}[] = [
  { id: "Not started",      label: "Not Started", accent: "#6B7280", bg: "#F9FAFB", dot: "#D1D5DB", emptyMsg: "No tasks queued"        },
  { id: "Work-in-progress", label: "In Progress",  accent: "#D97706", bg: "#FFFBEB", dot: "#F59E0B", emptyMsg: "Nothing in progress"    },
  { id: "Completed",        label: "Completed",    accent: "#059669", bg: "#F0FDF4", dot: "#34D399", emptyMsg: "No completed tasks yet"  },
]

// ── Droppable Column ──────────────────────────────────────────────────────────
// Each column registers itself as a droppable zone with its status string as id.
// This guarantees over.id === column status when dropping between columns.

function Column({
  col,
  tasks,
  onTaskOpen,
  isOver,
  namesMap = {},
}: {
  col: (typeof STATUS_COLUMNS)[number]
  tasks: Task[]
  onTaskOpen: (t: Task) => void
  isOver: boolean
  namesMap?: Record<string, string>
}) {
  const { setNodeRef } = useDroppable({ id: col.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        display:       "flex",
        flexDirection: "column",
        width:         "320px",
        flexShrink:    0,
        borderRadius:  "14px",
        overflow:      "hidden",
        border:        `1.5px solid ${isOver ? col.accent : "#E5E7EB"}`,
        boxShadow:     isOver ? `0 0 0 3px ${col.accent}22` : "0 1px 6px rgba(0,0,0,0.05)",
        background:    isOver ? `${col.accent}08` : col.bg,
        transition:    "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      }}
    >
      {/* Column header */}
      <div style={{
        padding:        "14px 16px",
        background:     "#fff",
        borderBottom:   `3px solid ${col.accent}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "9px", height: "9px", borderRadius: "50%",
            background: col.dot, display: "inline-block",
          }} />
          <span style={{
            fontSize: "13px", fontWeight: 700, color: "#111827",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {col.label}
          </span>
        </div>
        <span style={{
          fontSize: "11px", fontWeight: 700, color: col.accent,
          background: `${col.accent}18`, borderRadius: "10px",
          padding: "2px 9px", minWidth: "24px", textAlign: "center",
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea style={{ height: "calc(100vh - 300px)", minHeight: "260px" }}>
        <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "80px" }}>
          <SortableContext items={tasks.map(t => t.ID_Tasks)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
              <TaskCard key={task.ID_Tasks} task={task} onOpen={onTaskOpen} namesMap={namesMap} />
            ))}
          </SortableContext>

          {tasks.length === 0 && (
            <div style={{
              textAlign: "center", padding: "32px 16px",
              color: isOver ? col.accent : "#9CA3AF",
              fontSize: "12px",
              border: `1.5px dashed ${isOver ? col.accent : "#E5E7EB"}`,
              borderRadius: "10px", marginTop: "4px",
              transition: "all 0.15s ease",
              fontWeight: isOver ? 600 : 400,
            }}>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>
                {isOver ? "↓" : "○"}
              </div>
              {isOver ? "Drop here" : col.emptyMsg}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

export function TaskBoard({ tasks, onTaskOpen, onTaskStatusChange, namesMap = {} }: TaskBoardProps) {
  const [activeTask,   setActiveTask]   = useState<Task | null>(null)
  const [overColumnId, setOverColumnId] = useState<TaskStatus | null>(null)

  const safeTasks = tasks ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragStart({ active }: DragStartEvent) {
    const task = safeTasks.find(t => t.ID_Tasks === active.id)
    if (task) setActiveTask(task)
  }

  function handleDragOver({ over }: DragOverEvent) {
    // Track which column the card is currently hovering over
    if (!over) { setOverColumnId(null); return }
    const colIds = STATUS_COLUMNS.map(c => c.id as string)
    // over.id is a column id when hovering the droppable zone directly,
    // or a task id when hovering another task — resolve to column in both cases
    if (colIds.includes(over.id as string)) {
      setOverColumnId(over.id as TaskStatus)
    } else {
      // hovering another task → find which column it belongs to
      const overTask = safeTasks.find(t => t.ID_Tasks === over.id)
      if (overTask) setOverColumnId(overTask.Task_status as TaskStatus)
      else          setOverColumnId(null)
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)
    setOverColumnId(null)

    if (!over) return

    const colIds = STATUS_COLUMNS.map(c => c.id as string)

    // Resolve target column:
    // - If dropped directly on a column droppable → use that column id
    // - If dropped on another task → use that task's current status
    let targetStatus: string | null = null

    if (colIds.includes(over.id as string)) {
      targetStatus = over.id as string
    } else {
      const overTask = safeTasks.find(t => t.ID_Tasks === over.id)
      if (overTask) targetStatus = overTask.Task_status ?? null
    }

    if (!targetStatus) return

    const draggedTask = safeTasks.find(t => t.ID_Tasks === active.id)
    if (!draggedTask) return

    // Only fire the callback if the status actually changed
    if (draggedTask.Task_status !== targetStatus) {
      onTaskStatusChange(draggedTask.ID_Tasks, targetStatus as TaskStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "12px" }}>
        {STATUS_COLUMNS.map(col => (
          <Column
            key={col.id}
            col={col}
            tasks={safeTasks.filter(t => t.Task_status === col.id)}
            onTaskOpen={onTaskOpen}
            isOver={overColumnId === col.id}
            namesMap={namesMap}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div style={{ width: "320px", opacity: 0.92, transform: "rotate(1.5deg)", pointerEvents: "none" }}>
            <TaskCard task={activeTask} onOpen={() => {}} namesMap={namesMap} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}