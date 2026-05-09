"use client"

import { useState, useEffect, useCallback } from "react"
import { ClientCard } from "@/components/organisms/ClientCard"
import { JobSidebarChat } from "@/components/organisms/job-detail/JobSidebarChat"
import { mapClientDetailsToClient } from "@/lib/mappers/client.mapper"
import type { JobDTO, UserRole } from "@/lib/types"
import { TimelineItem, type TLActivityEntry } from "@/components/molecules/TimelineItem"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/apiFetch"
import { Activity, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  role: UserRole
  job:  JobDTO
}

const PAGE_LIMIT = 5

export function JobRightSidebar({ role, job }: Props) {
  const isTech = role === "LEAD_TECHNICIAN"
  const jobId = (job as any)?.ID_Jobs ?? (job as any)?.id ?? null
  
  const [timeline, setTimeline] = useState<TLActivityEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchTimeline = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!jobId) return
    
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const res = await apiFetch(`/api/timeline/job/${encodeURIComponent(jobId)}?page=${pageNum}&limit=${PAGE_LIMIT}`)
      const data = await res.json()
      
      if (res.ok) {
        const results = data?.results ?? data ?? []
        setTimeline(prev => append ? [...prev, ...results] : results)
        
        // If results length is equal to limit, there might be more
        setHasMore(results.length === PAGE_LIMIT)
      }
    } catch (error) {
      console.error("Failed to fetch sidebar timeline:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [jobId])

  useEffect(() => {
    if (isTech && jobId) {
      fetchTimeline(1, false)
      setPage(1)
    }
  }, [isTech, jobId, fetchTimeline])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTimeline(nextPage, true)
  }

  return (
    <div className="space-y-6">
      {/* Client Information - Same card as members, but restricted for technicians */}
      {job.client ? (
        <ClientCard 
          client={mapClientDetailsToClient(job.client)} 
          isTechnician={isTech}
        />
      ) : null}

      {/* For members, show Chat. For technicians, show Timeline. */}
      {!isTech ? (
        jobId ? <JobSidebarChat jobId={jobId} /> : null
      ) : (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-5 py-3.5 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Activity Timeline</CardTitle>
            <Activity className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Loading history...</p>
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400 italic">No activity recorded yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {timeline.map((entry, idx) => (
                    <TimelineItem
                      key={entry.ID_TLActivity}
                      entry={entry}
                      isLast={idx === timeline.length - 1 && !hasMore}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingMore}
                      onClick={handleLoadMore}
                      className="w-full h-9 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all rounded-xl border border-dashed border-slate-200 gap-2"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {loadingMore ? "Loading..." : "Load More Activity"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
