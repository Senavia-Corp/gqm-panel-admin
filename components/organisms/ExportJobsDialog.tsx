"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useTranslations } from "@/components/providers/LocaleProvider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  JobBasicColumn, 
  JobExportRequest, 
  JobExportFilters, 
  JobFilters,
  JobExportColumns
} from "@/lib/types"
import { exportJobs } from "@/lib/services/jobs-service"
import { FileSpreadsheet, Loader2, CheckCircle2, LayoutGrid, Building2, Users, HardHat, CircleDollarSign, ShoppingCart, ListChecks } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ExportJobsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  filters: JobFilters
}

const STORAGE_KEY = "gqm_job_export_prefs_v2"

// Mapeo de labels para visualización amigable
const BASIC_COLUMN_LABELS: Record<JobBasicColumn, string> = {
  [JobBasicColumn.ID_JOBS]: "Job ID",
  [JobBasicColumn.JOB_TYPE]: "Type",
  [JobBasicColumn.PROJECT_NAME]: "Project Name",
  [JobBasicColumn.PROJECT_LOCATION]: "Location",
  [JobBasicColumn.JOB_STATUS]: "Status",
  [JobBasicColumn.PO_WTN_WO]: "PO / WTN / WO",
  [JobBasicColumn.SERVICE_TYPE]: "Service Type",
  [JobBasicColumn.DATE_ASSIGNED]: "Date Assigned",
  [JobBasicColumn.DATE_ASSIGNED_END]: "Date Assigned End",
  [JobBasicColumn.ESTIMATED_START_DATE]: "Est. Start Date",
  [JobBasicColumn.ESTIMATED_START_DATE_END]: "Est. Start Date End",
  [JobBasicColumn.ESTIMATED_PROJECT_DURATION]: "Duration",
  [JobBasicColumn.DATE_RECEIVED]: "Date Received",
  [JobBasicColumn.ESTIMATED_COMPLETION_DATE]: "Est. Completion",
  [JobBasicColumn.ADDITIONAL_DETAIL]: "Add. Detail",
  [JobBasicColumn.ESTIMATED_RENT]: "Rent Est.",
  [JobBasicColumn.ESTIMATED_MATERIAL]: "Material Est.",
  [JobBasicColumn.ESTIMATED_CITY]: "City Est.",
  [JobBasicColumn.TECH_FORMULA_PRICING]: "Tech Formula",
  [JobBasicColumn.GQM_FORMULA_PRICING]: "GQM Formula",
  [JobBasicColumn.GQM_FINAL_SOLD_PRICING]: "Final Sold Pricing",
  [JobBasicColumn.GQM_TOTAL_CHANGE_ORDERS]: "Total CO",
  [JobBasicColumn.GQM_TOTAL_MATERIALS_FEES]: "Materials Fees",
  [JobBasicColumn.ACC_RECEIVABLE]: "Acc. Receivable",
  [JobBasicColumn.PERMIT]: "Permit",
  [JobBasicColumn.PTL_GC_FEE]: "PTL GC Fee",
  [JobBasicColumn.GQM_PAID_FEES]: "Paid Fees",
}

export function ExportJobsDialog({ isOpen, onOpenChange, filters }: ExportJobsDialogProps) {
  const t = useTranslations("jobs")
  const tCommon = useTranslations("common")

  const [loading, setLoading] = useState(false)
  const [basicFields, setBasicFields] = useState<JobBasicColumn[]>(Object.values(JobBasicColumn))
  const [extraSections, setExtraSections] = useState({
    include_client: true,
    include_members: true,
    include_subcontractors: true,
    include_commissions: true,
    include_purchases: true,
    include_estimate_costs: true,
  })

  // Cargar preferencias
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.basicFields) setBasicFields(parsed.basicFields)
        if (parsed.extraSections) setExtraSections(parsed.extraSections)
      } catch (e) {
        console.error("Error loading export prefs", e)
      }
    }
  }, [])

  // Guardar preferencias
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ basicFields, extraSections }))
    }
  }, [basicFields, extraSections, isOpen])

  const toggleBasicField = (field: JobBasicColumn) => {
    setBasicFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    )
  }

  const toggleSection = (key: keyof typeof extraSections) => {
    setExtraSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectAll = () => {
    setBasicFields(Object.values(JobBasicColumn))
    setExtraSections({
      include_client: true,
      include_members: true,
      include_subcontractors: true,
      include_commissions: true,
      include_purchases: true,
      include_estimate_costs: true,
    })
  }

  const clearAll = () => {
    setBasicFields([JobBasicColumn.ID_JOBS, JobBasicColumn.PROJECT_NAME]) // Dejar unos mínimos
    setExtraSections({
      include_client: false,
      include_members: false,
      include_subcontractors: false,
      include_commissions: false,
      include_purchases: false,
      include_estimate_costs: false,
    })
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      // Mapear filtros de UI a filtros de Export (snake_case)
      const exportFilters: JobExportFilters = {
        statuses: filters.status && filters.status !== "all" ? [filters.status] : undefined,
        job_types: filters.type && filters.type !== "ALL" ? [filters.type] : undefined,
        member_ids: filters.memberId ? [filters.memberId] : undefined,
        client_id: filters.clientId || undefined,
        parent_mgmt_co_id: filters.parentMgmtCoId || undefined,
        search: filters.search || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      }

      const columns: JobExportColumns = {
        basic_fields: basicFields,
        ...extraSections
      }

      const request: JobExportRequest = {
        filters: exportFilters,
        columns
      }

      const blob = await exportJobs(request)
      
      // Descargar archivo
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      const timestamp = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `GQM_Jobs_Export_${timestamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: t("exportSuccess"),
        description: t("exportSuccessDesc"),
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: t("exportFailed"),
        description: t("exportFailedDesc"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl !w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-slate-50 dark:bg-slate-950">
        <DialogHeader className="p-8 bg-white dark:bg-slate-900 border-b shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">{t("exportTitle")}</DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                {t("exportDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Selection Area */}
          <ScrollArea className="flex-1 p-8 bg-slate-50/50 dark:bg-transparent">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Column 1: Basic Fields */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("exportEssentialData")}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  {Object.entries(BASIC_COLUMN_LABELS).map(([key, label]) => {
                    const isSelected = basicFields.includes(key as JobBasicColumn);
                    return (
                      <div 
                        key={key} 
                        className={`flex items-center space-x-3 p-2 rounded-lg transition-all cursor-pointer select-none ${
                          isSelected ? "bg-primary/5 text-primary" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                        onClick={() => toggleBasicField(key as JobBasicColumn)}
                      >
                        <Checkbox 
                          id={`field-${key}`} 
                          checked={isSelected} 
                          onCheckedChange={() => toggleBasicField(key as JobBasicColumn)}
                          onClick={(e) => e.stopPropagation()} // Evitar doble disparo
                          className="h-4 w-4 shrink-0 border-slate-300 data-[state=checked]:bg-primary"
                        />
                        <Label 
                          htmlFor={`field-${key}`} 
                          className="text-xs font-medium cursor-pointer flex-1 py-1"
                          onClick={(e) => e.preventDefault()} // Evitar conflicto con div onClick
                        >
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Column 2: Related Entities */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("exportRelatedCollections")}</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { key: "include_client",         labelKey: "exportSecClientLabel",      icon: Building2,       descKey: "exportSecClientDesc" },
                    { key: "include_members",         labelKey: "exportSecMembersLabel",     icon: Users,           descKey: "exportSecMembersDesc" },
                    { key: "include_subcontractors",  labelKey: "exportSecSubsLabel",        icon: HardHat,         descKey: "exportSecSubsDesc" },
                    { key: "include_commissions",     labelKey: "exportSecCommissionsLabel", icon: CircleDollarSign, descKey: "exportSecCommissionsDesc" },
                    { key: "include_purchases",       labelKey: "exportSecPurchasesLabel",   icon: ShoppingCart,    descKey: "exportSecPurchasesDesc" },
                    { key: "include_estimate_costs",  labelKey: "exportSecEstimateLabel",    icon: LayoutGrid,      descKey: "exportSecEstimateDesc" },
                  ].map((sec) => {
                    const isSelected = extraSections[sec.key as keyof typeof extraSections];
                    return (
                      <div 
                        key={sec.key} 
                        className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer group select-none ${
                          isSelected 
                            ? "bg-white dark:bg-slate-900 border-primary shadow-md" 
                            : "bg-white/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800 hover:border-slate-300"
                        }`}
                        onClick={() => toggleSection(sec.key as any)}
                      >
                        <div className="mt-1">
                          <Checkbox 
                            id={`sec-${sec.key}`} 
                            checked={isSelected}
                            onCheckedChange={() => toggleSection(sec.key as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 data-[state=checked]:bg-primary"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? "bg-primary/10 text-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200"}`}>
                              <sec.icon className="h-4 w-4" />
                            </div>
                            <Label
                              htmlFor={`sec-${sec.key}`}
                              className={`text-sm font-bold cursor-pointer transition-colors ${isSelected ? "text-primary" : "text-slate-600 dark:text-slate-400"}`}
                              onClick={(e) => e.preventDefault()}
                            >
                              {t(sec.labelKey as any)}
                            </Label>
                          </div>
                          <p className={`text-xs leading-relaxed transition-colors ${isSelected ? "text-slate-500" : "text-slate-400"}`}>
                            {t(sec.descKey as any)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </ScrollArea>

          {/* Sidebar / Summary */}
          <div className="w-full lg:w-72 bg-white dark:bg-slate-900 border-l p-8 shrink-0 flex flex-col justify-between overflow-y-auto">
            <div>
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("exportSelectionSummary")}
              </h4>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="text-2xl font-bold text-primary">{basicFields.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{t("exportBasicFields")}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="text-2xl font-bold text-primary">
                    {Object.values(extraSections).filter(Boolean).length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{t("exportFullSections")}</div>
                </div>
              </div>
              
              <div className="mt-8 space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 text-primary hover:bg-primary/5" onClick={selectAll}>
                  {t("exportSelectAll")}
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 text-slate-500 hover:bg-slate-100" onClick={clearAll}>
                  {t("exportResetMin")}
                </Button>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-4">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {t("exportAutoSaved")}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-white dark:bg-slate-900 border-t shrink-0 sm:justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <LayoutGrid className="h-3 w-3" />
            {basicFields.length + Object.values(extraSections).filter(Boolean).length * 10} {t("exportColumnsGenerated")}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="px-6">
              {tCommon("cancel")}
            </Button>
            <Button
                onClick={handleExport}
                disabled={loading || basicFields.length === 0}
                className="px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 min-w-[180px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("exportGenerating")}
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t("exportDownload")}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
