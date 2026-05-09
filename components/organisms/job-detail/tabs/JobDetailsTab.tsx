"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClientCard } from "@/components/organisms/ClientCard"
import { ClientSelect } from "@/components/organisms/ClientSelect"
// NOTE: Make sure ClientSelect is the new version that uses /api/clients/table
import { BuildingDeptSection } from "@/components/organisms/job-detail/BuildingDeptSection"
import type { UserRole } from "@/lib/types"
import {
  Briefcase, MapPin, FileText, Calendar, Clock,
  Info, Building2, Tag, AlertCircle, CheckCircle2, Hash,
} from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { useTranslations } from "@/components/providers/LocaleProvider"

type Props = {
  role: UserRole
  job: any
  clients: any[]
  statusOptionsByJobType: Record<string, string[]>
  onFieldChange: (field: string, value: any) => void
  isFieldChanged: (field: string) => boolean
  readOnly?: boolean
  patch?: (updates: Record<string, any>, opts?: { sync_podio?: boolean }) => Promise<void>
  isSaving?: boolean
}

function pick<T = any>(obj: any, keys: string[], fallback: T): T {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null) return v as T
  }
  return fallback
}

function toDateInputValue(value: any): string {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = String(d.getUTCFullYear())
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const JOB_TYPE_COLORS: Record<string, string> = {
  QID: "bg-violet-50 text-violet-700 border-violet-200",
  PTL: "bg-sky-50 text-sky-700 border-sky-200",
  PAR: "bg-amber-50 text-amber-700 border-amber-200",
}

const STATUS_COLORS: Record<string, string> = {
  "Assigned/P. Quote": "bg-blue-50 text-blue-700 border-blue-200",
  "Waiting for Approval": "bg-amber-50 text-amber-700 border-amber-200",
  "Scheduled / Work in Progress": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Completed P. INV / POs": "bg-teal-50 text-teal-700 border-teal-200",
  Invoiced: "bg-indigo-50 text-indigo-700 border-indigo-200",
  HOLD: "bg-orange-50 text-orange-700 border-orange-200",
  PAID: "bg-green-50 text-green-700 border-green-200",
  Warranty: "bg-purple-50 text-purple-700 border-purple-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Archived: "bg-slate-100 text-slate-500 border-slate-200",
  // PTL
  "Received-Stand By": "bg-slate-100 text-slate-600 border-slate-200",
  "Assigned-In progress": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Completed PVI": "bg-teal-50 text-teal-700 border-teal-200",
  Paid: "bg-green-50 text-green-700 border-green-200",
  // PAR
  "In Progress": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Completed PVI / POs": "bg-teal-50 text-teal-700 border-teal-200",
}

// ── Helper components ─────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
      {children}
    </label>
  )
}

function ReadonlyField({ value }: { value: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 min-h-[38px] break-words">
      {value || <span className="text-slate-300">—</span>}
    </div>
  )
}

function EditableInput({
  value,
  onChange,
  changed,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  changed?: boolean
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`text-sm transition-all ${changed
            ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300 focus:ring-amber-400"
            : "border-slate-200 bg-slate-50 focus:bg-white"
          }`}
      />
      {changed && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        </span>
      )}
    </div>
  )
}

function EditableTextarea({
  value,
  onChange,
  changed,
  placeholder,
  rows = 3,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  changed?: boolean
  placeholder?: string
  rows?: number
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`text-sm transition-all resize-y ${changed
            ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300 focus:ring-amber-400"
            : "border-slate-200 bg-slate-50 focus:bg-white"
          }`}
      />
      {changed && (
        <span className="absolute right-2.5 top-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        </span>
      )}
    </div>
  )
}

const SERVICE_TYPE_OPTIONS = [
  "Appliances",
  "Cabinets/Countertops",
  "Drywall",
  "Discoloration",
  "Driveways & sidewalks",
  "Doors/Windows/Siding",
  "Electrical/Lighting",
  "Flooring",
  "Garage/Garage Door",
  "General Maintenance",
  "Landscape/Irrigation",
  "Masonry/Fencing/Gates",
  "Paint",
  "Plumbing",
  "Violations - City / HOA",
  "Showers / Tub",
  "Stucco / Exterior",
  "Violations",
  "Roof Service/Repair",
  "Interior Remodel",
]

export function JobDetailsTab({
  role,
  job,
  clients,
  statusOptionsByJobType,
  onFieldChange,
  isFieldChanged,
  readOnly = false,
  patch,
  isSaving = false,
}: Props) {
  const isTech = role === "LEAD_TECHNICIAN"
  
  // Base readOnly coming from prop
  // isRestrictedReadOnly is for fields that tech CANNOT edit
  const isRestrictedReadOnly = readOnly || isTech 
  // isActuallyReadOnly is for fields that tech CAN edit (Status, Additional Details)
  const isActuallyReadOnly = readOnly

  const { hasPermission } = usePermissions()
  const canReadClients = hasPermission("client:read")
  const t = useTranslations("jobs")

  // Field values
  const idJobs = pick<string>(job, ["ID_Jobs", "idJobs", "jobId"], "")
  const jobType = pick<string>(job, ["jobType", "Job_type"], "")
  const status = pick<string>(job, ["status", "Job_status"], "")
  const serviceType = pick<string>(job, ["serviceType", "Service_type"], "")
  const projectName = pick<string>(job, ["projectName", "Project_name"], "")
  const projectLocation = pick<string>(job, ["projectLocation", "Project_location"], "")
  const poWtnWo = pick<string>(job, ["poWtnWo", "Po_wtn_wo"], "")
  const dateAssigned = toDateInputValue(pick<any>(job, ["dateAssigned", "Date_assigned"], ""))
  const estimatedStartDate = toDateInputValue(pick<any>(job, ["estimatedStartDate", "Estimated_start_date"], ""))
  const dateReceived = toDateInputValue(pick<any>(job, ["dateReceived", "Date_Received"], ""))
  const estimatedCompletionDate = toDateInputValue(pick<any>(job, ["estimatedCompletionDate", "Estimated_completion_date"], ""))
  const estimatedProjectDuration = pick<any>(job, ["Estimated_project_duration", "estimatedDuration"], "")
  const additionalDetail = pick<string>(job, ["additionalDetail", "Additional_detail"], "")
  const ptlSuperintendent = pick<string>(job, ["ptlSuperintendent", "Ptl_Superintendent"], "")
  const ptlPropertyId = pick<string>(job, ["ptlPropertyId", "Ptl_property_id"], "")
  const currentClientId = job?.ID_Client ?? job?.client?.ID_Client ?? job?.client?.id ?? ""

  const isQID = jobType === "QID"
  const isPTL = jobType === "PTL"
  const isPAR = jobType === "PAR"

  const jobTypeColor = JOB_TYPE_COLORS[jobType] ?? "bg-slate-100 text-slate-600 border-slate-200"
  const statusColor = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-500 border-slate-200"

  const durationRaw =
    typeof estimatedProjectDuration === "string"
      ? estimatedProjectDuration.replace(/ months?/i, "")
      : String(estimatedProjectDuration ?? "")

  return (
    <div className="space-y-4">

      {/* ── 1. Client ─────────────────────────────────────────────────── */}
      <SectionCard icon={Building2} title={t("detailSectionClient")}>
        <ClientSelect
          value={currentClientId || ""}
          initialClients={clients}
          changed={isFieldChanged("ID_Client") || isFieldChanged("client")}
          disabled={isRestrictedReadOnly || !canReadClients}
          onChange={(selected) => {
            if (isRestrictedReadOnly) return
            if (!selected) {
              onFieldChange("client", null)
              onFieldChange("ID_Client", null)
              return
            }
            onFieldChange("ID_Client", selected.id)
            onFieldChange("client", {
              ID_Client: selected.id,
              id: selected.id,
              name: selected.name,
              companyName: selected.companyName,
              email: selected.email,
              phone: selected.phone,
              address: selected.address,
              avatar: selected.avatar,
              status: selected.status,
            })
          }}
        />
      </SectionCard>

      {/* ── 2. Job Characteristics ─────────────────────────────────────── */}
      <SectionCard icon={Hash} title={t("detailSectionCharacteristics")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Job ID */}
          <div>
            <FieldLabel>{t("detailFieldJobId")}</FieldLabel>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <span className="font-mono text-sm font-bold text-slate-700">{idJobs || "—"}</span>
              <span className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${jobTypeColor}`}>
                {jobType || "—"}
              </span>
            </div>
          </div>

          {/* Job Type (display only) */}
          <div>
            <FieldLabel>{t("detailFieldJobType")}</FieldLabel>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700">{jobType || "—"}</span>
            </div>
          </div>

          {/* Status */}
          <div>
            <FieldLabel>{t("detailFieldStatus")}</FieldLabel>
            {isActuallyReadOnly ? (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${statusColor}`}>
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm font-medium">{status || "—"}</span>
              </div>
            ) : (
              <Select value={status} onValueChange={(v) => onFieldChange("status", v)}>
                <SelectTrigger className={`text-sm transition-all ${isFieldChanged("status")
                    ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300"
                    : "border-slate-200 bg-slate-50"
                  }`}>
                  <SelectValue placeholder={t("detailPlaceholderStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {jobType && statusOptionsByJobType[jobType]?.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Service Type — QID only */}
        {isQID && (
          <div>
            <FieldLabel>{t("detailFieldServiceType")}</FieldLabel>
            {isRestrictedReadOnly ? (
              <ReadonlyField value={serviceType} />
            ) : (
              <Select value={serviceType} onValueChange={(v) => onFieldChange("serviceType", v)}>
                <SelectTrigger className={`text-sm transition-all ${isFieldChanged("serviceType")
                    ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300"
                    : "border-slate-200 bg-slate-50"
                  }`}>
                  <SelectValue placeholder={t("detailPlaceholderServiceType")} />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── 3. Work Information ────────────────────────────────────────── */}
      {(isQID || isPTL || isPAR) && (
        <SectionCard icon={FileText} title={t("detailSectionWorkInfo")}>
          {/* Project Name — QID only */}
          {isQID && (
            <div>
              <FieldLabel>{t("detailFieldProjectName")}</FieldLabel>
              {isRestrictedReadOnly ? (
                <ReadonlyField value={projectName} />
              ) : (
                <EditableInput
                  value={projectName}
                  onChange={(v) => onFieldChange("projectName", v)}
                  changed={isFieldChanged("projectName")}
                  placeholder={t("detailPlaceholderProjectName")}
                />
              )}
            </div>
          )}

          {/* Project Location — QID + PTL */}
          {(isQID || isPTL) && (
            <div>
              <FieldLabel>{t("detailFieldProjectLocation")}</FieldLabel>
              {isRestrictedReadOnly ? (
                <ReadonlyField value={projectLocation} />
              ) : (
                <EditableTextarea
                  value={projectLocation}
                  onChange={(v) => onFieldChange("projectLocation", v)}
                  changed={isFieldChanged("projectLocation")}
                  placeholder={t("detailPlaceholderProjectLocation")}
                  rows={2}
                />
              )}
            </div>
          )}

          {/* PO/WTN/WO# — QID + PAR */}
          {(isQID || isPAR) && (
            <div>
              <FieldLabel>{t("detailFieldPoWtnWo")}</FieldLabel>
              {isRestrictedReadOnly ? (
                <ReadonlyField value={poWtnWo} />
              ) : (
                <EditableInput
                  value={poWtnWo}
                  onChange={(v) => onFieldChange("poWtnWo", v)}
                  changed={isFieldChanged("poWtnWo")}
                  placeholder={t("detailPlaceholderPoWtnWo")}
                />
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── 4. Timeline ────────────────────────────────────────────────── */}
      <SectionCard icon={Calendar} title={t("detailSectionTimeline")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>{t("detailFieldDateAssigned")}</FieldLabel>
            {isRestrictedReadOnly ? (
              <ReadonlyField value={dateAssigned} />
            ) : (
              <EditableInput
                type="date"
                value={dateAssigned}
                onChange={(v) => onFieldChange("dateAssigned", v)}
                changed={isFieldChanged("dateAssigned")}
              />
            )}
          </div>

          <div>
            <FieldLabel>{t("detailFieldEstStartDate")}</FieldLabel>
            {isRestrictedReadOnly ? (
              <ReadonlyField value={estimatedStartDate} />
            ) : (
              <EditableInput
                type="date"
                value={estimatedStartDate}
                onChange={(v) => onFieldChange("estimatedStartDate", v)}
                changed={isFieldChanged("estimatedStartDate")}
              />
            )}
          </div>
        </div>

        <div>
          <FieldLabel>{t("detailFieldEstDuration")}</FieldLabel>
          {isRestrictedReadOnly ? (
            <ReadonlyField value={durationRaw || "—"} />
          ) : (
            <EditableInput
              type="number"
              value={durationRaw}
              onChange={(v) => onFieldChange("estimatedDuration", v)}
              changed={isFieldChanged("estimatedDuration")}
              placeholder={t("detailPlaceholderDuration")}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>{t("detailFieldDateReceived")}</FieldLabel>
            {isRestrictedReadOnly ? (
              <ReadonlyField value={dateReceived} />
            ) : (
              <EditableInput
                type="date"
                value={dateReceived}
                onChange={(v) => onFieldChange("dateReceived", v)}
                changed={isFieldChanged("dateReceived")}
              />
            )}
          </div>

          <div>
            <FieldLabel>{t("detailFieldEstCompletionDate")}</FieldLabel>
            {isRestrictedReadOnly ? (
              <ReadonlyField value={estimatedCompletionDate} />
            ) : (
              <EditableInput
                type="date"
                value={estimatedCompletionDate}
                onChange={(v) => onFieldChange("estimatedCompletionDate", v)}
                changed={isFieldChanged("estimatedCompletionDate")}
              />
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── 5. Building Department ────────────────────────────────────── */}
      {patch ? (
        <BuildingDeptSection
          job={job}
          isReadOnly={isRestrictedReadOnly}
          patch={patch}
          isSaving={isSaving}
          role={role}
        />
      ) : null}

      {/* ── 6. Additional Details ──────────────────────────────────────── */}
      <SectionCard icon={Info} title={t("detailSectionAdditional")}>
        {isActuallyReadOnly ? (
          <ReadonlyField value={additionalDetail} />
        ) : (
          <EditableTextarea
            value={additionalDetail}
            onChange={(v) => onFieldChange("additionalDetail", v)}
            changed={isFieldChanged("additionalDetail")}
            placeholder={t("detailPlaceholderAdditional")}
            rows={4}
          />
        )}
      </SectionCard>

      {/* ── 6. PTL Details ────────────────────────────────────────────── */}
      {isPTL && (
        <SectionCard icon={Tag} title={t("detailSectionPtl")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>{t("detailFieldSuperintendent")}</FieldLabel>
              {isRestrictedReadOnly ? (
                <ReadonlyField value={ptlSuperintendent} />
              ) : (
                <EditableInput
                  value={ptlSuperintendent}
                  onChange={(v) => onFieldChange("ptlSuperintendent", v)}
                  changed={isFieldChanged("ptlSuperintendent")}
                  placeholder={t("detailPlaceholderSuperintendent")}
                />
              )}
            </div>
            <div>
              <FieldLabel>{t("detailFieldPropertyId")}</FieldLabel>
              {isRestrictedReadOnly ? (
                <ReadonlyField value={ptlPropertyId} />
              ) : (
                <EditableInput
                  value={ptlPropertyId}
                  onChange={(v) => onFieldChange("ptlPropertyId", v)}
                  changed={isFieldChanged("ptlPropertyId")}
                  placeholder={t("detailPlaceholderPropertyId")}
                />
              )}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}