"use client"

import React from "react"
import { Construction, Clock, Rocket } from "lucide-react"
import { useTranslations } from "@/components/providers/LocaleProvider"

export default function MaintenancePanel() {
  const t = useTranslations("dashboard")
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full rounded-2xl bg-white dark:bg-slate-900 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 text-center transition-all">
      <div className="relative mb-8">
        <div className="absolute -inset-4 bg-gqm-green/20 rounded-full blur-2xl animate-pulse" />
        <div className="relative h-24 w-24 rounded-2xl bg-gqm-green-dark flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-3 hover:rotate-0 transition-transform duration-300">
          <Construction className="h-12 w-12" />
        </div>
        <div className="absolute -top-2 -right-2 h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
          <Clock className="h-5 w-5" />
        </div>
      </div>
      
      <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
        {t("maintenanceTitle")}
      </h2>
      
      <div className="max-w-md space-y-4">
        <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
          {t("maintenanceSubtitle")}
        </p>
        
        <div className="pt-6 flex items-center justify-center gap-4">
          <div className="h-2 w-2 rounded-full bg-gqm-green animate-ping" />
          <span className="text-sm font-bold uppercase tracking-widest text-gqm-green-dark flex items-center gap-2">
            <Rocket className="h-4 w-4" /> {t("maintenanceImproving")}
          </span>
          <div className="h-2 w-2 rounded-full bg-gqm-green animate-ping" />
        </div>
      </div>
      
      <div className="mt-12 w-full max-w-xs h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-black">
        <div className="h-full bg-gqm-green w-2/3 animate-[progress_3s_ease-in-out_infinite]" />
      </div>
      
      <style jsx>{`
        @keyframes progress {
          0% { width: 10%; }
          50% { width: 80%; }
          100% { width: 10%; }
        }
      `}</style>
    </div>
  )
}
