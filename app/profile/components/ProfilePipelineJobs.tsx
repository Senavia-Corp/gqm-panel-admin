"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { Loader2, Briefcase, MapPin, ChevronRight, AlertCircle } from "lucide-react"

export function ProfilePipelineJobs({ memberId }: { memberId: string }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!memberId) return

    const fetchJobs = async () => {
      try {
        setLoading(true)
        // Pedimos los estados de pipeline
        const statuses = encodeURIComponent("Assigned/P. Quote,Scheduled / Work in Progress,In Progress")
        const res = await apiFetch(`/api/jobs?member_id=${memberId}&status=${statuses}&limit=50`)
        if (!res.ok) throw new Error("Failed to fetch pipeline jobs")
        const data = await res.json()
        setJobs(data.results || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [memberId])

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 flex items-center gap-3 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Error loading jobs: {error}</p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
        <Briefcase className="h-12 w-12 mb-3 text-slate-200" />
        <p className="font-medium text-slate-600">No active jobs in pipeline</p>
        <p className="text-sm">You don't have any jobs assigned in pipeline statuses.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Link key={job.ID_Jobs} href={`/jobs/${job.ID_Jobs}`} className="block group">
          <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">
                  {job.Job_type}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {job.Job_status}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                {job.ID_Jobs} - {job.Project_name || "No name"}
              </h3>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.client?.Client_Community || "Unknown Client"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400 font-medium">Assigned</p>
                <p className="text-sm font-semibold text-slate-700">
                  {job.Date_assigned ? new Date(job.Date_assigned).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
