"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, ChevronRight, MoreVertical, Trash2 } from "lucide-react"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import type { Task, TaskStatus, Technician } from "@/lib/types"
import { TimelineItem } from "@/components/molecules/TimelineItem"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { mockSubcontractors } from "@/lib/mock-data/subcontractors"
import { fetchJobById } from "@/lib/services/jobs-service"

const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: "completed", label: "Completed", color: "bg-green-500 hover:bg-green-600" },
  { value: "assigned", label: "Assigned", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "pending", label: "Pending", color: "bg-yellow-500 hover:bg-yellow-600" },
  { value: "in_process", label: "In Process", color: "bg-purple-500 hover:bg-purple-600" },
  { value: "under_review", label: "Under Review", color: "bg-orange-500 hover:bg-orange-600" },
  { value: "closed", label: "Closed", color: "bg-gray-500 hover:bg-gray-600" },
]

// Mock timeline events
const mockTimelineEvents = [
  { id: "1", activity: "Task Created", date: "2025-01-15", user: "Admin User" },
  { id: "2", activity: "Status Updated", date: "2025-01-14", user: "John Doe" },
  { id: "3", activity: "Task Assigned", date: "2025-01-13", user: "Admin User" },
]

// Mock tasks data
const generateMockTasks = (jobId: string, technicianId: string): Task[] => {
  const tasks: Task[] = []
  const statuses: TaskStatus[] = ["completed", "assigned", "pending", "in_process", "under_review", "closed"]

  statuses.forEach((status, statusIndex) => {
    for (let i = 0; i < 3; i++) {
      tasks.push({
        ID_Task: `TSK${statusIndex}${i}${Math.floor(Math.random() * 1000)}`,
        Title: `Task ${statusIndex * 3 + i + 1}`,
        Description: `Description for task ${statusIndex * 3 + i + 1}`,
        Status: status,
        Assignment_date: new Date().toISOString(),
        Completion_date: status === "completed" || status === "closed" ? new Date().toISOString() : null,
        ID_Jobs: jobId,
        assignedMembers: [],
        assignedTechnicians: [],
        attachments: [],
      })
    }
  })

  return tasks
}

function TechnicianTasksClient({
  params,
}: {
  params: { id: string; technicianId: string; jobId: string }
}) {
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<{ name: string; role: string; avatar: string } | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [jobName, setJobName] = useState<string>("")
  const [subcontractorName, setSubcontractorName] = useState<string>("")

  // Form state for creating new task
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")

  // Form state for editing task
  const [editedTaskStatus, setEditedTaskStatus] = useState<TaskStatus | "">("")

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    loadData()
  }, [params.id, params.technicianId, params.jobId])

  const loadData = async () => {
    const subcontractor = mockSubcontractors.find((s) => s.ID_Subcontractor === params.id)
    if (subcontractor) {
      setSubcontractorName(subcontractor.Name)
      const tech = subcontractor.technicians?.find((t) => t.ID_Technician === params.technicianId)
      if (tech) {
        setTechnician(tech)
      }
    }

    const job = await fetchJobById(params.jobId)
    if (job) {
      setJobName(job.projectName)
    }

    const mockTasks = generateMockTasks(params.jobId, params.technicianId)
    setTasks(mockTasks)
  }

  const handleBack = () => {
    router.push(`/subcontractors/${params.id}/technicians/${params.technicianId}`)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setEditedTaskStatus(task.Status)
    setIsDetailsOpen(true)
  }

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      toast({
        title: t("error"),
        description: t("taskTitleRequired"),
        variant: "destructive",
      })
      return
    }

    const newTask: Task = {
      ID_Task: `TSK${Math.floor(10000 + Math.random() * 90000)}`,
      Title: newTaskTitle,
      Description: newTaskDescription,
      Status: "pending",
      Assignment_date: new Date().toISOString(),
      Completion_date: null,
      ID_Jobs: params.jobId,
      assignedMembers: [],
      assignedTechnicians: technician ? [technician] : [],
      attachments: [],
    }

    setTasks([...tasks, newTask])
    setNewTaskTitle("")
    setNewTaskDescription("")
    setIsCreateOpen(false)

    toast({
      title: t("success"),
      description: t("taskCreatedSuccess"),
    })
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.ID_Task !== taskId))
    setIsDetailsOpen(false)
    toast({
      title: t("success"),
      description: t("taskDeletedSuccess"),
    })
  }

  const handleStatusChange = () => {
    if (!selectedTask || !editedTaskStatus) return

    const updatedTasks = tasks.map((t) =>
      t.ID_Task === selectedTask.ID_Task
        ? {
            ...t,
            Status: editedTaskStatus,
            Completion_date:
              editedTaskStatus === "completed" || editedTaskStatus === "closed"
                ? new Date().toISOString()
                : t.Completion_date,
          }
        : t,
    )
    setTasks(updatedTasks)
    setSelectedTask({ ...selectedTask, Status: editedTaskStatus })

    toast({
      title: t("success"),
      description: t("taskStatusUpdated", { status: t(editedTaskStatus) }),
    })
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.Status === status)
  }

  const getStatusConfig = (status: TaskStatus) => {
    return TASK_STATUSES.find((s) => s.value === status)!
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToTech")}
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>{t("subcontractors")}</span>
              <span>|</span>
              <span>{t("technicianDocumentation")}</span>
              <span>|</span>
              <span>{jobName || t("jobNamePlaceholder")}</span>
              <span>|</span>
              <span className="text-foreground font-medium">{t("tabTasks")}</span>
            </div>
            <h1 className="text-3xl font-bold">{t("tabTasks")}</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {TASK_STATUSES.map((statusConfig) => {
                      const statusTasks = getTasksByStatus(statusConfig.value)
                      return (
                        <div key={statusConfig.value} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Badge className={`${statusConfig.color} text-white`}>{t(statusConfig.value)}</Badge>
                            <span className="text-lg font-semibold">{statusTasks.length}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto"
                                  onClick={() => {
                                    setIsCreateOpen(true)
                                  }}
                                >
                                  <Plus className="mr-1 h-4 w-4" />
                                  {t("addTask")}
                                </Button>
                              </DialogTrigger>
                            </Dialog>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">{t("name")}</div>
                            {statusTasks.map((task) => (
                              <div
                                key={task.ID_Task}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleTaskClick(task)}
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="h-4 w-4 text-green-500" />
                                  <span className="text-sm">{task.Title}</span>
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-muted-foreground"
                              onClick={() => setIsCreateOpen(true)}
                            >
                              <Plus className="mr-1 h-4 w-4" />
                              {t("addTask")}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>{t("timeline")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockTimelineEvents.map((event) => (
                    <TimelineItem
                      key={event.id}
                      activity={event.activity}
                      date={new Date(event.date).toLocaleDateString()}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createTask")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("taskTitle")}</Label>
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={t("enterTaskTitle")}
                  />
                </div>
                <div>
                  <Label>{t("taskDescription")}</Label>
                  <Textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder={t("enterTaskDescription")}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleCreateTask} className="bg-gqm-green hover:bg-gqm-green/90 text-white">
                  {t("createTask")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("taskDetails")}</DialogTitle>
              </DialogHeader>
              {selectedTask && (
                <div className="space-y-4">
                  <div>
                    <Label className="font-bold">{t("taskTitle")}</Label>
                    <p className="text-base mt-1">{selectedTask.Title}</p>
                  </div>
                  <div>
                    <Label className="font-bold">{t("taskDescription")}</Label>
                    <p className="text-base mt-1">{selectedTask.Description || t("noDescriptionProvided")}</p>
                  </div>
                  <div>
                    <Label className="font-bold">{t("status")}</Label>
                    <Select
                      value={editedTaskStatus}
                      onValueChange={(value) => setEditedTaskStatus(value as TaskStatus)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {t(status.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-bold">{t("assignmentDate")}</Label>
                      <p className="text-base mt-1">{new Date(selectedTask.Assignment_date).toLocaleDateString()}</p>
                    </div>
                    {selectedTask.Completion_date && (
                      <div>
                        <Label className="font-bold">{t("completionDate")}</Label>
                        <p className="text-base mt-1">{new Date(selectedTask.Completion_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="font-bold">{t("assignedTechnician")}</Label>
                    <p className="text-base mt-1">{technician?.Name || "N/A"}</p>
                  </div>
                </div>
              )}
              <DialogFooter className="flex justify-between">
                <Button variant="destructive" onClick={() => selectedTask && handleDeleteTask(selectedTask.ID_Task)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("deleteTask")}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                    {t("close")}
                  </Button>
                  <Button
                    onClick={handleStatusChange}
                    disabled={!editedTaskStatus || editedTaskStatus === selectedTask?.Status}
                    className="bg-gqm-green hover:bg-gqm-green/90 text-white"
                  >
                    {t("saveChanges")}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

export default async function TechnicianTasksPage({
  params,
}: {
  params: Promise<{ id: string; technicianId: string; jobId: string }>
}) {
  const resolvedParams = await params
  return <TechnicianTasksClient params={resolvedParams} />
}
