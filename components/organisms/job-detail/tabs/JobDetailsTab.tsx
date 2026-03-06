"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClientSelect } from "@/components/organisms/ClientSelect"
import type { UserRole } from "@/lib/types"

type Props = {
  role: UserRole
  job: any
  clients: any[]
  statusOptionsByJobType: Record<string, string[]>

  onFieldChange: (field: string, value: any) => void
  isFieldChanged: (field: string) => boolean
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

function changedClass(changed: boolean) {
  return changed ? "border-yellow-400 border-2" : ""
}

export function JobDetailsTab({
  role,
  job,
  clients,
  statusOptionsByJobType,
  onFieldChange,
  isFieldChanged,
}: Props) {
  const isTech = role === "LEAD_TECHNICIAN"

  // Core
  const idJobs = pick<string>(job, ["ID_Jobs", "idJobs", "jobId"], "")
  const jobType = pick<string>(job, ["jobType", "Job_type"], "")
  const status = pick<string>(job, ["status", "Job_status"], "")

  // QID-only / shared-ish
  const serviceType = pick<string>(job, ["serviceType", "Service_type"], "")
  const projectName = pick<string>(job, ["projectName", "Project_name"], "")
  const projectLocation = pick<string>(job, ["projectLocation", "Project_location"], "")
  const poWtnWo = pick<string>(job, ["poWtnWo", "Po_wtn_wo"], "")

  // Dates / timeline (shared among all 3 per your spec)
  const dateAssigned = toDateInputValue(pick<any>(job, ["dateAssigned", "Date_assigned"], ""))
  const estimatedStartDate = toDateInputValue(pick<any>(job, ["estimatedStartDate", "Estimated_start_date"], ""))
  const dateReceived = toDateInputValue(pick<any>(job, ["dateReceived", "Date_Received"], ""))
  const estimatedCompletionDate = toDateInputValue(
    pick<any>(job, ["estimatedCompletionDate", "Estimated_completion_date"], "")
  )

  const estimatedProjectDuration = pick<any>(job, ["Estimated_project_duration", "estimatedDuration"], "")

  // Details (shared among all 3)
  const additionalDetail = pick<string>(job, ["additionalDetail", "Additional_detail"], "")

  // PTL-only
  const ptlSuperintendent = pick<string>(job, ["ptlSuperintendent", "Ptl_Superintendent"], "")
  const ptlPropertyId = pick<string>(job, ["ptlPropertyId", "Ptl_property_id"], "")

  // Client (select)
  const currentClientId =
    job?.ID_Client ??
    job?.client?.ID_Client ??
    job?.client?.id ??
    ""

  const isQID = jobType === "QID"
  const isPTL = jobType === "PTL"
  const isPAR = jobType === "PAR"

  // ---- UI blocks ------------------------------------------------------------

  const JobCharacteristicsCard = (
    <Card>
      <CardHeader>
        <CardTitle>Job Characteristics</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="idJobs" className="mb-2 block">
              Job ID <span className="text-xs text-muted-foreground">(Non-editable)</span>
            </Label>
            <Input id="idJobs" value={idJobs ?? ""} disabled />
          </div>

          <div>
            <Label htmlFor="jobType" className="mb-2 block">
              Job Type <span className="text-xs text-muted-foreground">(Non-editable)</span>
            </Label>
            <Input id="jobType" value={jobType ?? ""} disabled />
          </div>

          <div>
            <Label htmlFor="status" className="mb-2 block">
              Status
            </Label>

            {isTech ? (
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <p className="text-sm">{status || "—"}</p>
              </div>
            ) : (
              <Select value={status} onValueChange={(value) => onFieldChange("status", value)}>
                <SelectTrigger className={changedClass(isFieldChanged("status"))}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {jobType &&
                    statusOptionsByJobType[jobType]?.map((s: string) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* ✅ Service Type only for QID (per your spec) */}
        {isQID && (
          <div>
            <Label htmlFor="serviceType" className="mb-2 block">
              Service Type
            </Label>

            {isTech ? (
              <Input id="serviceType" value={serviceType ?? ""} disabled />
            ) : (
              <Input
                id="serviceType"
                value={serviceType ?? ""}
                onChange={(e) => onFieldChange("serviceType", e.target.value)}
                className={changedClass(isFieldChanged("serviceType"))}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const WorkInformationCard = (
    <Card>
      <CardHeader>
        <CardTitle>Work Information</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ✅ QID: Project Name */}
        {isQID && (
          <div>
            <Label htmlFor="projectName" className="mb-2 block">
              Project Name
            </Label>

            {isTech ? (
              <Input id="projectName" value={projectName ?? ""} disabled />
            ) : (
              <Input
                id="projectName"
                value={projectName ?? ""}
                onChange={(e) => onFieldChange("projectName", e.target.value)}
                className={changedClass(isFieldChanged("projectName"))}
              />
            )}
          </div>
        )}

        {/* ✅ QID + PTL: Project Location */}
        {(isQID || isPTL) && (
          <div>
            <Label htmlFor="projectLocation" className="mb-2 block">
              Project Location
            </Label>

            {isTech ? (
              <Textarea id="projectLocation" value={projectLocation ?? ""} disabled rows={2} />
            ) : (
              <Textarea
                id="projectLocation"
                value={projectLocation ?? ""}
                onChange={(e) => onFieldChange("projectLocation", e.target.value)}
                className={changedClass(isFieldChanged("projectLocation"))}
                rows={2}
              />
            )}
          </div>
        )}

        {/* ✅ QID + PAR: PO/WTN/WO# */}
        {(isQID || isPAR) && (
          <div>
            <Label htmlFor="poWtnWo" className="mb-2 block">
              PO/WTN/WO#
            </Label>

            {isTech ? (
              <Input id="poWtnWo" value={poWtnWo ?? ""} disabled />
            ) : (
              <Input
                id="poWtnWo"
                value={poWtnWo ?? ""}
                onChange={(e) => onFieldChange("poWtnWo", e.target.value)}
                className={changedClass(isFieldChanged("poWtnWo"))}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const TimelineCard = (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="dateAssigned" className="mb-2 block">
              Date Assigned
            </Label>

            {isTech ? (
              <Input id="dateAssigned" type="date" value={dateAssigned} disabled />
            ) : (
              <Input
                id="dateAssigned"
                type="date"
                value={dateAssigned}
                onChange={(e) => onFieldChange("dateAssigned", e.target.value)}
                className={changedClass(isFieldChanged("dateAssigned"))}
              />
            )}
          </div>

          <div>
            <Label htmlFor="estimatedStartDate" className="mb-2 block">
              Estimated Start Date
            </Label>

            {isTech ? (
              <Input id="estimatedStartDate" type="date" value={estimatedStartDate} disabled />
            ) : (
              <Input
                id="estimatedStartDate"
                type="date"
                value={estimatedStartDate}
                onChange={(e) => onFieldChange("estimatedStartDate", e.target.value)}
                className={changedClass(isFieldChanged("estimatedStartDate"))}
              />
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="estimatedDuration" className="mb-2 block">
            Estimated Project Duration (months)
          </Label>

          {isTech ? (
            <div className="py-2 text-base">
              {typeof estimatedProjectDuration === "string"
                ? estimatedProjectDuration.replace(" months", "").replace(" month", "") || "N/A"
                : estimatedProjectDuration ?? "N/A"}
            </div>
          ) : (
            <Input
              id="estimatedDuration"
              type="number"
              value={
                typeof estimatedProjectDuration === "string"
                  ? estimatedProjectDuration.replace(" months", "").replace(" month", "")
                  : estimatedProjectDuration ?? ""
              }
              onChange={(e) => onFieldChange("estimatedDuration", e.target.value)}
              className={changedClass(isFieldChanged("estimatedDuration"))}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="dateReceived" className="mb-2 block">
              Date Received
            </Label>

            {isTech ? (
              <Input id="dateReceived" type="date" value={dateReceived} disabled />
            ) : (
              <Input
                id="dateReceived"
                type="date"
                value={dateReceived}
                onChange={(e) => onFieldChange("dateReceived", e.target.value)}
                className={changedClass(isFieldChanged("dateReceived"))}
              />
            )}
          </div>

          <div>
            <Label htmlFor="estimatedCompletionDate" className="mb-2 block">
              Estimated Completion Date
            </Label>

            {isTech ? (
              <Input id="estimatedCompletionDate" type="date" value={estimatedCompletionDate} disabled />
            ) : (
              <Input
                id="estimatedCompletionDate"
                type="date"
                value={estimatedCompletionDate}
                onChange={(e) => onFieldChange("estimatedCompletionDate", e.target.value)}
                className={changedClass(isFieldChanged("estimatedCompletionDate"))}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const AdditionalDetailsCard = (
    <Card>
      <CardHeader>
        <CardTitle>Additional Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="additionalDetail" className="mb-2 block">
          Additional Detail
        </Label>

        {isTech ? (
          <Textarea id="additionalDetail" value={additionalDetail ?? ""} disabled rows={4} />
        ) : (
          <Textarea
            id="additionalDetail"
            value={additionalDetail ?? ""}
            onChange={(e) => onFieldChange("additionalDetail", e.target.value)}
            className={changedClass(isFieldChanged("additionalDetail"))}
            rows={4}
          />
        )}
      </CardContent>
    </Card>
  )

  const PtlDetailsCard = isPTL ? (
    <Card>
      <CardHeader>
        <CardTitle>PTL Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ptlSuperintendent" className="mb-2 block">
              Superintendent
            </Label>

            {isTech ? (
              <Input id="ptlSuperintendent" value={ptlSuperintendent ?? ""} disabled />
            ) : (
              <Input
                id="ptlSuperintendent"
                value={ptlSuperintendent ?? ""}
                onChange={(e) => onFieldChange("ptlSuperintendent", e.target.value)}
                className={changedClass(isFieldChanged("ptlSuperintendent"))}
              />
            )}
          </div>

          <div>
            <Label htmlFor="ptlPropertyId" className="mb-2 block">
              Property ID
            </Label>

            {isTech ? (
              <Input id="ptlPropertyId" value={ptlPropertyId ?? ""} disabled />
            ) : (
              <Input
                id="ptlPropertyId"
                value={ptlPropertyId ?? ""}
                onChange={(e) => onFieldChange("ptlPropertyId", e.target.value)}
                className={changedClass(isFieldChanged("ptlPropertyId"))}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  ) : null

  const ClientCard =
    role !== "LEAD_TECHNICIAN" ? (
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="client" className="mb-2 block">
            Select Client
          </Label>

          <ClientSelect
            value={currentClientId || ""}
            initialClients={clients}
            onChange={(selected) => {
              console.log("[ClientSelect] selected ->", selected)
              if (!selected) {
                onFieldChange("client", null)
                onFieldChange("ID_Client", null) // ✅ clave
                return
              }

              onFieldChange("ID_Client", selected.id) // ✅ clave (esto es lo que guarda bien)
              onFieldChange("client", {
                ID_Client: selected.id, // opcional, solo para UI/compat
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
        </CardContent>
      </Card>
    ) : null

  return (
    <>

      {JobCharacteristicsCard}

      {/* ✅ Work Information varies by Job_type (QID/PTL/PAR rules) */}
      {WorkInformationCard}

      {/* ✅ Timeline shared among QID/PTL/PAR */}
      {TimelineCard}

      {/* ✅ Additional detail shared */}
      {AdditionalDetailsCard}

      {/* ✅ PTL-only extra fields */}
      {PtlDetailsCard}

      {/* ✅ Client selection for non-tech */}
      {ClientCard}
    </>
  )
}
