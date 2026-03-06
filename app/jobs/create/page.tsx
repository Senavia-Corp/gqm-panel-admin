"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

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

// ✅ Reusar selector del Job Detail (buscador + paginación)
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

export default function CreateJobPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(true)

  // ✅ mantenemos initialClients para precargar y evitar “pantalla vacía”
  const [clients, setClients] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  const [loading, setLoading] = useState(false)
  const [syncPodio, setSyncPodio] = useState(false)

  const [formData, setFormData] = useState<{
    jobType: JobType | ""
    projectName: string
    projectLocation: string
    status: JobStatus | ""
    dateAssigned: string
    estimatedStartDate: string
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
    estimatedStartDate: "",
    estimatedDuration: "",
    dateReceived: "",
    additionalDetail: "",
    serviceType: "",
    clientId: "",
  })

  // ✅ Required condicional según Job Type
  const isDateAssignedRequired = useMemo(() => formData.jobType === "QID" || formData.jobType === "PAR", [formData.jobType])
  const isEstimatedStartRequired = useMemo(() => formData.jobType === "PTL", [formData.jobType])

  useEffect(() => {
    setMounted(true)

    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }

    try {
      setUser(JSON.parse(userData))
      setUserLoading(false)
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
      return
    }

    // precarga (opcional) para que el ClientSelect abra con data inmediata
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
          description: "Could not load clients. You can still create a job without a client.",
          variant: "destructive",
        })
      })
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ obligatorios base
    if (!formData.jobType || !formData.status) {
      toast({
        title: "Error",
        description: "Job Type and Status are required.",
        variant: "destructive",
      })
      return
    }

    // ✅ obligatorios condicionales
    if (isDateAssignedRequired && !formData.dateAssigned) {
      toast({
        title: "Error",
        description: "Date Assigned is required for QID and PAR.",
        variant: "destructive",
      })
      return
    }

    if (isEstimatedStartRequired && !formData.estimatedStartDate) {
      toast({
        title: "Error",
        description: "Estimated Start Date is required for PTL.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const payload = {
        Job_type: formData.jobType,
        Job_status: formData.status,

        Project_name: formData.projectName || null,
        Project_location: formData.projectLocation || null,
        Date_assigned: formData.dateAssigned || null,
        Estimated_start_date: formData.estimatedStartDate || null,
        Estimated_project_duration: formData.estimatedDuration || null,
        Date_Received: formData.dateReceived || null,
        Additional_detail: formData.additionalDetail || null,
        Service_type: formData.serviceType || null,
        ID_Client: formData.clientId || null,
      }

      const createdJob = await createJob(payload, { sync_podio: syncPodio })

      toast({
        title: "Success",
        description: `Job created successfully (${createdJob?.ID_Jobs ?? "OK"})`,
      })

      router.push("/jobs")
    } catch (error) {
      console.error("Error creating job:", error)
      toast({
        title: "Error",
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      })
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
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* ✅ min-h-0 + overflow-hidden para evitar “scroll fantasma” */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        <TopBar user={user} />

        {/* ✅ overscroll-contain evita que “se pase” y muestre blanco abajo */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create New Job</h1>
              <p className="text-muted-foreground">Fill in the details to create a new job</p>
            </div>
          </div>

          {/* ✅ CENTRADO real */}
          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl space-y-6">
            {/* Sync Podio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                  Podio Sync
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Sync this Job to Podio</p>
                  <p className="text-sm text-muted-foreground">
                    If enabled, the backend will create the item in Podio and use Podio formatted ID for ID_Jobs.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="syncPodio" className="text-sm">
                    {syncPodio ? "ON" : "OFF"}
                  </Label>
                  <Switch id="syncPodio" checked={syncPodio} onCheckedChange={setSyncPodio} />
                </div>
              </CardContent>
            </Card>

            {/* Job Characteristics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  Job Characteristics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="jobType" className="mb-2 block">
                      Job Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      required
                      value={formData.jobType}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          jobType: value as JobType,
                          status: "",
                          // opcional: si cambian de tipo, no forzar limpiar fechas
                          // dateAssigned: "",
                          // estimatedStartDate: "",
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
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
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      required
                      value={formData.status}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as JobStatus }))}
                      disabled={!formData.jobType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.jobType ? "Select status" : "Select job type first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.jobType
                          ? STATUS_OPTIONS_BY_JOB_TYPE[formData.jobType].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))
                          : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="serviceType" className="mb-2 block">
                    Service Type
                  </Label>
                  <Input
                    id="serviceType"
                    placeholder="e.g., Roof Repair"
                    value={formData.serviceType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serviceType: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* General Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="projectName" className="mb-2 block">
                    Project Name
                  </Label>
                  <Input
                    id="projectName"
                    placeholder="Enter project name"
                    value={formData.projectName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, projectName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="projectLocation" className="mb-2 block">
                    Project Location
                  </Label>
                  <Textarea
                    id="projectLocation"
                    placeholder="Enter full address"
                    rows={2}
                    value={formData.projectLocation}
                    onChange={(e) => setFormData((prev) => ({ ...prev, projectLocation: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="additionalDetail" className="mb-2 block">
                    Additional Detail
                  </Label>
                  <Textarea
                    id="additionalDetail"
                    placeholder="Any extra notes..."
                    rows={3}
                    value={formData.additionalDetail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, additionalDetail: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Project Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  Project Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="dateAssigned" className="mb-2 block">
                      Date Assigned {isDateAssignedRequired ? <span className="text-red-500">*</span> : null}
                      {formData.jobType ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {isDateAssignedRequired ? "(required for QID/PAR)" : "(optional)"}
                        </span>
                      ) : null}
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
                    <Label htmlFor="estimatedStart" className="mb-2 block">
                      Estimated Start Date {isEstimatedStartRequired ? <span className="text-red-500">*</span> : null}
                      {formData.jobType ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {isEstimatedStartRequired ? "(required for PTL)" : "(optional)"}
                        </span>
                      ) : null}
                    </Label>
                    <Input
                      id="estimatedStart"
                      type="date"
                      required={isEstimatedStartRequired}
                      value={formData.estimatedStartDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedStartDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="estimatedDuration" className="mb-2 block">
                      Estimated Project Duration
                    </Label>
                    <Input
                      id="estimatedDuration"
                      placeholder="e.g., 3 months"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedDuration: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateReceived" className="mb-2 block">
                      Date Received
                    </Label>
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

            {/* Client Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-muted-foreground" />
                  Client Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client" className="mb-2 block">
                    Client
                  </Label>

                  {loadingClients ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading clients...
                    </div>
                  ) : (
                    <ClientSelect
                      value={formData.clientId || ""}
                      initialClients={clients}
                      onChange={(selected) => {
                        setFormData((prev) => ({ ...prev, clientId: selected?.id ?? "" }))
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" className="bg-gqm-green-dark hover:bg-gqm-green" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Job
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}