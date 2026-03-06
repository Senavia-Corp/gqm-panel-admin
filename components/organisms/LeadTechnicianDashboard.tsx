"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, ChevronRight } from "lucide-react"
import type { Job } from "@/lib/types"

interface Task {
  ID_Tasks: string
  Name: string
  Task_status: string
  Designation_date: string
  Delivery_date: string
  Priority: string
  Task_description: string
  ID_Jobs: string | null
  ID_Technician: string
  podio_item_id: string | null
}

export function LeadTechnicianDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        const userId = localStorage.getItem("user_id")
        if (!userId) {
          console.error("[v0] No technician ID found in localStorage")
          setLoading(false)
          return
        }

        console.log("[v0] Fetching technician data for ID:", userId)
        const response = await fetch(`/api/technician/${userId}`)

        if (!response.ok) {
          console.error("[v0] Error fetching technician data:", response.status)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log("[v0] Technician data received:", data)

        const technicianJobs = data.subcontractor?.jobs || []
        console.log("[v0] Technician jobs:", technicianJobs)
        setJobs(technicianJobs)

        const allTasks = data.tasks || []
        const currentWeekTasks = filterTasksForCurrentWeek(allTasks)
        console.log("[v0] Current week tasks:", currentWeekTasks)
        setTasks(currentWeekTasks)
      } catch (error) {
        console.error("[v0] Error fetching technician data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTechnicianData()
  }, [])

  const filterTasksForCurrentWeek = (tasks: Task[]): Task[] => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Get Monday of current week
    const monday = new Date(now)
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1))
    monday.setHours(0, 0, 0, 0)

    // Get Sunday of current week
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    console.log("[v0] Current week range:", { monday, sunday })

    return tasks.filter((task) => {
      const designationDate = new Date(task.Designation_date)
      const isInRange = designationDate >= monday && designationDate <= sunday
      console.log("[v0] Task:", task.Name, "Designation date:", designationDate, "In range:", isInRange)
      return isInRange
    })
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes("completed")) {
      return "bg-gqm-green text-white"
    } else if (statusLower.includes("progress") || statusLower.includes("process")) {
      return "bg-blue-500 text-white"
    } else {
      return "bg-yellow-500 text-gqm-green-dark"
    }
  }

  const getJobStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      "Assigned/P.Quote": "bg-blue-500 text-white",
      "Waiting for Approval": "bg-yellow-500 text-white",
      "Schedule/Work in Progress": "bg-gqm-green text-white",
      "In Progress": "bg-gqm-green text-white",
      Cancelled: "bg-red-500 text-white",
      "Completed P. INV/POs": "bg-purple-500 text-white",
      "Completed PVI": "bg-purple-500 text-white",
      Invoiced: "bg-green-600 text-white",
      HOLD: "bg-orange-500 text-white",
      PAID: "bg-emerald-600 text-white",
      Paid: "bg-emerald-600 text-white",
      Warranty: "bg-indigo-500 text-white",
      Archived: "bg-gray-400 text-white",
      "Received-Stand By": "bg-blue-400 text-white",
      "Assigned-In progress": "bg-green-500 text-white",
    }

    return statusMap[status] || "bg-gray-200 text-gray-800"
  }

  // Get current week dates (Jan 25-29, 2025)
  const weekDates = [
    { day: 25, label: "25" },
    { day: 26, label: "26" },
    { day: 27, label: "27" },
    { day: 28, label: "28" },
    { day: 29, label: "29" },
  ]

  const getTaskPosition = (startDate: string, duration: number) => {
    const taskStart = new Date(startDate).getDate()
    const startIndex = weekDates.findIndex((d) => d.day === taskStart)

    if (startIndex === -1) return null

    return {
      gridColumnStart: startIndex + 1,
      gridColumnEnd: startIndex + duration + 1,
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Top Row: Recent Tasks and Assigned Jobs */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tasks Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks for this week.</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.ID_Tasks}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(task.Task_status)}`} />
                    <span className="text-sm font-medium">{task.Name}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Assigned Jobs Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Assigned Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs assigned yet.</p>
            ) : (
              jobs.map((job: any) => {
                const jobId = job.ID_Jobs
                const projectName = job.Project_name || "Untitled Project"
                const jobStatus = job.Job_status || "N/A"

                return (
                  <div key={jobId} className="flex items-center gap-4 pb-4 border-b last:border-0">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-sm font-mono text-muted-foreground">{jobId}</span>
                      <span className="text-sm font-medium flex-1">{projectName}</span>
                      <Badge className={`${getJobStatusColor(jobStatus)} px-3 py-1 whitespace-nowrap`}>
                        {jobStatus}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-gqm-yellow hover:bg-gqm-yellow/80"
                        onClick={() => (window.location.href = `/jobs/${jobId}`)}
                      >
                        <Eye className="h-4 w-4 text-gqm-green-dark" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Tasks Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Weekly Tasks</CardTitle>
          <span className="text-sm text-muted-foreground">25-29 JAN</span>
        </CardHeader>
        <CardContent>
          {/* Calendar Header */}
          <div className="grid grid-cols-5 gap-4 mb-4 pb-2 border-b">
            {weekDates.map((date) => (
              <div key={date.day} className="text-center">
                <span className="text-sm font-medium text-muted-foreground">{date.label}</span>
              </div>
            ))}
          </div>

          {/* Tasks Grid */}
          <div className="relative min-h-[300px]">
            <div className="grid grid-cols-5 gap-4 absolute inset-0">
              {tasks.map((task, index) => {
                const position = getTaskPosition(task.Designation_date, 1) // Assuming duration is always 1 for simplicity
                if (!position) return null

                const colors = {
                  Completed: "bg-gqm-green",
                  "In Process": "bg-gqm-yellow",
                  Assigned: "bg-gray-200",
                }

                return (
                  <div
                    key={task.ID_Tasks}
                    className={`${colors[task.Task_status as keyof typeof colors] || "bg-gray-200"} rounded-lg p-3 cursor-pointer hover:opacity-90 transition-opacity`}
                    style={{
                      gridColumn: `${position.gridColumnStart} / ${position.gridColumnEnd}`,
                      marginTop: `${index * 80}px`,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          task.Task_status === "Completed"
                            ? "bg-white"
                            : task.Task_status === "In Process"
                              ? "bg-gqm-green-dark"
                              : "bg-gray-400"
                        }`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${task.Task_status === "Completed" ? "bg-gqm-green" : task.Task_status === "In Process" ? "bg-white" : "bg-white"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${task.Task_status === "In Process" ? "text-gqm-green-dark" : "text-gray-800"}`}
                        >
                          {task.Name}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
