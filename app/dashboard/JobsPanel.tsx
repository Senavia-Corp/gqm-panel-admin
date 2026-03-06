"use client"

import { MetricCard } from "@/components/molecules/MetricCard"
import { JobStatusChart } from "@/components/molecules/JobStatusChart"
import TopStatusBarChart from "@/components/molecules/TopStatusBarChart"

type JobCard = { key: string; name: string; value: string; pct: number; icon: any }

interface Props {
  isLoadingJobsMetrics: boolean
  jobsCards: JobCard[]
  statusDistribution: any[]
}

export default function JobsPanel({ isLoadingJobsMetrics, jobsCards, statusDistribution }: Props) {
  return (
    <>
      {/* Jobs Metrics Grid */}
      <div className="mb-6 bg-gqm-green-dark rounded-lg p-6 border-4 border-black relative">
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("jobs-cards-scroller")
            if (!el) return
            const scrollAmount = 300
            el.scrollBy({ left: -scrollAmount, behavior: "smooth" })
          }}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("jobs-cards-scroller")
            if (!el) return
            const scrollAmount = 300
            el.scrollBy({ left: scrollAmount, behavior: "smooth" })
          }}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div
          id="jobs-cards-scroller"
          className="
            flex gap-4 overflow-x-auto pb-2 pr-2
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:h-0
            [&::-webkit-scrollbar]:w-0
          "
          style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
        >
          {isLoadingJobsMetrics ? (
            <>
              <div className="flex-none w-[280px]"><div className="border-0 overflow-hidden rounded-xl bg-white"><div className="p-6"><div className="space-y-3"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /><div className="flex items-center justify-between"><div className="h-9 w-20 bg-gray-200 rounded animate-pulse" /><div className="h-14 w-14 bg-gray-100 rounded-lg animate-pulse" /></div></div></div><div className="px-6 py-3" style={{ backgroundColor: "#37D260" }}><div className="h-4 w-20 bg-black/10 rounded animate-pulse" /></div></div></div>
              <div className="flex-none w-[280px]"><div className="border-0 overflow-hidden rounded-xl bg-white"><div className="p-6"><div className="space-y-3"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /><div className="flex items-center justify-between"><div className="h-9 w-20 bg-gray-200 rounded animate-pulse" /><div className="h-14 w-14 bg-gray-100 rounded-lg animate-pulse" /></div></div></div><div className="px-6 py-3" style={{ backgroundColor: "#37D260" }}><div className="h-4 w-20 bg-black/10 rounded animate-pulse" /></div></div></div>
              <div className="flex-none w-[280px]"><div className="border-0 overflow-hidden rounded-xl bg-white"><div className="p-6"><div className="space-y-3"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /><div className="flex items-center justify-between"><div className="h-9 w-20 bg-gray-200 rounded animate-pulse" /><div className="h-14 w-14 bg-gray-100 rounded-lg animate-pulse" /></div></div></div><div className="px-6 py-3" style={{ backgroundColor: "#37D260" }}><div className="h-4 w-20 bg-black/10 rounded animate-pulse" /></div></div></div>
            </>
          ) : (
            jobsCards.map((c) => (
              <div key={c.key} className="flex-none w-[280px]">
                <MetricCard name={c.name} value={c.value} change={c.pct} icon={c.icon} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Jobs Charts Grid */}
      <div className="grid gap-6 mb-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Skeleton simple para chart */}
          {isLoadingJobsMetrics ? (
            <div className="border-0 rounded-xl bg-white p-6 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
              <div className="h-64 bg-gray-100 rounded" />
            </div>
          ) : (
            <JobStatusChart statusData={statusDistribution} />
          )}

          {/* Top 5 statuses bar chart */}
          {isLoadingJobsMetrics ? (
            <div className="border-0 rounded-xl bg-white p-6 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
              <div className="h-64 bg-gray-100 rounded" />
            </div>
          ) : (
            <TopStatusBarChart statusData={statusDistribution} />
          )}
        </div>
      </div>
    </>
  )
}