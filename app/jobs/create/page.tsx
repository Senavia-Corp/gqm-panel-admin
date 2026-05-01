"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "@/components/providers/LocaleProvider"

import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

import { fetchClients, createJob } from "@/lib/services/jobs-service"
import type { JobType, JobStatus } from "@/lib/types"

import { ClientSelect } from "@/components/organisms/ClientSelect"

import {
  ArrowLeft,
  Save,
  Loader2,
  Link2,
  Briefcase,
  Info,
  CalendarDays,
  Users2,
} from "lucide-react"

const STATUS_OPTIONS_BY_JOB_TYPE: Record<JobType, JobStatus[]> = {
  QID: [
    "Assigned/P. Quote",
    "Waiting for Approval",
    "Scheduled / Work in Progress",
    "Cancelled",
    "Completed P. INV / POs",
    "Invoiced",
    "HOLD",
    "PAID",
    "Warranty",
  ],
  PTL: ["Received-Stand By", "Assigned-In progress", "Completed PVI", "Cancelled", "Paid"],
  PAR: ["In Progress", "Completed PVI / POs", "Invoiced", "PAID", "Cancelled"],
}

const PODIO_YEAR_OPTIONS = ["2026", "2025", "2024", "2023"]

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

export default function CreateJobPage() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations("jobs")
  const tCommon = useTranslations("common")

  const [mounted, setMounted]           = useState(false)
  const [user, setUser]                 = useState<any>(null)
  const [userLoading, setUserLoading]   = useState(true)

  const [clients, setClients]               = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  const [loading, setLoading]     = useState(false)
  const [syncPodio, setSyncPodio] = useState(false)
  const [yearSync, setYearSync]   = useState<string>("")

  const [formData, setFormData] = useState<{
    jobType: JobType | ""
    projectName: string
    projectLocation: string
    status: JobStatus | ""
    dateAssigned: string
    dateAssignedEnd: string
    estimatedStartDate: string
    estimatedStartDateEnd: string
    estimatedDuration: string
    dateReceived: string
    additionalDetail: string
    serviceType: string
    clientId: string
  }>({
    jobType: "",
    projectName: "",
    projectLocation: "",
    status: "",
    dateAssigned: "",
    dateAssignedEnd: "",
    estimatedStartDate: "",
    estimatedStartDateEnd: "",
    estimatedDuration: "",
    dateReceived: "",
    additionalDetail: "",
    serviceType: "",
    clientId: "",
  })

  const isDateAssignedRequired   = useMemo(() => formData.jobType === "QID" || formData.jobType === "PAR", [formData.jobType])
  const isEstimatedStartRequired = useMemo(() => formData.jobType === "PTL", [formData.jobType])

  useEffect(() => {
    setMounted(true)

    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }

    try {
      setUser(JSON.parse(userData))
      setUserLoading(false)
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
      return
    }

    fetchClients()
      .then((data) => {
        setClients(Array.isArray(data) ? data : [])
        setLoadingClients(false)
      })
      .catch((error) => {
        console.error("Error loading clients:", error)
        setClients([])
        setLoadingClients(false)
        toast({
          title: "Warning",
          description: t("noClientsWarning"),
          variant: "destructive",
        })
      })
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.jobType || !formData.status) {
      toast({ title: "Error", description: t("validationJobTypeStatus"), variant: "destructive" })
      return
    }

    if (isDateAssignedRequired && !formData.dateAssigned) {
      toast({ title: "Error", description: t("validationDateAssigned"), variant: "destructive" })
      return
    }

    if (isDateAssignedRequired && !formData.dateAssignedEnd) {
      toast({ title: "Error", description: t("validationDateAssignedEnd"), variant: "destructive" })
      return
    }

    if (isEstimatedStartRequired && !formData.estimatedStartDate) {
      toast({ title: "Error", description: t("validationEstimatedStart"), variant: "destructive" })
      return
    }

    if (isEstimatedStartRequired && !formData.estimatedStartDateEnd) {
      toast({ title: "Error", description: t("validationEstimatedStartEnd"), variant: "destructive" })
      return
    }

    if (syncPodio && !yearSync) {
      toast({ title: "Error", description: t("validationPodioYear"), variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const payload = {
        Job_type:                    formData.jobType,
        Job_status:                  formData.status,
        Project_name:                formData.projectName           || null,
        Project_location:            formData.projectLocation        || null,
        Date_assigned:               formData.dateAssigned           || null,
        Date_assigned_end:           formData.dateAssignedEnd        || null,
        Estimated_start_date:        formData.estimatedStartDate     || null,
        Estimated_start_date_end:    formData.estimatedStartDateEnd  || null,
        Estimated_project_duration:  formData.estimatedDuration      || null,
        Date_Received:               formData.dateReceived           || null,
        Additional_detail:           formData.additionalDetail       || null,
        Service_type:                formData.serviceType            || null,
        ID_Client:                   formData.clientId               || null,
      }

      const createdJob = await createJob(payload, {
        sync_podio: syncPodio,
        year: syncPodio && yearSync ? parseInt(yearSync, 10) : undefined,
      })

      toast({ title: "Success", description: `${t("jobCreatedSuccess")} (${createdJob?.ID_Jobs ?? "OK"})` })
      if (formData.jobType === "QID" && createdJob?.ID_Jobs) {
        router.push(`/jobs/${createdJob.ID_Jobs}?autoCreateTask=true`)
      } else {
        router.push("/jobs")
      }
    } catch (error) {
      console.error("Error creating job:", error)
      toast({ title: "Error", description: t("createError"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gqm-green-dark" />
          <p className="text-sm text-muted-foreground">{t("loadingPage")}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        <TopBar user={user} />

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t("createTitle")}</h1>
              <p className="text-muted-foreground">{t("createSubtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl space-y-6">

            {/* ── Podio Sync ────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                  {t("sectionPodioSync")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{t("syncThisJob")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("syncDesc")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="syncPodio" className="text-sm">
                      {syncPodio ? t("syncOn") : t("syncOff")}
                    </Label>
                    <Switch
                      id="syncPodio"
                      checked={syncPodio}
                      onCheckedChange={(val) => {
                        setSyncPodio(val)
                        if (!val) setYearSync("")
                      }}
                    />
                  </div>
                </div>

                {syncPodio && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Label htmlFor="yearSync" className="mb-2 block text-sm font-medium">
                      {t("podioYear")}{" "}
                      <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t("podioYearHint")}
                      </span>
                    </Label>
                    <Select value={yearSync} onValueChange={setYearSync}>
                      <SelectTrigger id="yearSync" className="w-[180px] bg-white">
                        <SelectValue placeholder={t("selectYear")} />
                      </SelectTrigger>
                      <SelectContent>
                        {PODIO_YEAR_OPTIONS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Job Characteristics ───────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  {t("sectionCharacteristics")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="jobType" className="mb-2 block">
                      {t("jobType")} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      required
                      value={formData.jobType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, jobType: value as JobType, status: "" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectJobType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QID">QID</SelectItem>
                        <SelectItem value="PTL">PTL</SelectItem>
                        <SelectItem value="PAR">PAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status" className="mb-2 block">
                      {tCommon("status")} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      required
                      value={formData.status}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as JobStatus }))}
                      disabled={!formData.jobType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.jobType ? t("selectStatus") : t("selectJobTypeFirst")} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.jobType
                          ? STATUS_OPTIONS_BY_JOB_TYPE[formData.jobType].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))
                          : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="serviceType" className="mb-2 block">{t("serviceType")}</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, serviceType: value }))}
                  >
                    <SelectTrigger id="serviceType">
                      <SelectValue placeholder={t("selectServiceType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ── General Information ───────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  {t("sectionGeneralInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="projectName" className="mb-2 block">{t("projectName")}</Label>
                  <Input
                    id="projectName"
                    placeholder={t("projectNamePlaceholder")}
                    value={formData.projectName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, projectName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="projectLocation" className="mb-2 block">{t("projectLocation")}</Label>
                  <Textarea
                    id="projectLocation"
                    placeholder={t("projectLocationPlaceholder")}
                    rows={2}
                    value={formData.projectLocation}
                    onChange={(e) => setFormData((prev) => ({ ...prev, projectLocation: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="additionalDetail" className="mb-2 block">{t("additionalDetail")}</Label>
                  <Textarea
                    id="additionalDetail"
                    placeholder={t("additionalDetailPlaceholder")}
                    rows={3}
                    value={formData.additionalDetail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, additionalDetail: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Project Timeline ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  {t("sectionTimeline")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Date Assigned + Date Assigned End */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="dateAssigned" className="mb-2 block">
                      {t("dateAssigned")}{" "}
                      {isDateAssignedRequired ? <span className="text-red-500">*</span> : null}
                      {formData.jobType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {isDateAssignedRequired ? t("requiredForQidPar") : t("optionalDate")}
                        </span>
                      )}
                    </Label>
                    <Input
                      id="dateAssigned"
                      type="date"
                      required={isDateAssignedRequired}
                      value={formData.dateAssigned}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dateAssigned: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateAssignedEnd" className="mb-2 block">
                      {t("dateAssignedEnd")}{" "}
                      {isDateAssignedRequired ? <span className="text-red-500">*</span> : null}
                      {formData.jobType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {isDateAssignedRequired ? t("requiredForQidPar") : t("optionalDate")}
                        </span>
                      )}
                    </Label>
                    <Input
                      id="dateAssignedEnd"
                      type="date"
                      required={isDateAssignedRequired}
                      value={formData.dateAssignedEnd}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dateAssignedEnd: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Estimated Start Date + Estimated Start Date End */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="estimatedStart" className="mb-2 block">
                      {t("estimatedStartDate")}{" "}
                      {isEstimatedStartRequired ? <span className="text-red-500">*</span> : null}
                      {formData.jobType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {isEstimatedStartRequired ? t("requiredForPtl") : t("optionalDate")}
                        </span>
                      )}
                    </Label>
                    <Input
                      id="estimatedStart"
                      type="date"
                      required={isEstimatedStartRequired}
                      value={formData.estimatedStartDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedStartDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimatedStartEnd" className="mb-2 block">
                      {t("estimatedStartDateEnd")}{" "}
                      {isEstimatedStartRequired ? <span className="text-red-500">*</span> : null}
                      {formData.jobType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {isEstimatedStartRequired ? t("requiredForPtl") : t("optionalDate")}
                        </span>
                      )}
                    </Label>
                    <Input
                      id="estimatedStartEnd"
                      type="date"
                      required={isEstimatedStartRequired}
                      value={formData.estimatedStartDateEnd}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedStartDateEnd: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Estimated Duration + Date Received */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="estimatedDuration" className="mb-2 block">
                      {t("estimatedDuration")}
                    </Label>
                    <Input
                      id="estimatedDuration"
                      placeholder={t("estimatedDurationPlaceholder")}
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedDuration: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateReceived" className="mb-2 block">{t("dateReceived")}</Label>
                    <Input
                      id="dateReceived"
                      type="date"
                      value={formData.dateReceived}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dateReceived: e.target.value }))}
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* ── Client Assignment ─────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-muted-foreground" />
                  {t("sectionClient")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client" className="mb-2 block">{t("client")}</Label>
                  {loadingClients ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("loadingClients")}
                    </div>
                  ) : (
                    <ClientSelect
                      value={formData.clientId || ""}
                      initialClients={clients}
                      onChange={(selected) =>
                        setFormData((prev) => ({ ...prev, clientId: selected?.id ?? "" }))
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Actions ───────────────────────────────────────────────── */}
            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-gqm-green-dark hover:bg-gqm-green"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("createJob")}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                {tCommon("cancel")}
              </Button>
            </div>

          </form>
        </main>
      </div>
    </div>
  )
}