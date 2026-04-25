"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { Loader2, DollarSign, AlertCircle, FileText, Filter } from "lucide-react"

export function ProfileCommissions({ memberId }: { memberId: string }) {
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedYear, setSelectedYear] = useState<string>("All")
  const [selectedMonth, setSelectedMonth] = useState<string>("All")

  useEffect(() => {
    if (!memberId) return

    const fetchCommissions = async () => {
      try {
        setLoading(true)
        const res = await apiFetch(`/api/commission?memberId=${memberId}`)
        if (!res.ok) throw new Error("Failed to fetch commissions")
        const data = await res.json()
        setCommissions(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCommissions()
  }, [memberId])

  const years = useMemo(() => {
    const y = new Set(commissions.map(c => c.Year).filter(Boolean))
    return Array.from(y).sort().reverse()
  }, [commissions])

  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      if (selectedYear !== "All" && c.Year !== selectedYear) return false
      if (selectedMonth !== "All" && c.Month !== selectedMonth) return false
      return true
    })
  }, [commissions, selectedYear, selectedMonth])

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 flex items-center gap-3 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Error loading commissions: {error}</p>
      </div>
    )
  }

  if (commissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
        <DollarSign className="h-12 w-12 mb-3 text-slate-200" />
        <p className="font-medium text-slate-600">No commissions found</p>
        <p className="text-sm">There are no commission records for this profile yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-semibold">Filter:</span>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none focus:border-teal-400"
        >
          <option value="All">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 outline-none focus:border-teal-400"
        >
          <option value="All">All Months</option>
          {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {filteredCommissions.length === 0 ? (
        <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          No commissions match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommissions.map(comm => (
            <div key={comm.ID_Commission} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 border-b border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-white px-2 py-0.5 rounded-md border border-teal-100">
                    {comm.Month} {comm.Year}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{comm.ID_Commission}</span>
                </div>
                <p className="text-2xl font-black text-slate-800">
                  {formatMoney(comm.Total_commission)}
                </p>
              </div>
              
              <div className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Groups & Details</p>
                {comm.comgroups?.length > 0 ? (
                  <div className="space-y-3">
                    {comm.comgroups.slice(0, 3).map((group: any) => (
                      <div key={group.ID_ComGroup} className="flex justify-between items-center text-sm border-l-2 border-teal-200 pl-3">
                        <div>
                          <p className="font-medium text-slate-700">{group.Group_Name || "Group"}</p>
                          <p className="text-[10px] text-slate-400">{group.comdetails?.length || 0} jobs</p>
                        </div>
                        <p className="font-semibold text-slate-600">{formatMoney(group.Group_Total)}</p>
                      </div>
                    ))}
                    {comm.comgroups.length > 3 && (
                      <p className="text-xs text-center text-slate-400 pt-2">+ {comm.comgroups.length - 3} more groups</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No details available.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
