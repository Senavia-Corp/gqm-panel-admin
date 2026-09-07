"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Eye, ClipboardList } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Technician, Job } from "@/lib/types"
import { fetchJobs } from "@/lib/services/jobs-service"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { apiFetch } from "@/lib/apiFetch"

/** JobDTO (lo que devuelve el API) → la forma que pinta esta tabla.
 *
 * Existe para que el desajuste no vuelva a esconderse detrás de un `as any`:
 * las claves del API son `ID_Jobs`/`Project_name`/`Job_status`, las de la UI
 * son `id`/`projectName`/`status`. */
function deDTO(dto: any): Job {
  return {
    ...dto,
    id: dto?.ID_Jobs ?? dto?.id ?? "",
    projectName: dto?.Project_name ?? dto?.projectName ?? "",
    status: dto?.Job_status ?? dto?.status ?? "",
    client: {
      ...(dto?.client ?? {}),
      name: dto?.client?.Client_Community ?? dto?.client?.name ?? "",
    },
  } as Job
}

interface TechnicianJobsSectionProps {
  technician: Technician
}

export function TechnicianJobsSection({ technician }: TechnicianJobsSectionProps) {
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [assignSearchQuery, setAssignSearchQuery] = useState("")
  const [assignedJobIds, setAssignedJobIds] = useState<string[]>([])

  useEffect(() => {
    loadJobs()
  }, [])

  useEffect(() => {
    // Filter jobs based on search query
    if (searchQuery.trim() === "") {
      setFilteredJobs(jobs)
    } else {
      const query = searchQuery.toLowerCase()
      // U-13: `Job_status` es NULLABLE en la base de datos y `client` puede no
      // venir. Cualquiera de los cuatro `.toLowerCase()` sobre un valor
      // ausente tiraba la página entera con «Cannot read properties of
      // undefined (reading 'toLowerCase')». No se veía porque la ficha del
      // técnico nunca llegaba a cargar datos (pedía /api/technician/undefined),
      // así que este componente no se había ejecutado nunca con jobs de verdad.
      const texto = (v: unknown) => String(v ?? "").toLowerCase()
      setFilteredJobs(
        jobs.filter(
          (job) =>
            texto(job.id).includes(query) ||
            texto(job.projectName).includes(query) ||
            texto(job.client?.name).includes(query) ||
            texto(job.status).includes(query),
        ),
      )
    }
  }, [searchQuery, jobs])

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      // Esta sección no funcionaba para NINGÚN rol. Dos fallos encadenados:
      //
      //  1. los ids salían de `techData.subcontractor?.jobs`, es decir de los
      //     jobs del SUBCONTRATISTA, no de los que tiene asignados el técnico;
      //  2. se cruzaban con `fetchedJobs.filter(job => jobIds.includes(job.id))`
      //     y `fetchJobs` devuelve JobDTO —`ID_Jobs`, `Project_name`,
      //     `Job_status`, `client.Client_Community`—, así que `job.id` era
      //     `undefined` y `includes(undefined)` es SIEMPRE false.
      //
      // El `as any` de las tres asignaciones tapaba el desajuste de formas, y
      // el resultado medido era «No jobs found» con dos filas en
      // `job_technician`, y filas en blanco en el diálogo de asignación.
      //
      // Ahora se le pide al API los jobs DE ESTE TÉCNICO (`technicianId`, que
      // el API resuelve por `JobTechnicianLink`) y se mapea el DTO una sola vez.
      const [mios, todos] = await Promise.all([
        fetchJobs(1, 200, { technicianId: technician.ID_Technician } as any),
        fetchJobs(1, 200),
      ])

      const asignados = mios.jobs.map(deDTO)
      setAssignedJobIds(asignados.map((j) => j.id))
      setJobs(asignados)
      setFilteredJobs(asignados)
      setAvailableJobs(todos.jobs.map(deDTO))
    } catch (error) {
      console.error("[v0] Error loading jobs:", error)
      toast({
        title: t("error"),
        description: t("failedToLoadJobs"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (jobId: string) => {
    router.push(`/jobs/${jobId}`)
  }

  const handleViewTasks = (job: Job) => {
    // Navigate to technician tasks page for this job
    router.push(
      `/subcontractors/${technician.ID_Subcontractor}/technicians/${technician.ID_Technician}/jobs/${job.id}/tasks`,
    )
  }

  const handleAssignJob = async (job: Job) => {
    // Esto era un simulacro: `// In a real app, this would make an API call`,
    // un `console.log`, mutar el estado local y pintar un aviso de ÉXITO.
    // Medido: al pulsar «Assign» no salía ni una petición que no fuera GET, la
    // tabla `job_technician` no cambiaba, y la pantalla decía «Done — Job
    // undefined assigned to …».
    //
    // Mientras los avisos se escribían en una cola que nadie renderizaba el
    // fallo era mudo. Al arreglar esa cola (U-07) el no-op silencioso pasó a
    // ser una CONFIRMACIÓN FALSA, que es peor. El endpoint existe
    // (`POST /job_technician/jobs/<job>/technicians/<tec>`, protegido con
    // `job:create`), así que se llama de verdad: al administrador le funciona
    // y al rol de portal le sale el 403 honesto en lugar de un éxito inventado.
    try {
      const res = await apiFetch("/api/job-technician", {
        method: "POST",
        body: JSON.stringify({ jobId: job.id, technicianId: technician.ID_Technician }),
      })
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null)
        toast({
          title: t("error"),
          description: cuerpo?.detail || cuerpo?.error || t("failedToLoadJobs"),
          variant: "destructive",
        })
        return
      }
      setIsAssignDialogOpen(false)
      // La respuesta HTTP no es la verdad: se relee del servidor en vez de
      // apuntar el cambio en el estado local y darlo por hecho.
      await loadJobs()
      toast({
        title: t("success"),
        description: t("jobAssignedSuccess", { id: job.id, name: technician.Name }),
      })
    } catch (e) {
      toast({ title: t("error"), description: String(e), variant: "destructive" })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Assigned/P.Quote":
        return "bg-blue-500 hover:bg-blue-600"
      case "Waiting for Approval":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "Schedule/Work in Progress":
        return "bg-gqm-green hover:bg-gqm-green/90"
      case "Cancelled":
        return "bg-red-500 hover:bg-red-600"
      case "Completed P. INV/POs":
        return "bg-purple-500 hover:bg-purple-600"
      case "Invoiced":
        return "bg-green-600 hover:bg-green-700"
      case "HOLD":
        return "bg-orange-500 hover:bg-orange-600"
      case "PAID":
        return "bg-emerald-600 hover:bg-emerald-700"
      case "Warranty":
        return "bg-indigo-500 hover:bg-indigo-600"
      case "Archived":
        return "bg-gray-500 hover:bg-gray-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const filteredAvailableJobs = availableJobs.filter(
    (job) =>
      assignSearchQuery.trim() === "" ||
      // U-13: mismo motivo que arriba — status y client pueden faltar.
      String(job.id ?? "").toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      String(job.projectName ?? "").toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      String(job.client?.name ?? "").toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      String(job.status ?? "").toLowerCase().includes(assignSearchQuery.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("tabJobs")}</CardTitle>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gqm-green hover:bg-gqm-green/90 text-white">
                <Plus className="mr-2 h-4 w-4" />
                {t("assignNewJob")}
              </Button>
            </DialogTrigger>
            <DialogContent
              className="min-w-[1200px] w-[85vw] h-[85vh] max-h-[85vh] p-0 gap-0 flex flex-col"
              style={{ width: "85vw", minWidth: "1200px" }}
            >
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle className="text-xl">{t("assignJobTo", { name: technician.Name })}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6 pt-4">
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("searchJobsPlaceholder")}
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <div className="flex-1 overflow-auto rounded-lg border bg-white">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10">
                      <TableRow>
                        <TableHead className="pl-6 w-[140px] font-semibold">{t("jobId")}</TableHead>
                        <TableHead className="w-[32%] font-semibold">{t("jobName")}</TableHead>
                        <TableHead className="w-[24%] font-semibold">{t("client")}</TableHead>
                        <TableHead className="w-[28%] font-semibold">{t("status")}</TableHead>
                        <TableHead className="text-right pr-6 w-[120px] font-semibold">{t("action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAvailableJobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-base">
                            {t("noJobsFound")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAvailableJobs.map((job) => (
                          <TableRow key={job.id} className="hover:bg-muted/50 cursor-pointer">
                            <TableCell className="font-medium pl-6 text-base">{job.id}</TableCell>
                            <TableCell className="text-base">{job.projectName}</TableCell>
                            <TableCell className="text-base">{job.client?.name ?? "—"}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(job.status ?? "")} text-sm px-3 py-1`}>{job.status ? t(job.status.toLowerCase()) : t("noStatus")}</Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                size="sm"
                                onClick={() => handleAssignJob(job)}
                                className="bg-gqm-green hover:bg-gqm-green/90 text-white px-4 py-2"
                              >
                                {t("assign")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchJobs")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("jobId")}</TableHead>
                <TableHead>{t("jobName")}</TableHead>
                <TableHead>{t("client")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right pr-6">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("loadingJobs")}
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("noJobsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium pl-6">{job.id}</TableCell>
                    <TableCell>{job.projectName}</TableCell>
                    <TableCell>{job.client?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status ?? "")}>{job.status ? t(job.status.toLowerCase()) : t("noStatus")}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(job.id)}
                          title={t("viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewTasks(job)} title={t("viewTasks")}>
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
