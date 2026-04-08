"use client"

import { CommissionDetail, CommissionType } from "@/lib/types"
import { apiFetch } from "@/lib/apiFetch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BadgeDollarSign, User, Layers, Calendar, DollarSign, Percent } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface JobCommissionsTabProps {
  job: any
  reload: () => Promise<any>
}

const COMMISSION_TYPES: CommissionType[] = ["Non-Comp", "Standard", "Premium"]

function fmt(n: number | null | undefined): string {
  if (n == null) return "—"
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function JobCommissionsTab({ job, reload }: JobCommissionsTabProps) {
  const { toast } = useToast()
  const comdetails: CommissionDetail[] = job?.comdetails ?? []

  const updateType = async (detailId: string, newType: string) => {
    try {
      const res = await apiFetch(`/api/commission_detail?id=${encodeURIComponent(detailId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Type: newType })
      })
      if (!res.ok) throw new Error("Failed to update commission type")
      toast({ title: "Success", description: "Commission type updated and recalculated." })
      await reload()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  if (comdetails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BadgeDollarSign className="h-12 w-12 text-slate-200 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">No Commission Info</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          Commissions are automatically created when a job status is set to "PAID".
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {comdetails.map((detail) => {
        // Accessing nested data from the relationship
        const group = detail.comgroup
        const commission = group?.commission
        const member = commission?.member

        return (
          <Card key={detail.ID_ComDetail} className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <BadgeDollarSign className="h-5 w-5 text-emerald-600" />
                  Commission Detail
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500 border border-slate-200">
                    {detail.ID_ComDetail}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Member Info */}
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200/50">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Member</p>
                      <p className="text-sm font-bold text-slate-900">{member?.Member_Name ?? "Unknown Member"}</p>
                      <p className="font-mono text-[11px] text-slate-500">{commission?.ID_Member ?? "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-sm border border-blue-200/50">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Role in Group</p>
                      <p className="text-sm font-semibold text-slate-700">{group?.Rol ?? "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Period & Type Selector */}
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-sm border border-amber-200/50">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Period</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {commission?.Month ? commission.Month.charAt(0) + commission.Month.slice(1).toLowerCase() : "???"} {commission?.Year ?? "????"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Commission Type</p>
                    <Select value={detail.Type} onValueChange={(v) => updateType(detail.ID_ComDetail, v)}>
                      <SelectTrigger className="w-full h-10 border-slate-200 bg-slate-50 font-semibold text-emerald-700 focus:ring-emerald-500 transition-all hover:bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMISSION_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="font-medium">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1.5 text-[10px] text-slate-400 italic">
                      Changing type recalculates factor & value.
                    </p>
                  </div>
                </div>

                {/* Financial Values */}
                <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-100 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Percent className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Factor</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-700">{detail.Factor ?? "0.00"}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Job Premium</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-700">
                      {fmt(job?.Gqm_final_prem_in_money ?? job?.Gqm_premium_in_money)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Settlement Value</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-700 tracking-tight">{fmt(detail.Sell_Mgmt)}</span>
                  </div>

                  <div className="mt-auto pt-2 border-t border-slate-200/50">
                    <p className="text-[10px] text-slate-400 text-right uppercase font-bold tracking-tighter">Verified Automagically</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
