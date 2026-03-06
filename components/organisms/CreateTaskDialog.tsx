"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/apiFetch"

// Sentinel value used internally so Radix never receives an empty string.
// Converted to null before sending to the API.
const NONE = "__none__"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobData: any
  onTaskCreated: () => void
}

export function CreateTaskDialog({ open, onOpenChange, jobId, jobData, onTaskCreated }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState({
    Name:             "",
    Task_description: "",
    Task_status:      "Not started",
    Priority:         NONE,           // ← sentinel, not ""
    Designation_date: new Date().toISOString().split("T")[0],
    Delivery_date:    "",
    ID_Technician:    NONE,           // ← sentinel
    ID_Member:        NONE,           // ← sentinel
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Derived lists ──────────────────────────────────────────────────────────

  const technicians: { id: string; name: string }[] =
    jobData?.subcontractors?.flatMap(
      (sub: any) =>
        sub.technicians?.map((tech: any) => ({
          id:   tech.ID_Technician,
          name: tech.Name || tech.ID_Technician,
        })) ?? []
    ) ?? []

  const members: { id: string; name: string }[] =
    jobData?.members?.map((m: any) => ({
      id:   m.ID_Member,
      name: m.Member_Name || m.name || m.ID_Member,
    })) ?? []

  // ── Helpers ────────────────────────────────────────────────────────────────

  function nullable(v: string): string | null {
    return v === NONE || v === "" ? null : v
  }

  function reset() {
    setFormData({
      Name:             "",
      Task_description: "",
      Task_status:      "Not started",
      Priority:         NONE,
      Designation_date: new Date().toISOString().split("T")[0],
      Delivery_date:    "",
      ID_Technician:    NONE,
      ID_Member:        NONE,
    })
    setError(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.Name.trim()) { setError("Task name is required"); return }
    setLoading(true); setError(null)

    try {
      const payload = {
        Name:             formData.Name.trim(),
        Task_description: formData.Task_description || null,
        Task_status:      formData.Task_status,
        Priority:         nullable(formData.Priority),
        Designation_date: formData.Designation_date || null,
        Delivery_date:    formData.Delivery_date    || null,
        ID_Technician:    nullable(formData.ID_Technician),
        ID_Member:        nullable(formData.ID_Member),
        ID_Jobs:          jobId,
      }

      const res = await apiFetch("/api/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.detail || `Error ${res.status}`)
      }

      onTaskCreated()
      onOpenChange(false)
      reset()
    } catch (e: any) {
      setError(e.message ?? "Failed to create task")
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Task Name *</Label>
            <Input
              placeholder="Enter task name"
              value={formData.Name}
              onChange={e => setFormData(p => ({ ...p, Name: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Task description..."
              value={formData.Task_description}
              onChange={e => setFormData(p => ({ ...p, Task_description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={formData.Task_status}
                onValueChange={v => setFormData(p => ({ ...p, Task_status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not started">Not Started</SelectItem>
                  <SelectItem value="Work-in-progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={formData.Priority}
                onValueChange={v => setFormData(p => ({ ...p, Priority: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No priority</SelectItem>   {/* ✅ not "" */}
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Designation Date</Label>
              <Input
                type="date"
                value={formData.Designation_date}
                onChange={e => setFormData(p => ({ ...p, Designation_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input
                type="date"
                value={formData.Delivery_date}
                onChange={e => setFormData(p => ({ ...p, Delivery_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Technician */}
          {technicians.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign Technician</Label>
              <Select
                value={formData.ID_Technician}
                onValueChange={v => setFormData(p => ({ ...p, ID_Technician: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>           {/* ✅ not "" */}
                  {technicians.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Member — ✅ now iterates `members`, not `technicians` */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign Member</Label>
              <Select
                value={formData.ID_Member}
                onValueChange={v => setFormData(p => ({ ...p, ID_Member: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>           {/* ✅ not "" */}
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">⚠ {error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gqm-green hover:bg-gqm-green/90"
          >
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}