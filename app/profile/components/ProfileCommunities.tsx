"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { Loader2, Building2, MapPin, DollarSign, Target, AlertCircle } from "lucide-react"

export function ProfileCommunities({ memberId }: { memberId: string }) {
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!memberId) return

    const fetchCommunities = async () => {
      try {
        setLoading(true)
        const res = await apiFetch(`/api/metrics/clients?member_id=${memberId}&limit=50&order_by=revenue`)
        if (!res.ok) throw new Error("Failed to fetch communities")
        const data = await res.json()
        setCommunities(data.clients || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [memberId])

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 flex items-center gap-3 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Error loading communities: {error}</p>
      </div>
    )
  }

  if (communities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
        <Building2 className="h-12 w-12 mb-3 text-slate-200" />
        <p className="font-medium text-slate-600">No communities assigned</p>
        <p className="text-sm">You are not currently managing any communities.</p>
      </div>
    )
  }

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {communities.map((item, idx) => {
        const c = item.client
        const stats = item.dashboard_stats
        
        return (
          <div key={c.id || idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  {c.name || "Unknown Community"}
                </h3>
                <p className="text-sm text-slate-500 flex items-start gap-1 mt-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">{c.address || "No address provided"}</span>
                </p>
                {c.pmc_name && (
                  <p className="text-sm text-slate-500 flex items-start gap-1 mt-1.5">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{c.pmc_name}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
