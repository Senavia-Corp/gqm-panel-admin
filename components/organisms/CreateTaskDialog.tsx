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
  AlertTriangle,
} from "lucide-react"
import { useTranslations } from "@/components/providers/LocaleProvider"

// Sentinel — never pass "" to Radix Select
const NONE = "__none__"

type AssignType = "none" | "member" | "subcontractor"

export interface TaskPrefill {
  name?: string
  priority?: string
  minDate?: string
  maxDate?: string
  businessDays?: number
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobData: any
  onTaskCreated: () => void
  prefill?: TaskPrefill
  isRecommended?: boolean
  defaultSubcId?: string  // Pre-selects this subcontractor and sets assignType to "subcontractor"
  userRole?: string
  userSubId?: string | null
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

export function CreateTaskDialog({
  open,
  onOpenChange,
  jobId,
  jobData,
  onTaskCreated,
  prefill,
  isRecommended,
  defaultSubcId,
  userRole,
  userSubId,
}: CreateTaskDialogProps) {
  const t = useTranslations("jobTasks")
  const [formData, setFormData] = useState(INITIAL_FORM())
  const [assignType, setAssignType] = useState<AssignType>("none")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allMembers, setAllMembers] = useState<{ id: string; name: string; role: string }[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  // Si la carga falla, la lista quedaba vacía y en silencio: indistinguible de
  // «no hay miembros». Guardamos el fallo para poder decirlo y reintentar.
  const [membersError, setMembersError] = useState(false)
  const [reintentoMiembros, setReintentoMiembros] = useState(0)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  // Initialize form (applying prefill if provided) whenever the dialog opens
  useEffect(() => {
    if (open) {
      const base = INITIAL_FORM()
      const isSub = userRole === "SUBCONTRACTOR"
      const subcId = isSub ? userSubId : defaultSubcId
      const subcOverride = subcId ? { ID_Subcontractor: subcId } : {}
      if (prefill) {
        setFormData({
          ...base,
          Name: prefill.name ?? base.Name,
          Priority: prefill.priority ?? base.Priority,
          Designation_date: prefill.minDate ?? base.Designation_date,
          ...subcOverride,
        })
      } else {
        setFormData({ ...base, ...subcOverride })
      }
      setAssignType(subcId ? "subcontractor" : "none")
      setError(null)
      setFocusedField(null)
      setShowConfirmClose(false)
    }
  }, [open])

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
    // Un subcontratista no puede asignar a un miembro de GQM: las pestañas de
    // asignación no se le pintan y `/api/members` le responde 403. Pedir el
    // roster interno completo era ruido y un intento de lectura que no le toca.
    if (userRole === "SUBCONTRACTOR") {
      setAllMembers([])
      setMembersError(false)
      setLoadingMembers(false)
      return
    }
    let cancelado = false
    setLoadingMembers(true)
    setMembersError(false)
    apiFetch("/api/members?page=1&limit=200")
      .then(async r => {
        if (!r.ok) throw new Error(`members ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelado) return
        const results: any[] = data?.results ?? data?.items ?? (Array.isArray(data) ? data : [])
        setAllMembers(results.map(m => ({
          id: m.ID_Member,
          name: m.Member_Name || m.Acc_Rep || m.name || m.ID_Member,
          role: m.Company_Role || "",
        })))
      })
      .catch(e => {
        if (cancelado) return
        console.error("[tareas] no se pudieron cargar los miembros", e)
        setAllMembers([])
        setMembersError(true)
      })
      .finally(() => { if (!cancelado) setLoadingMembers(false) })
    return () => { cancelado = true }
  }, [open, reintentoMiembros, userRole])

  function nullable(v: string): string | null {
    return v === NONE || v === "" ? null : v
  }

  function reset() {
    setFormData(INITIAL_FORM())
    setAssignType("none")
    setError(null)
    setFocusedField(null)
    setShowConfirmClose(false)
  }

  // Intercepts close attempts — shows confirmation if isRecommended
  function handleAttemptClose() {
    if (isRecommended) {
      setShowConfirmClose(true)
    } else {
      reset()
      onOpenChange(false)
    }
  }

  function handleConfirmClose() {
    setShowConfirmClose(false)
    reset()
    onOpenChange(false)
  }

  const handleAssignTypeChange = (type: AssignType) => {
    setAssignType(type)
    setFormData(p => ({ ...p, ID_Member: NONE, ID_Subcontractor: NONE, ID_Technician: NONE }))
  }

  const handleSubmit = async () => {
    if (!formData.Name.trim()) { setError(t("taskName") + " is required"); return }
    setLoading(true); setError(null)

    try {
      const payload = {
        Name:             formData.Name.trim(),
        Task_description: formData.Task_description || null,
        Task_status:      formData.Task_status,
        Priority:         nullable(formData.Priority),
        Designation_date: formData.Designation_date || null,
        Delivery_date:    formData.Delivery_date    || null,
        ID_Jobs:          jobId || null,
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
      setError(e.message ?? t("failedToSave"))
    } finally {
      setLoading(false)
    }
  }

  const selectedSubc = jobSubcontractors.find(s => s.id === formData.ID_Subcontractor)

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) handleAttemptClose() }}>
        <DialogContent
          showCloseButton={false}
          className="p-0 overflow-hidden gap-0 flex flex-col"
          style={{ maxWidth: "680px", width: "95vw", borderRadius: "16px", maxHeight: "92vh", border: "none" }}
        >
          <VisuallyHidden><DialogTitle>{t("createTaskTitle")}</DialogTitle></VisuallyHidden>
          {/* ── Header ────────────────────────────────────────────────────────── */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-7 sm:py-5"
            style={{ background: "linear-gradient(135deg, #0B2E1E 0%, #1A5C3A 100%)" }}
          >
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
                  {t("createTaskTitle")}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", margin: "2px 0 0" }}>
                  {jobId}
                </p>
              </div>
            </div>
            <button
              onClick={handleAttemptClose}
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

          {/* ── Recommended banner ────────────────────────────────────────────── */}
          {isRecommended && (
            <div
              className="flex shrink-0 items-center gap-2 px-4 py-2.5 sm:px-7"
              style={{ background: "#FFFBEB", borderBottom: "1px solid #FDE68A" }}
            >
              <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#92400E", fontWeight: 500 }}>
                {t("recommendedTaskBanner")}
              </span>
            </div>
          )}

          {/* ── Body ──────────────────────────────────────────────────────────── */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6">

            {/* Section 1 — Task Details */}
            <SectionHeader icon={<ClipboardList size={13} />} label="Task Details" />

            <div style={{ marginBottom: "14px" }}>
              <FieldLabel>
                {t("taskName")} <span style={{ color: "#EF4444" }}>*</span>
              </FieldLabel>
              <input
                type="text"
                placeholder={t("nameHint")}
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
                  <AlignLeft size={12} color="#9CA3AF" /> {t("description")}
                </span>
              </FieldLabel>
              <textarea
                placeholder={t("descHint")}
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
            <SectionHeader icon={<Flag size={13} />} label={t("classification")} />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* Status */}
              <div>
                <FieldLabel>{t("status")}</FieldLabel>
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
                        <span>{t("notStarted")}</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="Work-in-progress">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                        <Clock size={12} color="#D97706" />
                        <span>{t("inProgress")}</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="Completed">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                        <CheckCircle2 size={12} color="#16A34A" />
                        <span>{t("completed")}</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <FieldLabel>{t("priority")}</FieldLabel>
                <Select
                  value={formData.Priority}
                  onValueChange={v => setFormData(p => ({ ...p, Priority: v }))}
                >
                  <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px" }}>
                    <SelectValue placeholder={t("noPriority")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("noPriority")}</SelectItem>
                    <SelectItem value="High">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", display: "inline-block", flexShrink: 0 }} />
                        <span>{t("high")}</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B", display: "inline-block", flexShrink: 0 }} />
                        <span>{t("medium")}</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="Low">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3B82F6", display: "inline-block", flexShrink: 0 }} />
                        <span>{t("low")}</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Divider />

            {/* Section 3 — Timeline */}
            <SectionHeader icon={<Calendar size={13} />} label={t("timeline")} />

            {prefill?.minDate && prefill?.maxDate && (
              <div style={{
                marginBottom: "12px",
                padding: "8px 12px",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#1D4ED8",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}>
                <Calendar size={12} style={{ flexShrink: 0 }} />
                {t("datesLimitHint", { count: prefill.businessDays ?? 5, min: prefill.minDate, max: prefill.maxDate })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <FieldLabel>{t("startDate")}</FieldLabel>
                <input
                  type="date"
                  value={formData.Designation_date}
                  min={prefill?.minDate}
                  max={prefill?.maxDate}
                  onChange={e => setFormData(p => ({ ...p, Designation_date: e.target.value }))}
                  style={inputStyle(focusedField === "start")}
                  onFocus={() => setFocusedField("start")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
              <div>
                <FieldLabel>{t("deliveryDate")}</FieldLabel>
                <input
                  type="date"
                  value={formData.Delivery_date}
                  min={prefill?.minDate}
                  max={prefill?.maxDate}
                  onChange={e => setFormData(p => ({ ...p, Delivery_date: e.target.value }))}
                  style={inputStyle(focusedField === "delivery")}
                  onFocus={() => setFocusedField("delivery")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            <Divider />

            {/* Section 4 — Assignment */}
            <SectionHeader icon={<UserCheck size={13} />} label={t("assignment")} />

            {/* Assignment type tabs */}
            {userRole !== "SUBCONTRACTOR" && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                {[
                  { key: "none" as AssignType,          label: t("unassignedType"),     icon: <Circle size={13} /> },
                  { key: "member" as AssignType,        label: t("gqmMember"),     icon: <Users size={13} /> },
                  { key: "subcontractor" as AssignType, label: t("subcontractor"),  icon: <Building2 size={13} /> },
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
            )}

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
                    <Users size={12} color="#059669" /> {t("selectMember")}
                  </span>
                </FieldLabel>
                {membersError ? (
                  <div style={{ fontSize: "13px", color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "9px", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span>{t("membersLoadFailed")}</span>
                    <button
                      type="button"
                      onClick={() => setReintentoMiembros(n => n + 1)}
                      style={{ border: "1px solid #FECACA", background: "#fff", color: "#B91C1C", borderRadius: "7px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {t("retry")}
                    </button>
                  </div>
                ) : loadingMembers ? (
                  <div style={{ fontSize: "13px", color: "#9CA3AF", padding: "10px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="animate-spin" style={{ width: "14px", height: "14px", border: "2px solid #E5E7EB", borderTopColor: "#059669", borderRadius: "50%" }} />
                    {t("loadingMembers")}
                  </div>
                ) : (
                  <Select
                    value={formData.ID_Member}
                    onValueChange={v => setFormData(p => ({ ...p, ID_Member: v }))}
                  >
                    <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                      <SelectValue placeholder={t("selectMember")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>
                        <span style={{ color: "#9CA3AF" }}>{t("noMember")}</span>
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
                      <Building2 size={12} color="#059669" /> {t("selectSubcontractor")}
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
                      {t("noSubcontractorsLinkedLong")}
                    </div>
                  ) : (
                    <Select
                      value={formData.ID_Subcontractor}
                      onValueChange={v => setFormData(p => ({ ...p, ID_Subcontractor: v, ID_Technician: NONE }))}
                      disabled={userRole === "SUBCONTRACTOR"}
                    >
                      <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: userRole === "SUBCONTRACTOR" ? "#F3F4F6" : "#fff" }}>
                        <SelectValue placeholder={t("selectSubcontractor")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          <span style={{ color: "#9CA3AF" }}>{t("noSubcontractor")}</span>
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
                        <Wrench size={12} color="#9CA3AF" /> {t("selectTechnician")}
                        <span style={{ fontWeight: 400, color: "#9CA3AF" }}>({t("skip")})</span>
                      </span>
                    </FieldLabel>
                    <Select
                      value={formData.ID_Technician}
                      onValueChange={v => setFormData(p => ({ ...p, ID_Technician: v }))}
                    >
                      <SelectTrigger style={{ borderRadius: "9px", fontSize: "13px", height: "40px", background: "#fff" }}>
                        <SelectValue placeholder={t("selectTechnician")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          <span style={{ color: "#9CA3AF" }}>{t("noSpecificTechnician")}</span>
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
          <div
            className="flex shrink-0 flex-wrap justify-end gap-2.5 px-4 py-3 sm:px-7"
            style={{ borderTop: "1px solid #F3F4F6", background: "#FAFAFA" }}
          >
            <button
              onClick={handleAttemptClose}
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
              {t("cancel")}
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
                  {t("creating")}
                </>
              ) : (
                <>
                  <ClipboardList size={14} />
                  {t("createTask")}
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm-close dialog (shown only when isRecommended) ──────────────── */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent
          showCloseButton={false}
          className="p-0 overflow-hidden gap-0"
          style={{ maxWidth: "420px", width: "92vw", borderRadius: "14px", border: "none" }}
        >
          <VisuallyHidden><DialogTitle>{t("confirmDeleteTitle")}</DialogTitle></VisuallyHidden>
          <div style={{ padding: "28px 28px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div style={{
                width: "42px", height: "42px", flexShrink: 0,
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertTriangle size={20} color="#D97706" />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
                  {t("skipTaskCreationTitle")}
                </h3>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
                  {t("skipTaskCreationDesc")}
                </p>
              </div>
            </div>
          </div>
          <div style={{
            padding: "20px 28px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}>
            <button
              onClick={() => setShowConfirmClose(false)}
              style={{
                padding: "9px 20px",
                border: "1.5px solid #E5E7EB",
                borderRadius: "9px",
                background: "#fff",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("goBack")}
            </button>
            <button
              onClick={handleConfirmClose}
              style={{
                padding: "9px 20px",
                background: "#EF4444",
                color: "#fff",
                border: "none",
                borderRadius: "9px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("exitAnyway")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
