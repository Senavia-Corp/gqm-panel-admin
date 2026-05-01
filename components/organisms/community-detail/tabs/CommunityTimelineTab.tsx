"use client"

import { useEffect, useCallback, useState } from "react"
import { RefreshCw, Activity } from "lucide-react"
import { TimelineItem, type TLActivityEntry } from "@/components/molecules/TimelineItem"
import { apiFetch } from "@/lib/apiFetch"

interface TimelineState {
  entries:     TLActivityEntry[]
  total:       number
  page:        number
  loading:     boolean
  loadingMore: boolean
  error:       string | null
}

const PAGE_LIMIT = 15

export function CommunityTimelineTab({ clientId }: { clientId: string }) {
  const [tl, setTl] = useState<TimelineState>({
    entries: [], total: 0, page: 1, loading: true, loadingMore: false, error: null,
  })

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    if (!clientId) return
    setTl(prev => ({ ...prev, loading: !append && page === 1, loadingMore: append, error: null }))
    try {
      const res  = await apiFetch(`/api/timeline/client/${encodeURIComponent(clientId)}?page=${page}&limit=${PAGE_LIMIT}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
      const entries: TLActivityEntry[] = data?.results ?? data ?? []
      const total:   number            = data?.total   ?? entries.length
      setTl(prev => ({
        entries:     append ? [...prev.entries, ...entries] : entries,
        total, page, loading: false, loadingMore: false, error: null,
      }))
    } catch (e: any) {
      setTl(prev => ({ ...prev, loading: false, loadingMore: false, error: e?.message ?? "Failed to load timeline" }))
    }
  }, [clientId])

  useEffect(() => { fetchPage(1, false) }, [fetchPage])

  const hasMore        = tl.entries.length < tl.total
  const handleLoadMore = () => { if (!tl.loadingMore && hasMore) fetchPage(tl.page + 1, true) }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Activity Timeline</p>
            <p className="text-[11px] text-slate-400">
              {tl.loading ? "Loading…" : tl.total > 0 ? `${tl.total} event${tl.total !== 1 ? "s" : ""} recorded` : "No events yet"}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchPage(1, false)}
          disabled={tl.loading}
          title="Refresh timeline"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${tl.loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Error */}
      {!tl.loading && tl.error && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-6 py-3">
          <span className="text-red-500">⚠</span>
          <p className="flex-1 text-xs text-red-700">{tl.error}</p>
          <button onClick={() => fetchPage(1, false)} className="text-[11px] font-semibold text-blue-600">
            Retry
          </button>
        </div>
      )}

      {/* Body */}
      <div className="px-6 py-6">

        {tl.loading && (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: "72px", borderRadius: "10px", background: `linear-gradient(90deg, #F3F4F6 0%, #E5E7EB ${40 + i * 8}%, #F3F4F6 100%)`, animation: "tl-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {!tl.loading && !tl.error && tl.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Activity className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No activity recorded yet</p>
            <p className="text-xs text-slate-400">Events will appear here as changes happen on this community.</p>
          </div>
        )}

        {!tl.loading && tl.entries.length > 0 && (
          <div>
            {tl.entries.map((entry, idx) => (
              <TimelineItem
                key={entry.ID_TLActivity}
                entry={entry}
                isLast={idx === tl.entries.length - 1 && !hasMore}
                animationDelay={idx < PAGE_LIMIT ? idx * 30 : 0}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={tl.loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tl.loadingMore ? (
                    <><RefreshCw className="h-3 w-3 animate-spin" />Loading…</>
                  ) : (
                    `Load more (${tl.total - tl.entries.length} remaining)`
                  )}
                </button>
              </div>
            )}

            {!hasMore && tl.entries.length > 0 && (
              <p className="pt-4 text-center text-[10px] text-slate-300">
                All {tl.total} event{tl.total !== 1 ? "s" : ""} loaded
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes tl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
