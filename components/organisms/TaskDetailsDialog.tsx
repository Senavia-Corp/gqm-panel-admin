"use client"

import { useState, useEffect } from "react"
import type { Task } from "@/lib/types"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { apiFetch } from "@/lib/apiFetch"
import {
  ClipboardList,
  AlignLeft,
  Flag,
  Calendar,
  Clock,
  UserCheck,
  Users,
  Building2,
  Wrench,
  CheckCircle2,
  Circle,
  X,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react"

// ── Sentinel — never pass "" to Radix Select ──────────────────────────────────
const NONE = "__none__"

function toForm(v: string | null | undefined): string {
  return v ?? NONE
}
function fromForm(v: string): string | null {
  return v === NONE ? null : v
}

type AssignType = "none" | "member" | "subcontractor"

interface TaskDetailsDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (taskId: string) => void
  onSave: () => void
  technicians?: Array<{ id: string; name: string; type: string }>
  jobData?: any
}

// ── Clean {"value"} DB artifact from org names ────────────────────────────────
function cleanOrgName(raw: string | null | undefined): string {
  if (!raw) return ""
  const match = /^\{"(.+)"\}$/.exec(raw.trim())
  return match ? match[1] : raw
}

// ── Style constants ───────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  High:   { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
  Medium: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
  Low:    { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  "Not started":      { color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
  "Work-in-progress": { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  "Completed":        { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
      <div style={{ color: "#059669", display: "flex", alignItems: "center" }}>{icon}</div>
      <span style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: "1px", background: "#F3F4F6", margin: "22px 0" }} />
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
      {children}
    </label>
  )
}

function editInputStyle(edited = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 14px",
    border: `1.5px solid ${edited ? "#3B82F6" : "#E5E7EB"}`,
    borderRadius: "9px",
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
    background: edited ? "#EFF6FF" : "#fff",
  }
}

function viewFieldStyle(highlighted = false): React.CSSProperties {
  return {
    padding: "11px 14px",
    background: highlighted ? "#FEF2F2" : "#FAFAFA",
    border: `1px solid ${highlighted ? "#FECACA" : "#F3F4F6"}`,
    borderRadius: "9px",
    fontSize: "13px",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }
}

// Returns [year, month(0-based), day] from any date string.
// Handles both ISO "YYYY-MM-DD[...]" and RFC 2822 "Mon, DD Mmm YYYY HH:MM:SS GMT".
function extractDateParts(d: string | null | undefined): [number, number, number] | null {
  if (!d) return null
  const s = String(d).trim()
  if (!s || s === "null" || s === "undefined") return null

  // ISO format: YYYY-MM-DD (optionally followed by time)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return [parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)]

  // Any other parseable format (e.g. RFC 2822 "Fri, 17 Apr 2026 00:00:00 GMT")
  const dt = new Date(s)
  if (isNaN(dt.getTime())) return null
  // Use UTC parts: the string already specifies an absolute instant (with GMT/Z)
  return [dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()]
}

// Returns YYYY-MM-DD for <input type="date">
function toDateInputValue(d: string | null | undefined): string {
  const parts = extractDateParts(d)
  if (!parts) return ""
  const [y, m, day] = parts
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// Human-readable display. Uses local Date constructor at noon — zero UTC-offset risk.
function formatDate(d: string | null | undefined): string {
  const parts = extractDateParts(d)
  if (!parts) return "Not set"
  const dt = new Date(parts[0], parts[1], parts[2], 12, 0, 0)
  if (isNaN(dt.getTime())) return "Not set"
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onDelete,
  onSave,
  technicians = [],
  jobData,
}: TaskDetailsDialogProps) {
  const [isEditMode,        setIsEditMode]        = useState(false)
  const [editedFields,      setEditedFields]      = useState<Set<string>>(new Set())
  const [isSaving,          setIsSaving]          = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting,        setIsDeleting]        = useState(false)
  const [saveError,         setSaveError]         = useState<string | null>(null)
  const [assignType,        setAssignType]        = useState<AssignType>("none")
  const [allMembers,        setAllMembers]        = useState<{ id: string; name: string; role: string }[]>([])
  const [loadingMembers,    setLoadingMembers]    = useState(false)

  const [formData, setFormData] = useState(() => ({
    Name:             task?.Name             ?? "",
    Task_description: task?.Task_description ?? "",
    Task_status:      task?.Task_status      ?? "Not started",
    Priority:         toForm(task?.Priority),
    Designation_date: String(task?.Designation_date ?? ""),
    Delivery_date:    String(task?.Delivery_date    ?? ""),
    ID_Technician:    toForm(task?.ID_Technician),
    ID_Member:        toForm(task?.ID_Member),
    ID_Subcontractor: toForm(task?.ID_Subcontractor),
  }))

  // Derive jobSubcontractors from jobData prop
  const jobSubcontractors: { id: string; name: string; org: string; technicians: { id: string; name: string }[] }[] =
    jobData?.subcontractors?.map((sub: any) => ({
      id:           sub.ID_Subcontractor,
      name:         cleanOrgName(sub.Name) || sub.ID_Subcontractor,
      org:          cleanOrgName(sub.Organization),
      technicians:  sub.technicians?.map((t: any) => ({ id: t.ID_Technician, name: t.Name || t.ID_Technician })) ?? [],
    })) ?? []

  // Sync form when task changes
  useEffect(() => {
    if (!task) return
const memberId = toForm(task.ID_Member)
    const subId    = toForm(task.ID_Subcontractor)
    const techId   = toForm(task.ID_Technician)

    setFormData({
      Name:             task.Name             ?? "",
      Task_description: task.Task_description ?? "",
      Task_status:      task.Task_status      ?? "Not started",
      Priority:         toForm(task.Priority),
      Designation_date: String(task.Designation_date ?? ""),
      Delivery_date:    String(task.Delivery_date    ?? ""),
      ID_Technician:    techId,
      ID_Member:        memberId,
      ID_Subcontractor: subId,
    })

    if (memberId !== NONE)              setAssignType("member")
    else if (subId !== NONE || techId !== NONE) setAssignType("subcontractor")
    else                                setAssignType("none")

    setEditedFields(new Set())
    setIsEditMode(false)
    setSaveError(null)
  }, [task])

  // Fetch all members when dialog opens (needed for view + edit mode name display)
  useEffect(() => {
    if (!open) return
    setLoadingMembers(true)
    apiFetch("/api/members?page=1&limit=200")
      .then(r => r.json())
      .then(data => {
        const results: any[] = data?.results ?? data?.items ?? (Array.isArray(data) ? data : [])
        setAllMembers(results.map(m => ({
          id:   m.ID_Member,
          name: m.Member_Name || m.Acc_Rep || m.name || m.ID_Member,
          role: m.Company_Role || "",
        })))
      })
      .catch(() => setAllMembers([]))
      .finally(() => setLoadingMembers(false))
  }, [open])

  if (!task) return null

  // ── Helpers ───────────────────────────────────────────────────────────────

  function handleFieldChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setEditedFields(prev => new Set(prev).add(field))
  }

  function handleAssignTypeChange(type: AssignType) {
    setAssignType(type)
    setFormData(p => ({ ...p, ID_Member: NONE, ID_Subcontractor: NONE, ID_Technician: NONE }))
    setEditedFields(prev => {
      const next = new Set(prev)
      next.add("ID_Member"); next.add("ID_Subcontractor"); next.add("ID_Technician")
      return next
    })
  }

  function resetForm() {
    if (!task) return
    const memberId = toForm(task.ID_Member)
    const subId    = toForm(task.ID_Subcontractor)
    const techId   = toForm(task.ID_Technician)
    setFormData({
      Name:             task.Name             ?? "",
      Task_description: task.Task_description ?? "",
      Task_status:      task.Task_status      ?? "Not started",
      Priority:         toForm(task.Priority),
      Designation_date: String(task.Designation_date ?? ""),
      Delivery_date:    String(task.Delivery_date    ?? ""),
      ID_Technician:    techId,
      ID_Member:        memberId,
      ID_Subcontractor: subId,
    })
    if (memberId !== NONE)              setAssignType("member")
    else if (subId !== NONE || techId !== NONE) setAssignType("subcontractor")
    else                                setAssignType("none")
    setEditedFields(new Set())
    setIsEditMode(false)
    setSaveError(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSaveChanges = async () => {
    if (editedFields.size === 0) { setIsEditMode(false); return }
    setIsSaving(true); setSaveError(null)

    try {
      const nullableFields = new Set(["Priority", "ID_Technician", "ID_Member", "ID_Subcontractor"])
      const updateData: Record<string, any> = { ID_Tasks: task.ID_Tasks }

      editedFields.forEach(field => {
        const raw = formData[field as keyof typeof formData]
        updateData[field] = nullableFields.has(field) ? fromForm(raw) : (raw || null)
      })

      const res = await apiFetch("/api/tasks", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(updateData),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? data?.detail ?? `Error ${res.status}`)
      }

      setIsEditMode(false)
      setEditedFields(new Set())
      onSave()
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!task.ID_Tasks) { setSaveError("Cannot delete: missing ID_Tasks"); return }
    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/tasks?task_id=${encodeURIComponent(task.ID_Tasks)}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      setShowDeleteConfirm(false)
      onOpenChange(false)
      onDelete(task.ID_Tasks)
      onSave()
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to delete task")
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Derived display values ────────────────────────────────────────────────

  const priorityKey = fromForm(formData.Priority)
  const pStyle      = priorityKey ? PRIORITY_STYLE[priorityKey] : null
  const sStyle      = STATUS_STYLE[formData.Task_status] ?? STATUS_STYLE["Not started"]

  const isOverdue = (() => {
    if (!formData.Delivery_date || formData.Task_status === "Completed") return false
    const parts = extractDateParts(formData.Delivery_date)
    if (!parts) return false
    return new Date(parts[0], parts[1], parts[2], 23, 59, 59) < new Date()
  })()

  const memberDisplay  = allMembers.find(m => m.id === fromForm(formData.ID_Member))
  const memberName     = memberDisplay?.name ?? fromForm(formData.ID_Member)
  const techName       = technicians.find(t => t.id === fromForm(formData.ID_Technician))?.name ?? fromForm(formData.ID_Technician)
  const subcDisplay    = jobSubcontractors.find(s => s.id === fromForm(formData.ID_Subcontractor))
  const selectedSubc   = jobSubcontractors.find(s => s.id === formData.ID_Subcontractor)

  function initials(name: string | null | undefined): string {
    return (name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="p-0 overflow-hidden gap-0 flex flex-col"
          style={{ maxWidth: "720px", width: "95vw", borderRadius: "16px", maxHeight: "92vh", border: "none" }}
        >
          <VisuallyHidden><DialogTitle>{task.Name}</DialogTitle></VisuallyHidden>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div
            className="flex shrink-0 items-start justify-between gap-3.5 px-4 py-4 sm:px-7 sm:py-5"
            style={{ background: "linear-gradient(135deg, #0B2E1E 0%, #1A5C3A 100%)" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1, minWidth: 0 }}>
              <div style={{
                width: "44px", height: "44px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "11px",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                marginTop: "2px",
              }}>
                <ClipboardList size={22} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ color: "#fff", fontSize: "17px", fontWeight: 700, margin: 0, lineHeight: 1.3, wordBreak: "break-word" }}>
                  {task.Name}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "7px", flexWrap: "wrap" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>{task.ID_Tasks}</span>
                  {/* Status pill */}
                  <span style={{
                    padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                    background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
                  }}>
                    {formData.Task_status === "Work-in-progress" ? "In Progress" : formData.Task_status}
                  </span>
                  {/* Priority pill */}
                  {pStyle && (
                    <span style={{
                      padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                      background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      display: "inline-flex", alignItems: "center", gap: "5px",
                    }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: pStyle.dot }} />
                      {priorityKey}
                    </span>
                  )}
                  {isOverdue && (
                    <span style={{
                      padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                      background: "rgba(239,68,68,0.3)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.4)",
                    }}>
                      ⚠ Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              style={{
                width: "32px", height: "32px", background: "rgba(255,255,255,0.1)", border: "none",
                borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "rgba(255,255,255,0.7)", flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6">

            {/* Error banner */}
            {saveError && (
              <div style={{
                marginBottom: "16px", padding: "10px 14px", background: "#FEF2F2",
                border: "1px solid #FECACA", borderRadius: "9px", fontSize: "13px", color: "#DC2626",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <AlertTriangle size={14} /> {saveError}
              </div>
            )}

            {/* ── Section 1: Classification ──────────────────────────── */}
            <SectionHeader icon={<Flag size={13} />} label="Classification" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Status card */}
              <div style={{
                padding: "14px 16px",
                border: `1.5px solid ${editedFields.has("Task_status") ? "#3B82F6" : "#F3F4F6"}`,
                borderRadius: "12px",
                background: editedFields.has("Task_status") ? "#EFF6FF" : "#FAFAFA",
              }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#9CA3AF", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <Circle size={10} /> Status
                </div>
                {isEditMode ? (
                  <Select value={formData.Task_status} onValueChange={v => handleFieldChange("Task_status", v)}>
                    <SelectTrigger style={{ borderRadius: "8px", fontSize: "13px", height: "36px", background: "#fff" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not started">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}><Circle size={11} color="#9CA3AF" /> Not Started</span>
                      </SelectItem>
                      <SelectItem value="Work-in-progress">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}><Clock size={11} color="#D97706" /> In Progress</span>
                      </SelectItem>
                      <SelectItem value="Completed">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}><CheckCircle2 size={11} color="#16A34A" /> Completed</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
                    background: sStyle.bg, color: sStyle.color, border: `1px solid ${sStyle.border}`,
                  }}>
                    {formData.Task_status === "Not started" && <Circle size={10} />}
                    {formData.Task_status === "Work-in-progress" && <Clock size={10} />}
                    {formData.Task_status === "Completed" && <CheckCircle2 size={10} />}
                    {formData.Task_status === "Work-in-progress" ? "In Progress" : formData.Task_status}
                  </span>
                )}
              </div>

              {/* Priority card */}
              <div style={{
                padding: "14px 16px",
                border: `1.5px solid ${editedFields.has("Priority") ? "#3B82F6" : "#F3F4F6"}`,
                borderRadius: "12px",
                background: editedFields.has("Priority") ? "#EFF6FF" : "#FAFAFA",
              }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#9CA3AF", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <Flag size={10} /> Priority
                </div>
                {isEditMode ? (
                  <Select value={formData.Priority} onValueChange={v => handleFieldChange("Priority", v)}>
                    <SelectTrigger style={{ borderRadius: "8px", fontSize: "13px", height: "36px", background: "#fff" }}>
                      <SelectValue placeholder="No priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No priority</SelectItem>
                      {["High", "Medium", "Low"].map(p => (
                        <SelectItem key={p} value={p}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: PRIORITY_STYLE[p].dot, display: "inline-block" }} />
                            {p}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : pStyle ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
                    background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}`,
                  }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: pStyle.dot, flexShrink: 0 }} />
                    {priorityKey}
                  </span>
                ) : (
                  <span style={{ fontSize: "13px", color: "#9CA3AF", fontStyle: "italic" }}>No priority</span>
                )}
              </div>
            </div>

            <Divider />

            {/* ── Section 2: Task Details ────────────────────────────── */}
            <SectionHeader icon={<ClipboardList size={13} />} label="Task Details" />

            <div style={{ marginBottom: "14px" }}>
              <FieldLabel>Task Name</FieldLabel>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.Name}
                  onChange={e => handleFieldChange("Name", e.target.value)}
                  style={editInputStyle(editedFields.has("Name"))}
                />
              ) : (
                <div style={{ ...viewFieldStyle(), fontWeight: 600, fontSize: "14px", color: "#111827" }}>
                  {formData.Name}
                </div>
              )}
            </div>

            <div>
              <FieldLabel>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <AlignLeft size={12} color="#9CA3AF" /> Description
                </span>
              </FieldLabel>
              {isEditMode ? (
                <textarea
                  value={formData.Task_description ?? ""}
                  onChange={e => handleFieldChange("Task_description", e.target.value)}
                  placeholder="Add a description..."
                  rows={4}
                  style={{ ...editInputStyle(editedFields.has("Task_description")), resize: "vertical" }}
                />
              ) : (
                <div style={{
                  ...viewFieldStyle(),
                  alignItems: "flex-start",
                  lineHeight: 1.7,
                  minHeight: "56px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: formData.Task_description ? "#374151" : "#9CA3AF",
                  fontStyle: formData.Task_description ? "normal" : "italic",
                }}>
                  {formData.Task_description || "No description provided"}
                </div>
              )}
            </div>

            <Divider />

            {/* ── Section 3: Timeline ───────────────────────────────── */}
            <SectionHeader icon={<Calendar size={13} />} label="Timeline" />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <FieldLabel>Start Date</FieldLabel>
                {isEditMode ? (
                  <input
                    type="date"
                    value={toDateInputValue(formData.Designation_date)}
                    onChange={e => handleFieldChange("Designation_date", e.target.value)}
                    style={editInputStyle(editedFields.has("Designation_date"))}
                  />
                ) : (
                  <div style={viewFieldStyle()}>
                    <Calendar size={14} color="#9CA3AF" />
                    <span style={{ color: formData.Designation_date ? "#374151" : "#9CA3AF" }}>
                      {formatDate(formData.Designation_date)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <FieldLabel>Delivery Date</FieldLabel>
                {isEditMode ? (
                  <input
                    type="date"
                    value={toDateInputValue(formData.Delivery_date)}
                    onChange={e => handleFieldChange("Delivery_date", e.target.value)}
                    style={editInputStyle(editedFields.has("Delivery_date"))}
                  />
                ) : (
                  <div style={viewFieldStyle(isOverdue)}>
                    <Clock size={14} color={isOverdue ? "#DC2626" : "#9CA3AF"} />
                    <span style={{ color: isOverdue ? "#DC2626" : (formData.Delivery_date ? "#374151" : "#9CA3AF") }}>
                      {formatDate(formData.Delivery_date)}
                    </span>
                    {isOverdue && (
                      <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "#DC2626", background: "#FEE2E2", padding: "1px 7px", borderRadius: "10px" }}>
                        OVERDUE
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Divider />

            {/* ── Section 4: Assignment ─────────────────────────────── */}
            <SectionHeader icon={<UserCheck size={13} />} label="Assignment" />

            {isEditMode ? (
              <>
                {/* Assignment type tabs */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
                  {[
                    { key: "none" as AssignType,          label: "Unassigned",    icon: <Circle size={13} /> },
                    { key: "member" as AssignType,        label: "GQM Member",    icon: <Users size={13} /> },
                    { key: "subcontractor" as AssignType, label: "Subcontractor", icon: <Building2 size={13} /> },
                  ].map(opt => {
                    const active = assignType === opt.key
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleAssignTypeChange(opt.key)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          padding: "7px 14px",
                          border: `1.5px solid ${active ? "#059669" : "#E5E7EB"}`,
                          borderRadius: "9px",
                          background: active ? "#F0FDF4" : "#FAFAFA",
                          color: active ? "#059669" : "#6B7280",
                          fontSize: "12px", fontWeight: active ? 700 : 500,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    )
                  })}
                </div>

                {/* Member select */}
                {assignType === "member" && (
                  <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "14px" }}>
                    <FieldLabel>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <Users size={12} color="#059669" /> Select GQM Member
                      </span>
                    </FieldLabel>
                    {loadingMembers ? (
                      <div style={{ fontSize: "13px", color: "#9CA3AF", display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                        <div className="animate-spin" style={{ width: "14px", height: "14px", border: "2px solid #E5E7EB", borderTopColor: "#059669", borderRadius: "50%" }} />
                        Loading members...
                      </div>
                    ) : (
                      <Select value={formData.ID_Member} onValueChange={v => handleFieldChange("ID_Member", v)}>
                        <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                          <SelectValue placeholder="Select a GQM member..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}><span style={{ color: "#9CA3AF" }}>— No member —</span></SelectItem>
                          {allMembers.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#0B2E1E", color: "#fff", fontSize: "9px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {initials(m.name)}
                                </span>
                                <span>
                                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                                  {m.role && <span style={{ color: "#9CA3AF", marginLeft: "6px", fontSize: "11px" }}>{m.role}</span>}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Subcontractor select */}
                {assignType === "subcontractor" && (
                  <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <FieldLabel>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <Building2 size={12} color="#059669" /> Select Subcontractor
                        </span>
                      </FieldLabel>
                      {jobSubcontractors.length === 0 ? (
                        <div style={{ padding: "10px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "9px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={13} color="#D97706" /> No subcontractors linked to this job.
                        </div>
                      ) : (
                        <Select
                          value={formData.ID_Subcontractor}
                          onValueChange={v => { handleFieldChange("ID_Subcontractor", v); handleFieldChange("ID_Technician", NONE) }}
                        >
                          <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                            <SelectValue placeholder="Select a subcontractor..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}><span style={{ color: "#9CA3AF" }}>— No subcontractor —</span></SelectItem>
                            {jobSubcontractors.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                <span style={{ fontWeight: 500 }}>{s.org || s.name}</span>
                                {s.org && s.name !== s.org && <span style={{ color: "#9CA3AF", marginLeft: "6px", fontSize: "11px" }}>{s.name}</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {selectedSubc && selectedSubc.technicians.length > 0 && (
                      <div>
                        <FieldLabel>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <Wrench size={12} color="#9CA3AF" /> Technician
                            <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span>
                          </span>
                        </FieldLabel>
                        <Select value={formData.ID_Technician} onValueChange={v => handleFieldChange("ID_Technician", v)}>
                          <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                            <SelectValue placeholder="Select a technician..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}><span style={{ color: "#9CA3AF" }}>— No specific technician —</span></SelectItem>
                            {selectedSubc.technicians.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* View mode assignment */
              <div style={{
                padding: "14px 16px",
                background: "#FAFAFA",
                border: "1px solid #F3F4F6",
                borderRadius: "12px",
              }}>
                {assignType === "member" && fromForm(formData.ID_Member) ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #0B2E1E, #1A5C3A)",
                      color: "#fff", fontSize: "13px", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {initials(memberName)}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{memberName}</div>
                      {memberDisplay?.role && (
                        <div style={{ fontSize: "12px", color: "#059669", fontWeight: 500, marginTop: "1px" }}>
                          {memberDisplay.role}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Users size={10} /> GQM Member · {fromForm(formData.ID_Member)}
                      </div>
                    </div>
                  </div>
                ) : assignType === "subcontractor" && (fromForm(formData.ID_Subcontractor) || fromForm(formData.ID_Technician)) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {fromForm(formData.ID_Subcontractor) && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
                          background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Building2 size={20} color="#6B7280" />
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                            {subcDisplay?.org || subcDisplay?.name || fromForm(formData.ID_Subcontractor)}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Building2 size={10} /> Subcontractor · {fromForm(formData.ID_Subcontractor)}
                          </div>
                        </div>
                      </div>
                    )}
                    {fromForm(formData.ID_Technician) && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingLeft: fromForm(formData.ID_Subcontractor) ? "14px" : "0", borderLeft: fromForm(formData.ID_Subcontractor) ? "2px solid #E5E7EB" : "none" }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                          background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Wrench size={16} color="#6B7280" />
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                            {techName || fromForm(formData.ID_Technician)}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Wrench size={10} /> Technician · {fromForm(formData.ID_Technician)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "13px" }}>
                    <UserCheck size={15} />
                    <span style={{ fontStyle: "italic" }}>Unassigned</span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-7"
            style={{ borderTop: "1px solid #F3F4F6", background: "#FAFAFA" }}
          >
            {/* Delete button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || isSaving}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", border: "1.5px solid #FECACA", borderRadius: "9px",
                background: "#FEF2F2", color: "#DC2626", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Trash2 size={13} /> Delete Task
            </button>

            {/* Edit / Save-Cancel */}
            <div className="flex flex-wrap gap-2">
              {isEditMode ? (
                <>
                  <button
                    onClick={resetForm}
                    disabled={isSaving}
                    style={{
                      padding: "8px 18px", border: "1.5px solid #E5E7EB", borderRadius: "9px",
                      background: "#fff", color: "#6B7280", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving || editedFields.size === 0}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "7px",
                      padding: "8px 20px",
                      background: (isSaving || editedFields.size === 0)
                        ? "#9CA3AF"
                        : "linear-gradient(135deg, #0B2E1E 0%, #1A5C3A 100%)",
                      color: "#fff", border: "none", borderRadius: "9px",
                      fontSize: "13px", fontWeight: 700,
                      cursor: (isSaving || editedFields.size === 0) ? "not-allowed" : "pointer",
                      boxShadow: (isSaving || editedFields.size === 0) ? "none" : "0 2px 8px rgba(11,46,30,0.3)",
                    }}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin" style={{ width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%" }} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={13} /> Save Changes
                        {editedFields.size > 0 && (
                          <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0 6px", fontSize: "11px" }}>
                            {editedFields.size}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditMode(true)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 18px", border: "1.5px solid #D1D5DB", borderRadius: "9px",
                    background: "#fff", color: "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <Pencil size={13} /> Edit Task
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{task?.Name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting…" : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
