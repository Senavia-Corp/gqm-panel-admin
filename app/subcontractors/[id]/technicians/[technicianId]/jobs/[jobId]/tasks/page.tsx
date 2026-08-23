"use client"

// REG-027: conectado al backend real (antes 100% mock).
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { apiFetch } from "@/lib/apiFetch"
import { fetchJobById } from "@/lib/services/jobs-service"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { use } from "react"
import { usePermissions } from "@/hooks/usePermissions"

interface ApiTask {
  ID_Tasks: string
  Name: string | null
  Task_description: string | null
  Task_status: string | null
  Designation_date: string | null
  Delivery_date: string | null
  Priority: string | null
  ID_Jobs: string | null
  ID_Technician: string | null
}

const TASK_STATUSES = [
  { value: "Not started", color: "bg-yellow-500 hover:bg-yellow-600" },
  { value: "Work-in-progress", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "Completed", color: "bg-green-500 hover:bg-green-600" },
]

function TechnicianTasksClient({
  params,
}: {
  params: { id: string; technicianId: string; jobId: string }
}) {
  const t = useTranslations("subcontractors")
  // T-16: esta página no tenía gating de ningún tipo: un técnico sin
  // tasks:create veía «Add Task», y el borrado no pedía confirmación.
  const { hasPermission } = usePermissions()
  const puedeCrear = hasPermission("tasks:create")
  const puedeBorrar = hasPermission("tasks:delete")
  const router = useRouter()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [loading, setLoading] = useState(true)
  const [jobName, setJobName] = useState("")
  const [selectedTask, setSelectedTask] = useState<ApiTask | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [editedTaskStatus, setEditedTaskStatus] = useState("")
  const [busy, setBusy] = useState(false)

  const loadTasks = async () => {
    setLoading(true)
    try {
      const resp = await apiFetch(
        `/api/tasks/job/${encodeURIComponent(params.jobId)}?tech_id=${encodeURIComponent(params.technicianId)}`,
      )
      const data = resp.ok ? await resp.json() : []
      setTasks(Array.isArray(data) ? data : (data?.results ?? []))
    } catch (e) {
      console.error("[tasks] load error:", e)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobById(params.jobId)
      .then((job: any) => job && setJobName(job.Project_name ?? job.projectName ?? ""))
      .catch(() => {})
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.technicianId, params.jobId])

  const handleBack = () => {
    router.push(`/subcontractors/${params.id}/technicians/${params.technicianId}`)
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({ title: t("error"), description: t("taskTitleRequired"), variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      const resp = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          Name: newTaskTitle,
          Task_description: newTaskDescription || null,
          Task_status: "Not started",
          ID_Jobs: params.jobId,
          ID_Technician: params.technicianId,
        }),
      })
      if (!resp.ok) throw new Error(`(${resp.status})`)
      setNewTaskTitle("")
      setNewTaskDescription("")
      setIsCreateOpen(false)
      await loadTasks()
      toast({ title: t("success"), description: t("taskCreatedSuccess") })
    } catch (e) {
      console.error("[tasks] create error:", e)
      toast({ title: t("error"), description: String(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    // T-16: era el único borrado del sistema sin confirmación
    if (!window.confirm(t("confirmDeleteTask"))) return
    setBusy(true)
    try {
      const resp = await apiFetch(`/api/tasks?task_id=${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      })
      if (!resp.ok) throw new Error(`(${resp.status})`)
      setIsDetailsOpen(false)
      await loadTasks()
      toast({ title: t("success"), description: t("taskDeletedSuccess") })
    } catch (e) {
      toast({ title: t("error"), description: String(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedTask || !editedTaskStatus) return
    setBusy(true)
    try {
      const resp = await apiFetch("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          ID_Tasks: selectedTask.ID_Tasks,
          Task_status: editedTaskStatus,
        }),
      })
      if (!resp.ok) throw new Error(`(${resp.status})`)
      setSelectedTask({ ...selectedTask, Task_status: editedTaskStatus })
      await loadTasks()
      toast({
        title: t("success"),
        description: t("taskStatusUpdated", { status: editedTaskStatus }),
      })
    } catch (e) {
      toast({ title: t("error"), description: String(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => (task.Task_status ?? "Not started") === status)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToTech")}
            </Button>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("subcontractors")}</span>
              <span>|</span>
              <span>{jobName || params.jobId}</span>
              <span>|</span>
              <span className="font-medium text-foreground">{t("tabTasks")}</span>
            </div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{t("tabTasks")}</h1>
              {puedeCrear && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
                >
                  <Plus className="h-4 w-4" />
                  {t("addTask")}
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {TASK_STATUSES.map((statusConfig) => {
                    const statusTasks = getTasksByStatus(statusConfig.value)
                    return (
                      <div key={statusConfig.value} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge className={`${statusConfig.color} text-white`}>
                            {statusConfig.value}
                          </Badge>
                          <span className="text-lg font-semibold">{statusTasks.length}</span>
                        </div>
                        {statusTasks.length ? (
                          <div className="divide-y rounded-md border">
                            {statusTasks.map((task) => (
                              <button
                                key={task.ID_Tasks}
                                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                                onClick={() => {
                                  setSelectedTask(task)
                                  setEditedTaskStatus(task.Task_status ?? "Not started")
                                  setIsDetailsOpen(true)
                                }}
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {task.Name ?? task.ID_Tasks}
                                  </p>
                                  {task.Task_description && (
                                    <p className="line-clamp-1 text-xs text-muted-foreground">
                                      {task.Task_description}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {task.Delivery_date ?? ""}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Detalles / edición */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask?.Name ?? selectedTask?.ID_Tasks}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedTask?.Task_description || "—"}
            </p>
            <div>
              <Label className="mb-2 block">{t("status")}</Label>
              <Select value={editedTaskStatus} onValueChange={setEditedTaskStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {puedeBorrar ? (
              <Button
                variant="ghost"
                className="gap-2 text-red-600 hover:text-red-700"
                disabled={busy}
                onClick={() => selectedTask && handleDeleteTask(selectedTask.ID_Tasks)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : <span />}
            <Button
              onClick={handleStatusChange}
              disabled={busy || editedTaskStatus === (selectedTask?.Task_status ?? "Not started")}
              className="bg-gqm-green text-white hover:bg-gqm-green/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crear */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t("taskTitle")}</Label>
              <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">{t("taskDescription")}</Label>
              <Textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateTask}
              disabled={busy}
              className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("addTask")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TechnicianTasksPage({
  params,
}: {
  params: Promise<{ id: string; technicianId: string; jobId: string }>
}) {
  const resolvedParams = use(params)
  return <TechnicianTasksClient params={resolvedParams} />
}
