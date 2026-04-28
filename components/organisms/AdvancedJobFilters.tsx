"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { 
  Filter, X, Search, ChevronDown, ChevronUp, 
  Calendar, Building2, Globe, Tag, 
  PlusCircle, RefreshCcw, Layers, Users, FileSpreadsheet
} from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Badge }    from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/apiFetch"
import { cn } from "@/lib/utils"

// --- Tipos mínimos para los selectores ---
interface ClientOption      { ID_Client: string; Client_Community: string | null }
interface ParentMgmtCoOption { ID_Community_Tracking: string; Property_mgmt_co: string | null }
interface MemberOption       { ID_Member: string; Member_Name: string | null }

type YearOption = { label: string; value: string }

const JOB_STATUS_VALUES: Array<{ key: string; value: string; color?: string }> = [
  { key: "filterAllStatuses", value: "all" },
  { key: "statusAssignedQuote",   value: "Assigned/P. Quote",            color: "bg-blue-500" },
  { key: "statusWaitingApproval", value: "Waiting for Approval",         color: "bg-yellow-500" },
  { key: "statusScheduled",       value: "Scheduled / Work in Progress", color: "bg-green-500" },
  { key: "statusCompletedInv",    value: "Completed P. INV / POs",       color: "bg-emerald-600" },
  { key: "statusInvoiced",        value: "Invoiced",                     color: "bg-purple-500" },
  { key: "statusHold",            value: "HOLD",                         color: "bg-orange-600" },
  { key: "statusPaid",            value: "PAID",                         color: "bg-green-600" },
  { key: "statusWarranty",        value: "Warranty",                     color: "bg-indigo-500" },
  { key: "statusReceivedStandBy", value: "Received-Stand By",            color: "bg-slate-500" },
  { key: "statusInProgress",      value: "In Progress",                  color: "bg-sky-500" },
  { key: "statusCompletedPvi",    value: "Completed PVI / POs",          color: "bg-teal-600" },
  { key: "statusCancelled",       value: "Cancelled",                    color: "bg-red-500" },
  { key: "statusArchived",        value: "Archived",                     color: "bg-gray-700" },
]

interface AdvancedJobFiltersProps {
  title?:            string
  count?:            number
  activeFilterCount: number

  // Search
  searchValue:       string
  onSearchChange:    (v: string) => void
  onSearchSubmit:    () => void
  onSearchKeyDown:   (e: React.KeyboardEvent<HTMLInputElement>) => void

  // Year
  year:              string
  yearOptions:       YearOption[]
  onYearChange:      (y: string) => void

  // Advanced filters — valores actuales
  status:            string
  clientId:          string
  memberId:          string
  parentMgmtCoId:    string
  dateFrom:          string
  dateTo:            string

  // Advanced filters — handlers
  onStatusChange:         (v: string) => void
  onClientChange:         (v: string) => void
  onMemberChange:         (v: string) => void
  onParentMgmtCoChange:   (v: string) => void
  onDateFromChange:       (v: string) => void
  onDateToChange:         (v: string) => void
  onResetFilters:         () => void

  // Opcional
  onAddNew?: () => void
  onExportClick?: () => void
}

export function AdvancedJobFilters({
  title = "All Jobs",
  count = 0,
  activeFilterCount,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchKeyDown,
  year,
  yearOptions,
  onYearChange,
  status,
  clientId,
  memberId,
  parentMgmtCoId,
  dateFrom,
  dateTo,
  onStatusChange,
  onClientChange,
  onMemberChange,
  onParentMgmtCoChange,
  onDateFromChange,
  onDateToChange,
  onResetFilters,
  onAddNew,
  onExportClick,
}: AdvancedJobFiltersProps) {
  const t = useTranslations("jobs")
  const tCommon = useTranslations("common")

  const jobStatuses = useMemo(() =>
    JOB_STATUS_VALUES.map((s) => ({ ...s, label: t(s.key as any) })),
    [t]
  )

  const [expanded, setExpanded]       = useState(false)
  const [clients,  setClients]        = useState<ClientOption[]>([])
  const [parents,  setParents]        = useState<ParentMgmtCoOption[]>([])
  const [members,  setMembers]        = useState<MemberOption[]>([])
  const [loading,  setLoading]        = useState(false)
  const [loaded,   setLoaded]         = useState(false)

  // Carga lazy con apiFetch para enviar tokens
  useEffect(() => {
    if (!expanded || loaded) return
    setLoading(true)

    const fetchData = async () => {
      try {
        const [clientsRes, parentsRes, membersRes] = await Promise.all([
          apiFetch("/api/clients/table?limit=500"),
          apiFetch("/api/parent_mgmt_co?limit=200"),
          apiFetch("/api/members/table?limit=200")
        ])
        
        const [clientsData, parentsData, membersData] = await Promise.all([
           clientsRes.ok ? clientsRes.json() : { results: [] },
           parentsRes.ok ? parentsRes.json() : { results: [] },
           membersRes.ok ? membersRes.json() : { results: [] }
        ])
        
        setClients(clientsData?.results ?? [])
        setParents(parentsData?.results ?? [])
        setMembers(membersData?.results ?? [])
        setLoaded(true)
      } catch (err) {
        console.error("Error loading filter data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [expanded, loaded])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
      <div className="p-3 sm:p-5 space-y-4 sm:space-y-5">
        {/* ── Fila superior: título + controles ───────────────────── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gqm-green-dark/10 text-gqm-green-dark">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{title}</h2>
              <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">
                {t("filtersSystemRegistry")} {count.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Controls row — wraps on mobile so Create is never clipped */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
              <Select value={year} onValueChange={onYearChange}>
                <SelectTrigger className="h-9 w-[120px] border-none bg-transparent focus:ring-0 shadow-none font-semibold text-slate-700 sm:h-10 sm:w-[140px]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder={t("allYears")} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {yearOptions.map((y) => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant={expanded ? "default" : "secondary"}
              size="sm"
              onClick={() => setExpanded((e) => !e)}
              className={cn(
                "h-9 rounded-xl flex items-center gap-2 px-3 transition-all sm:h-10 sm:px-4",
                expanded ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none border-none"
              )}
            >
              <Filter className={cn("h-4 w-4", activeFilterCount > 0 && "text-gqm-yellow")} />
              <span className="font-semibold">{t("filtersButton")}</span>
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-gqm-yellow text-gqm-green-dark border-none">
                  {activeFilterCount}
                </Badge>
              )}
              {expanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>

            {onExportClick && (
              <Button
                onClick={onExportClick}
                variant="outline"
                className="h-9 border-slate-200 text-slate-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 rounded-xl gap-2 font-semibold transition-all px-3 sm:h-10 sm:px-4"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">{tCommon("export")}</span>
              </Button>
            )}

            {onAddNew && (
              <Button onClick={onAddNew} className="h-9 bg-gqm-green-dark hover:bg-gqm-green text-white rounded-xl shadow-sm border-none gap-2 font-semibold sm:h-10">
                <PlusCircle className="h-4 w-4" />
                <span>{t("filtersAddNew")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Fila de búsqueda principal ─────────────────── */}
        <div className="flex gap-2 sm:gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-gqm-green-dark transition-colors sm:left-4 sm:h-5 sm:w-5" />
            <Input
              type="text"
              placeholder={t("filtersSearch")}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-11 pl-10 pr-3 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-gqm-green-dark focus-visible:bg-white transition-all text-sm placeholder:text-slate-400 shadow-none sm:h-12 sm:pl-12 sm:pr-4 sm:text-base"
            />
          </div>
          <Button onClick={onSearchSubmit} size="lg" className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md gap-2 font-bold shrink-0 sm:h-12 sm:px-8">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">{t("filtersAnalyze")}</span>
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="outline" onClick={onResetFilters} size="lg" className="h-11 px-3 rounded-xl border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-bold shrink-0 gap-1.5 sm:h-12 sm:px-6 sm:gap-2">
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("filtersReset")}</span>
            </Button>
          )}
        </div>

        {/* ── Panel de filtros avanzados (expandible) ─────────────── */}
        <div 
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            expanded ? "grid-rows-[1fr] opacity-100 pt-4 border-t border-slate-100" : "grid-rows-[0fr] opacity-0 invisible overflow-hidden"
          )}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {/* Estado */}
              <FilterSelect
                label={t("filterStatus")}
                icon={<Tag className="h-3.5 w-3.5" />}
                value={status || "all"}
                onValueChange={onStatusChange}
                placeholder={t("filterStatusPlaceholder")}
              >
                {jobStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                       {s.color && <div className={cn("h-2 w-2 rounded-full", s.color)} />}
                       {s.label}
                    </div>
                  </SelectItem>
                ))}
              </FilterSelect>

              {/* Miembro / Asociado */}
              <FilterSelect
                label={t("filterRep")}
                icon={<Users className="h-3.5 w-3.5" />}
                value={memberId || "all"}
                onValueChange={onMemberChange}
                disabled={loading}
                placeholder={loading ? t("filterLoading") : t("filterRepPlaceholder")}
              >
                <SelectItem value="all">{t("filterAllMembers")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.ID_Member} value={m.ID_Member}>
                    {m.Member_Name ?? m.ID_Member}
                  </SelectItem>
                ))}
              </FilterSelect>

              {/* Cliente */}
              <FilterSelect
                label={t("filterClient")}
                icon={<Building2 className="h-3.5 w-3.5" />}
                value={clientId || "all"}
                onValueChange={onClientChange}
                disabled={loading}
                placeholder={loading ? t("filterLoading") : t("filterClientPlaceholder")}
              >
                <SelectItem value="all">{t("filterAllCommunities")}</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.ID_Client} value={c.ID_Client}>
                    {c.Client_Community ?? c.ID_Client}
                  </SelectItem>
                ))}
              </FilterSelect>

              {/* Compañía padre */}
              <FilterSelect
                 label={t("filterParent")}
                 icon={<Globe className="h-3.5 w-3.5" />}
                 value={parentMgmtCoId || "all"}
                 onValueChange={onParentMgmtCoChange}
                 disabled={loading}
                 placeholder={loading ? t("filterLoading") : t("filterParentPlaceholder")}
               >
                <SelectItem value="all">{t("filterAllEntities")}</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.ID_Community_Tracking} value={p.ID_Community_Tracking}>
                    {p.Property_mgmt_co ?? p.ID_Community_Tracking}
                  </SelectItem>
                ))}
              </FilterSelect>

              {/* Rango de fechas */}
              <div className="space-y-2 group">
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-gqm-green-dark" />
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">{t("filterDateFrom")}</label>
                </div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/30 group-focus-within:bg-white transition-all shadow-none"
                />
              </div>

              <div className="space-y-2 group">
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-gqm-green-dark" />
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">{t("filterDateTo")}</label>
                </div>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/30 group-focus-within:bg-white transition-all shadow-none"
                />
              </div>
            </div>
            
            {/* Quick Badges visible when collapsed but filters active */}
            {activeFilterCount > 0 && !expanded && (
               <div className="mt-4 flex flex-wrap gap-2">
                  {status && <ActiveBadge label="Status" value={status} onClear={() => onStatusChange("all")} />}
                  {memberId && <ActiveBadge label="Rep" value={members.find(m => m.ID_Member === memberId)?.Member_Name || memberId} onClear={() => onMemberChange("all")} />}
                  {clientId && <ActiveBadge label="Client" value={clients.find(c => c.ID_Client === clientId)?.Client_Community || clientId} onClear={() => onClientChange("all")} />}
                  {parentMgmtCoId && <ActiveBadge label="Parent" value={parents.find(p => p.ID_Community_Tracking === parentMgmtCoId)?.Property_mgmt_co || parentMgmtCoId} onClear={() => onParentMgmtCoChange("all")} />}
                  {dateFrom && <ActiveBadge label="From" value={dateFrom} onClear={() => onDateFromChange("")} />}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ label, icon, value, onValueChange, disabled, placeholder, children }: any) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 px-1">
        <span className="text-slate-400 group-focus-within:text-gqm-green-dark transition-colors">{icon}</span>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">{label}</label>
      </div>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/30 group-focus-within:bg-white transition-all shadow-none hover:bg-slate-50">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-xl shadow-xl border-slate-100 max-h-[300px]">
          {children}
        </SelectContent>
      </Select>
    </div>
  )
}

function ActiveBadge({ label, value, onClear }: { label: string, value: string, onClear: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200 group hover:border-slate-300 transition-all">
      <span className="text-slate-400 font-medium">{label}:</span>
      <span>{value}</span>
      <button onClick={onClear} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}