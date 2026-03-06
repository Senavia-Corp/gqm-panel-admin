"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, User, AlertCircle } from "lucide-react"
import type { Task } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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

// ── Sentinel — never pass "" to Radix Select ──────────────────────────────────
const NONE = "__none__"

function toForm(v: string | null | undefined): string {
  return v || NONE
}
function fromForm(v: string): string | null {
  return v === NONE ? null : v
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskDetailsDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (taskId: string) => void
  onSave: () => void
  technicians?: Array<{ id: string; name: string; type: string }>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "Not started",       label: "Not Started"    },
  { value: "Work-in-progress",  label: "In Progress"    },
  { value: "Completed",         label: "Completed"      },
]

const PRIORITY_OPTIONS = ["High", "Medium", "Low"]

const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  High:   { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  Medium: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  Low:    { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onDelete,
  onSave,
  technicians = [],
}: TaskDetailsDialogProps) {
  const [isEditMode,        setIsEditMode]        = useState(false)
  const [editedFields,      setEditedFields]      = useState<Set<string>>(new Set())
  const [isSaving,          setIsSaving]          = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting,        setIsDeleting]        = useState(false)
  const [saveError,         setSaveError]         = useState<string | null>(null)

  const [formData, setFormData] = useState({
    Name:             "",
    Task_description: "",
    Task_status:      "Not started",
    Priority:         NONE,
    Designation_date: "",
    Delivery_date:    "",
    ID_Technician:    NONE,
  })

  // Sync form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        Name:             task.Name             ?? "",
        Task_description: task.Task_description ?? "",
        Task_status:      task.Task_status      ?? "Not started",
        Priority:         toForm(task.Priority),
        Designation_date: (task.Designation_date as any) ?? "",
        Delivery_date:    (task.Delivery_date   as any) ?? "",
        ID_Technician:    toForm(task.ID_Technician),
      })
      setEditedFields(new Set())
      setIsEditMode(false)
      setSaveError(null)
    }
  }, [task])

  if (!task) return null

  // ── Helpers ──────────────────────────────────────────────────────────────

  function handleFieldChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setEditedFields(prev => new Set(prev).add(field))
  }

  function handleCancelEdit() {
    if (task) {
      setFormData({
        Name:             task.Name             ?? "",
        Task_description: task.Task_description ?? "",
        Task_status:      task.Task_status      ?? "Not started",
        Priority:         toForm(task.Priority),
        Designation_date: (task.Designation_date as any) ?? "",
        Delivery_date:    (task.Delivery_date   as any) ?? "",
        ID_Technician:    toForm(task.ID_Technician),
      })
    }
    setEditedFields(new Set())
    setIsEditMode(false)
    setSaveError(null)
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSaveChanges = async () => {
    if (editedFields.size === 0) { setIsEditMode(false); return }

    setIsSaving(true)
    setSaveError(null)

    try {
      // ✅ Use ID_Tasks as primary identifier — proxy routes to PATCH /tasks/<task_id>
      const updateData: Record<string, any> = {
        ID_Tasks: task.ID_Tasks,
      }

      editedFields.forEach(field => {
        const raw = formData[field as keyof typeof formData]
        // Convert sentinel → null for optional fields
        updateData[field] = (field === "Priority" || field === "ID_Technician")
          ? fromForm(raw)
          : raw || null
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
    // ✅ Use ID_Tasks — proxy accepts ?task_id= (primary) or ?podio_item_id= (legacy)
    const taskId = task.ID_Tasks
    if (!taskId) {
      setSaveError("Cannot delete: missing ID_Tasks")
      return
    }

    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/tasks?task_id=${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Error ${res.status}`)
      }

      setShowDeleteConfirm(false)
      onOpenChange(false)
      onSave()
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to delete task")
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const isEdited = (field: string) => editedFields.has(field)
  const pStyle   = PRIORITY_STYLE[fromForm(formData.Priority) ?? ""] ?? null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh]" style={{ width: "1400px", maxWidth: "95vw" }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold pr-8">{task.Name}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-6">

              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isEditMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                      Edit Task
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete Task
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving || editedFields.size === 0}
                      className="bg-gqm-green hover:bg-gqm-green/90"
                    >
                      {isSaving ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                      Cancel
                    </Button>
                    {editedFields.size > 0 && (
                      <span className="text-sm text-gray-500 self-center ml-1">
                        {editedFields.size} field{editedFields.size > 1 ? "s" : ""} edited
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Error banner */}
              {saveError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {saveError}
                </div>
              )}

              {/* Status · Priority · Technician */}
              <div className="grid grid-cols-3 gap-6">

                {/* Status */}
                <Card className={`p-6 ${isEdited("Task_status") ? "ring-2 ring-blue-500" : ""}`}>
                  <Label className="text-sm font-medium mb-4 block">Status</Label>
                  {isEditMode ? (
                    <Select
                      value={formData.Task_status}
                      onValueChange={v => handleFieldChange("Task_status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base font-medium">{formData.Task_status}</p>
                  )}
                </Card>

                {/* Priority */}
                <Card className={`p-6 ${isEdited("Priority") ? "ring-2 ring-blue-500" : ""}`}>
                  <Label className="text-sm font-medium mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Priority
                  </Label>
                  {isEditMode ? (
                    <Select
                      value={formData.Priority}
                      onValueChange={v => handleFieldChange("Priority", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No priority</SelectItem>  {/* ✅ not "" */}
                        {PRIORITY_OPTIONS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : pStyle ? (
                    <span style={{
                      fontSize: "12px", fontWeight: 700,
                      color: pStyle.color, background: pStyle.bg,
                      border: `1px solid ${pStyle.border}`,
                      borderRadius: "5px", padding: "2px 10px",
                    }}>
                      {fromForm(formData.Priority)}
                    </span>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No priority</p>
                  )}
                </Card>

                {/* Technician */}
                <Card className={`p-6 ${isEdited("ID_Technician") ? "ring-2 ring-blue-500" : ""}`}>
                  <Label className="text-sm font-medium mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" /> Assigned Technician
                  </Label>
                  {isEditMode && technicians.length > 0 ? (
                    <Select
                      value={formData.ID_Technician}
                      onValueChange={v => handleFieldChange("ID_Technician", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>     {/* ✅ not "" */}
                        {technicians.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base font-medium">
                      {fromForm(formData.ID_Technician)
                        ? `Technician: ${formData.ID_Technician}`
                        : "Not assigned"}
                    </p>
                  )}
                </Card>
              </div>

              {/* Name */}
              <Card className={`p-6 ${isEdited("Name") ? "ring-2 ring-blue-500" : ""}`}>
                <Label className="text-sm font-medium mb-4 block">Task Name</Label>
                {isEditMode ? (
                  <Input
                    value={formData.Name}
                    onChange={e => handleFieldChange("Name", e.target.value)}
                    className="text-base"
                  />
                ) : (
                  <p className="text-base font-medium">{formData.Name}</p>
                )}
              </Card>

              {/* Description */}
              <Card className={`p-6 ${isEdited("Task_description") ? "ring-2 ring-blue-500" : ""}`}>
                <Label className="text-sm font-medium mb-4 block">Description</Label>
                {isEditMode ? (
                  <Textarea
                    value={formData.Task_description}
                    onChange={e => handleFieldChange("Task_description", e.target.value)}
                    className="text-base min-h-[120px]"
                    placeholder="Enter task description"
                  />
                ) : (
                  <p className="text-base text-gray-700 leading-relaxed">
                    {formData.Task_description || "No description provided"}
                  </p>
                )}
              </Card>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-6">
                <Card className={`p-6 ${isEdited("Designation_date") ? "ring-2 ring-blue-500" : ""}`}>
                  <Label className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" /> Designation Date
                  </Label>
                  {isEditMode ? (
                    <Input
                      type="date"
                      value={formData.Designation_date ? String(formData.Designation_date).split("T")[0] : ""}
                      onChange={e => handleFieldChange("Designation_date", e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium">
                      {formData.Designation_date
                        ? new Date(formData.Designation_date).toLocaleDateString()
                        : "Not set"}
                    </p>
                  )}
                </Card>

                <Card className={`p-6 ${isEdited("Delivery_date") ? "ring-2 ring-blue-500" : ""}`}>
                  <Label className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Delivery Date
                  </Label>
                  {isEditMode ? (
                    <Input
                      type="date"
                      value={formData.Delivery_date ? String(formData.Delivery_date).split("T")[0] : ""}
                      onChange={e => handleFieldChange("Delivery_date", e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium">
                      {formData.Delivery_date
                        ? new Date(formData.Delivery_date).toLocaleDateString()
                        : "Not set"}
                    </p>
                  )}
                </Card>
              </div>

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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