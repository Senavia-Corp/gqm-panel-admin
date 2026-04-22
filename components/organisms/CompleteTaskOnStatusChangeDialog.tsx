"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { CheckCircle2, Circle, Clock, ClipboardList, X } from "lucide-react"
import type { Task } from "@/lib/types"

interface CompleteTaskOnStatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  jobId: string
  onConfirm: (taskId: string) => void
  onSkip: () => void
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  "Not started":       <Circle size={13} color="#9CA3AF" />,
  "Work-in-progress":  <Clock  size={13} color="#D97706" />,
  "Completed":         <CheckCircle2 size={13} color="#16A34A" />,
}

const PRIORITY_DOT: Record<string, string> = {
  High:   "#EF4444",
  Medium: "#F59E0B",
  Low:    "#3B82F6",
}

export function CompleteTaskOnStatusChangeDialog({
  open,
  onOpenChange,
  tasks,
  jobId,
  onConfirm,
  onSkip,
}: CompleteTaskOnStatusChangeDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pending = tasks.filter(t => t.Task_status !== "Completed")

  function handleClose() {
    setSelectedId(null)
    onOpenChange(false)
  }

  function handleSkip() {
    setSelectedId(null)
    onSkip()
  }

  function handleConfirm() {
    if (!selectedId) return
    onConfirm(selectedId)
    setSelectedId(null)
  }

  // Reset selection when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (!v) { handleClose(); return }
    setSelectedId(null)
    onOpenChange(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 overflow-hidden gap-0 flex flex-col"
        style={{ maxWidth: "520px", width: "95vw", borderRadius: "16px", maxHeight: "86vh", border: "none" }}
      >
        <VisuallyHidden><DialogTitle>Mark Proposal Task as Completed</DialogTitle></VisuallyHidden>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #0B2E1E 0%, #1A5C3A 100%)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "40px", height: "40px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <CheckCircle2 size={20} color="white" />
            </div>
            <div>
              <h2 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                Mark proposal task as completed?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", margin: "2px 0 0" }}>
                {jobId} → Waiting for Approval
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: "30px", height: "30px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.7)",
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px", lineHeight: 1.5 }}>
            This job is moving to <strong style={{ color: "#374151" }}>Waiting for Approval</strong>.
            Select the task related to sending the proposal to mark it as completed, or skip if it doesn't apply.
          </p>

          {pending.length === 0 ? (
            <div style={{
              padding: "16px",
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <CheckCircle2 size={14} color="#16A34A" />
              All tasks are already completed.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {pending.map(task => {
                const selected = selectedId === task.ID_Tasks
                return (
                  <button
                    key={task.ID_Tasks}
                    onClick={() => setSelectedId(selected ? null : task.ID_Tasks)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "12px 14px",
                      border: `1.5px solid ${selected ? "#059669" : "#E5E7EB"}`,
                      borderRadius: "10px",
                      background: selected ? "#F0FDF4" : "#FAFAFA",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                      width: "100%",
                    }}
                  >
                    {/* Selection indicator */}
                    <div style={{
                      width: "18px", height: "18px",
                      borderRadius: "50%",
                      border: `2px solid ${selected ? "#059669" : "#D1D5DB"}`,
                      background: selected ? "#059669" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}>
                      {selected && (
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />
                      )}
                    </div>

                    {/* Task info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: task.Task_description ? "4px" : 0,
                      }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827", flex: 1 }}>
                          {task.Name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          {task.Priority && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#6B7280" }}>
                              <span style={{
                                width: "7px", height: "7px",
                                borderRadius: "50%",
                                background: PRIORITY_DOT[task.Priority] ?? "#9CA3AF",
                                display: "inline-block",
                                flexShrink: 0,
                              }} />
                              {task.Priority}
                            </span>
                          )}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            {STATUS_ICON[task.Task_status] ?? <Circle size={13} color="#9CA3AF" />}
                          </span>
                        </div>
                      </div>
                      {task.Task_description && (
                        <p style={{
                          fontSize: "12px",
                          color: "#9CA3AF",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {task.Task_description}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid #F3F4F6",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          background: "#FAFAFA",
          flexShrink: 0,
        }}>
          <button
            onClick={handleSkip}
            style={{
              padding: "9px 20px",
              border: "1.5px solid #E5E7EB",
              borderRadius: "9px",
              background: "#fff",
              color: "#6B7280",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            style={{
              padding: "9px 20px",
              background: selectedId
                ? "linear-gradient(135deg, #0B2E1E 0%, #1A5C3A 100%)"
                : "#E5E7EB",
              color: selectedId ? "#fff" : "#9CA3AF",
              border: "none",
              borderRadius: "9px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: selectedId ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: selectedId ? "0 2px 8px rgba(11,46,30,0.3)" : "none",
              transition: "all 0.15s",
            }}
          >
            <ClipboardList size={13} />
            Mark as Completed
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
