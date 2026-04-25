"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { Loader2, CheckSquare, Calendar, ChevronRight, AlertCircle, Clock } from "lucide-react"

export function ProfileWeeklyTasks({ memberId }: { memberId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!memberId) return

    const fetchTasks = async () => {
      try {
        setLoading(true)
        const res = await apiFetch(`/api/tasks/weekly?member_id=${memberId}`)
        if (!res.ok) throw new Error("Failed to fetch weekly tasks")
        const data = await res.json()
        setTasks(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [memberId])

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 flex items-center gap-3 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Error loading tasks: {error}</p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
        <CheckSquare className="h-12 w-12 mb-3 text-slate-200" />
        <p className="font-medium text-slate-600">No tasks for this week</p>
        <p className="text-sm">You're all caught up!</p>
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "text-red-600 bg-red-50"
      case "Medium": return "text-amber-600 bg-amber-50"
      case "Low": return "text-emerald-600 bg-emerald-50"
      default: return "text-slate-600 bg-slate-50"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "border-emerald-500 text-emerald-700 bg-emerald-50"
      case "In Progress": return "border-blue-500 text-blue-700 bg-blue-50"
      default: return "border-slate-200 text-slate-600 bg-slate-50"
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map((task) => (
        <div key={task.ID_Tasks} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${task.Task_status === 'Completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
          
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-bold text-slate-800 line-clamp-1 pr-2">
              {task.Name || "Untitled Task"}
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${getPriorityColor(task.Priority)}`}>
              {task.Priority || "Normal"}
            </span>
          </div>
          
          <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
            {task.Task_description || "No description"}
          </p>
          
          <div className="flex flex-col gap-3 mt-auto">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Due: {task.Delivery_date ? new Date(task.Delivery_date).toLocaleDateString() : "—"}</span>
              </div>
              <span className={`px-2 py-1 rounded-md border ${getStatusColor(task.Task_status)}`}>
                {task.Task_status || "Pending"}
              </span>
            </div>
            
            {task.job && (
              <Link 
                href={`/jobs/${task.job.ID_Jobs}`}
                className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 text-sm text-indigo-600 hover:text-indigo-800 font-semibold group"
              >
                <span>Job: {task.job.ID_Jobs}</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
