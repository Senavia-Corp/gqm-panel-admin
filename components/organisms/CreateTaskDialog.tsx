"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/apiFetch"
import {
  ClipboardList,
  AlignLeft,
  Flag,
  Calendar,
  UserCheck,
  Users,
  Building2,
  Wrench,
  CheckCircle2,
  Circle,
  Clock,
  X,
} from "lucide-react"

// Sentinel — never pass "" to Radix Select
const NONE = "__none__"

type AssignType = "none" | "member" | "subcontractor"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobData: any
  onTaskCreated: () => void
}

const INITIAL_FORM = () => ({
  Name: "",
  Task_description: "",
  Task_status: "Not started",
  Priority: NONE,
  Designation_date: new Date().toISOString().split("T")[0],
  Delivery_date: "",
  ID_Technician: NONE,
  ID_Member: NONE,
  ID_Subcontractor: NONE,
})

// ── Shared style helpers ───────────────────────────────────────────────────────

const inputStyle = (active = false): React.CSSProperties => ({
  width: "100%",
  padding: "10px 14px",
  border: `1.5px solid ${active ? "#059669" : "#E5E7EB"}`,
  borderRadius: "9px",
  fontSize: "13px",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
  background: "#fff",
})

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
      <div style={{ color: "#059669", display: "flex", alignItems: "center" }}>{icon}</div>
      <span style={{
        fontSize: "11px",
        fontWeight: 700,
        color: "#9CA3AF",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
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
    <label style={{
      fontSize: "12px",
      fontWeight: 600,
      color: "#374151",
      display: "block",
      marginBottom: "6px",
      letterSpacing: "0.01em",
    }}>
      {children}
    </label>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateTaskDialog({ open, onOpenChange, jobId, jobData, onTaskCreated }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState(INITIAL_FORM())
  const [assignType, setAssignType] = useState<AssignType>("none")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allMembers, setAllMembers] = useState<{ id: string; name: string; role: string }[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Strips {"value"} JSON-artifact formatting that some org names have in the DB
  function cleanOrgName(raw: string | null | undefined): string {
    if (!raw) return ""
    const match = /^\{"(.+)"\}$/.exec(raw.trim())
    return match ? match[1] : raw
  }

  // Subcontractors linked to this job
  const jobSubcontractors: { id: string; name: string; org: string; technicians: { id: string; name: string }[] }[] =
    jobData?.subcontractors?.map((sub: any) => ({
      id: sub.ID_Subcontractor,
      name: cleanOrgName(sub.Name) || sub.ID_Subcontractor,
      org: cleanOrgName(sub.Organization),
      technicians: sub.technicians?.map((t: any) => ({
        id: t.ID_Technician,
        name: t.Name || t.ID_Technician,
      })) ?? [],
    })) ?? []

  // Fetch all GQM members when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingMembers(true)
    apiFetch("/api/members?page=1&limit=200")
      .then(r => r.json())
      .then(data => {
        const results: any[] = data?.results ?? data?.items ?? (Array.isArray(data) ? data : [])
        setAllMembers(results.map(m => ({
          id: m.ID_Member,
          name: m.Member_Name || m.Acc_Rep || m.name || m.ID_Member,
          role: m.Company_Role || "",
        })))
      })
      .catch(() => setAllMembers([]))
      .finally(() => setLoadingMembers(false))
  }, [open])

  function nullable(v: string): string | null {
    return v === NONE || v === "" ? null : v
  }

  function reset() {
    setFormData(INITIAL_FORM())
    setAssignType("none")
    setError(null)
    setFocusedField(null)
  }

  const handleAssignTypeChange = (type: AssignType) => {
    setAssignType(type)
    setFormData(p => ({ ...p, ID_Member: NONE, ID_Subcontractor: NONE, ID_Technician: NONE }))
  }

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
        ID_Jobs:          jobId,
        ID_Member:        assignType === "member"        ? nullable(formData.ID_Member)        : null,
        ID_Subcontractor: assignType === "subcontractor" ? nullable(formData.ID_Subcontractor) : null,
        ID_Technician:    assignType === "subcontractor" ? nullable(formData.ID_Technician)    : null,
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

  const selectedSubc = jobSubcontractors.find(s => s.id === formData.ID_Subcontractor)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent
        showCloseButton={false}
        className="p-0 overflow-hidden gap-0 flex flex-col"
        style={{ maxWidth: "680px", width: "95vw", borderRadius: "16px", maxHeight: "92vh", border: "none" }}
      >
        <VisuallyHidden><DialogTitle>Create New Task</DialogTitle></VisuallyHidden>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0B2E1E 0%, #1A5C3A 100%)",
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "44px", height: "44px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "11px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <ClipboardList size={22} color="white" />
            </div>
            <div>
              <h2 style={{ color: "#fff", fontSize: "17px", fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                Create New Task
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", margin: "2px 0 0" }}>
                {jobId}
              </p>
            </div>
          </div>
          <button
            onClick={() => { reset(); onOpenChange(false) }}
            style={{
              width: "32px", height: "32px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.7)",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div style={{
          padding: "24px 28px",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}>

          {/* Section 1 — Task Details */}
          <SectionHeader icon={<ClipboardList size={13} />} label="Task Details" />

          <div style={{ marginBottom: "14px" }}>
            <FieldLabel>
              Task Name <span style={{ color: "#EF4444" }}>*</span>
            </FieldLabel>
            <input
              type="text"
              placeholder="Enter a clear, descriptive task name..."
              value={formData.Name}
              onChange={e => setFormData(p => ({ ...p, Name: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit() }}
              style={inputStyle(focusedField === "name" || !!formData.Name)}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div>
            <FieldLabel>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <AlignLeft size={12} color="#9CA3AF" /> Description
              </span>
            </FieldLabel>
            <textarea
              placeholder="Provide details about what needs to be done..."
              value={formData.Task_description}
              onChange={e => setFormData(p => ({ ...p, Task_description: e.target.value }))}
              rows={3}
              style={{
                ...inputStyle(focusedField === "desc"),
                resize: "vertical",
              }}
              onFocus={() => setFocusedField("desc")}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <Divider />

          {/* Section 2 — Classification */}
          <SectionHeader icon={<Flag size={13} />} label="Classification" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {/* Status */}
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={formData.Task_status}
                onValueChange={v => setFormData(p => ({ ...p, Task_status: v }))}
              >
                <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not started">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <Circle size={12} color="#9CA3AF" />
                      <span>Not Started</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="Work-in-progress">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <Clock size={12} color="#D97706" />
                      <span>In Progress</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="Completed">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <CheckCircle2 size={12} color="#16A34A" />
                      <span>Completed</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={formData.Priority}
                onValueChange={v => setFormData(p => ({ ...p, Priority: v }))}
              >
                <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px" }}>
                  <SelectValue placeholder="No priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No priority</SelectItem>
                  <SelectItem value="High">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", display: "inline-block", flexShrink: 0 }} />
                      <span>High</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="Medium">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B", display: "inline-block", flexShrink: 0 }} />
                      <span>Medium</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="Low">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3B82F6", display: "inline-block", flexShrink: 0 }} />
                      <span>Low</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Divider />

          {/* Section 3 — Timeline */}
          <SectionHeader icon={<Calendar size={13} />} label="Timeline" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <input
                type="date"
                value={formData.Designation_date}
                onChange={e => setFormData(p => ({ ...p, Designation_date: e.target.value }))}
                style={inputStyle(focusedField === "start")}
                onFocus={() => setFocusedField("start")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <FieldLabel>Delivery Date</FieldLabel>
              <input
                type="date"
                value={formData.Delivery_date}
                onChange={e => setFormData(p => ({ ...p, Delivery_date: e.target.value }))}
                style={inputStyle(focusedField === "delivery")}
                onFocus={() => setFocusedField("delivery")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>

          <Divider />

          {/* Section 4 — Assignment */}
          <SectionHeader icon={<UserCheck size={13} />} label="Assignment" />

          {/* Assignment type tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {[
              { key: "none" as AssignType,          label: "Unassigned",     icon: <Circle size={13} /> },
              { key: "member" as AssignType,        label: "GQM Member",     icon: <Users size={13} /> },
              { key: "subcontractor" as AssignType, label: "Subcontractor",  icon: <Building2 size={13} /> },
            ].map(opt => {
              const active = assignType === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => handleAssignTypeChange(opt.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    border: `1.5px solid ${active ? "#059669" : "#E5E7EB"}`,
                    borderRadius: "9px",
                    background: active ? "#F0FDF4" : "#FAFAFA",
                    color: active ? "#059669" : "#6B7280",
                    fontSize: "12px",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Member select — all DB members */}
          {assignType === "member" && (
            <div style={{
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <FieldLabel>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Users size={12} color="#059669" /> Select GQM Member
                </span>
              </FieldLabel>
              {loadingMembers ? (
                <div style={{ fontSize: "13px", color: "#9CA3AF", padding: "10px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="animate-spin" style={{ width: "14px", height: "14px", border: "2px solid #E5E7EB", borderTopColor: "#059669", borderRadius: "50%" }} />
                  Loading members...
                </div>
              ) : (
                <Select
                  value={formData.ID_Member}
                  onValueChange={v => setFormData(p => ({ ...p, ID_Member: v }))}
                >
                  <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                    <SelectValue placeholder="Select a GQM member..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span style={{ color: "#9CA3AF" }}>— No member —</span>
                    </SelectItem>
                    {allMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            width: "24px", height: "24px",
                            borderRadius: "50%",
                            background: "#0B2E1E",
                            color: "#fff",
                            fontSize: "9px",
                            fontWeight: 700,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            {(m.name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                          </span>
                          <span>
                            <span style={{ fontWeight: 500 }}>{m.name}</span>
                            {m.role && (
                              <span style={{ color: "#9CA3AF", marginLeft: "6px", fontSize: "11px" }}>
                                {m.role}
                              </span>
                            )}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Subcontractor select — job-linked subcontractors */}
          {assignType === "subcontractor" && (
            <div style={{
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}>
              <div>
                <FieldLabel>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Building2 size={12} color="#059669" /> Select Subcontractor
                  </span>
                </FieldLabel>
                {jobSubcontractors.length === 0 ? (
                  <div style={{
                    padding: "12px 14px",
                    background: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: "9px",
                    fontSize: "13px",
                    color: "#92400E",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <Building2 size={14} color="#D97706" />
                    No subcontractors are linked to this job yet.
                  </div>
                ) : (
                  <Select
                    value={formData.ID_Subcontractor}
                    onValueChange={v => setFormData(p => ({ ...p, ID_Subcontractor: v, ID_Technician: NONE }))}
                  >
                    <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                      <SelectValue placeholder="Select a subcontractor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>
                        <span style={{ color: "#9CA3AF" }}>— No subcontractor —</span>
                      </SelectItem>
                      {jobSubcontractors.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span>
                            <span style={{ fontWeight: 500 }}>{s.org || s.name}</span>
                            {s.org && s.name && s.org !== s.name && (
                              <span style={{ color: "#9CA3AF", marginLeft: "6px", fontSize: "11px" }}>
                                {s.name}
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Technician sub-select (only when a subcontractor is selected and has technicians) */}
              {selectedSubc && selectedSubc.technicians.length > 0 && (
                <div>
                  <FieldLabel>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Wrench size={12} color="#9CA3AF" /> Assign Technician
                      <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span>
                    </span>
                  </FieldLabel>
                  <Select
                    value={formData.ID_Technician}
                    onValueChange={v => setFormData(p => ({ ...p, ID_Technician: v }))}
                  >
                    <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                      <SelectValue placeholder="Select a technician..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>
                        <span style={{ color: "#9CA3AF" }}>— No specific technician —</span>
                      </SelectItem>
                      {selectedSubc.technicians.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              marginTop: "16px",
              padding: "10px 14px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "9px",
              fontSize: "13px",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div style={{
          padding: "14px 28px",
          borderTop: "1px solid #F3F4F6",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          background: "#FAFAFA",
          flexShrink: 0,
        }}>
          <button
            onClick={() => { reset(); onOpenChange(false) }}
            disabled={loading}
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
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "9px 22px",
              background: loading ? "#9CA3AF" : "linear-gradient(135deg, #0B2E1E 0%, #1A5C3A 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "9px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: loading ? "none" : "0 2px 8px rgba(11,46,30,0.3)",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? (
              <>
                <div
                  className="animate-spin"
                  style={{
                    width: "14px", height: "14px",
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                  }}
                />
                Creating...
              </>
            ) : (
              <>
                <ClipboardList size={14} />
                Create Task
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
