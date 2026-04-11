"use client"

import { useEffect, useState } from "react"
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

const JOB_STATUSES: Array<{ label: string; value: string; color?: string }> = [
  { label: "All statuses",                 value: "all" },
  { label: "Assigned / P. Quote",          value: "Assigned/P. Quote",          color: "bg-blue-500" },
  { label: "Waiting for approval",         value: "Waiting for Approval",       color: "bg-yellow-500" },
  { label: "Scheduled / Work in progress", value: "Scheduled / Work in Progress", color: "bg-green-500" },
  { label: "Completed P. INV / POs",       value: "Completed P. INV / POs",       color: "bg-emerald-600" },
  { label: "Invoiced",                     value: "Invoiced",                   color: "bg-purple-500" },
  { label: "Hold",                         value: "HOLD",                       color: "bg-orange-600" },
  { label: "Paid",                         value: "PAID",                       color: "bg-green-600" },
  { label: "Warranty",                     value: "Warranty",                   color: "bg-indigo-500" },
  { label: "Received — stand by",          value: "Received-Stand By",          color: "bg-slate-500" },
  { label: "In progress",                  value: "In Progress",                color: "bg-sky-500" },
  { label: "Completed PVI / POs",          value: "Completed PVI / POs",          color: "bg-teal-600" },
  { label: "Cancelled",                    value: "Cancelled",                  color: "bg-red-500" },
  { label: "Archived",                     value: "Archived",                   color: "bg-gray-700" },
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
      <div className="p-5 space-y-5">
        {/* ── Fila superior: título + año + insignias ─────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gqm-green-dark/10 text-gqm-green-dark">
              <Layers className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
              <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">
                System Registry • Total Records: {count.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
               <Select value={year} onValueChange={onYearChange}>
                <SelectTrigger className="h-10 w-[140px] border-none bg-transparent focus:ring-0 shadow-none font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="All years" />
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
                "h-10 rounded-xl flex items-center gap-2 px-4 transition-all",
                expanded ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none border-none"
              )}
            >
              <Filter className={cn("h-4 w-4", activeFilterCount > 0 && "text-gqm-yellow")} />
              <span className="font-semibold">Filters</span>
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
                className="h-10 border-slate-200 text-slate-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 rounded-xl gap-2 font-semibold transition-all px-4"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}

            {onAddNew && (
              <Button onClick={onAddNew} className="h-10 bg-gqm-green-dark hover:bg-gqm-green text-white rounded-xl shadow-sm border-none gap-2 font-semibold">
                <PlusCircle className="h-4 w-4" /> Add new job
              </Button>
            )}
          </div>
        </div>

        {/* ── Fila de búsqueda principal ─────────────────── */}
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-gqm-green-dark transition-colors" />
            <Input
              type="text"
              placeholder="Quick search by Job ID, Project Name, or Location..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-12 pl-12 pr-4 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-gqm-green-dark focus-visible:bg-white transition-all text-base placeholder:text-slate-400 shadow-none"
            />
          </div>
          <Button onClick={onSearchSubmit} size="lg" className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md gap-2 font-bold shrink-0">
            <Search className="h-5 w-5" /> Analyze
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="outline" onClick={onResetFilters} size="lg" className="h-12 px-6 rounded-xl border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-bold shrink-0 gap-2">
              <RefreshCcw className="h-4 w-4" /> Reset
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
                label="Status"
                icon={<Tag className="h-3.5 w-3.5" />}
                value={status || "all"}
                onValueChange={onStatusChange}
                placeholder="Filter by phase"
              >
                {JOB_STATUSES.map((s) => (
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
                label="Representative"
                icon={<Users className="h-3.5 w-3.5" />}
                value={memberId || "all"}
                onValueChange={onMemberChange}
                disabled={loading}
                placeholder={loading ? "Loading..." : "Search associate"}
              >
                <SelectItem value="all">All members</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.ID_Member} value={m.ID_Member}>
                    {m.Member_Name ?? m.ID_Member}
                  </SelectItem>
                ))}
              </FilterSelect>

              {/* Cliente */}
              <FilterSelect
                label="Client Community"
                icon={<Building2 className="h-3.5 w-3.5" />}
                value={clientId || "all"}
                onValueChange={onClientChange}
                disabled={loading}
                placeholder={loading ? "Loading..." : "Search community"}
              >
                <SelectItem value="all">All communities</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.ID_Client} value={c.ID_Client}>
                    {c.Client_Community ?? c.ID_Client}
                  </SelectItem>
                ))}
              </FilterSelect>

              {/* Compañía padre */}
              <FilterSelect
                 label="Management / Parent"
                 icon={<Globe className="h-3.5 w-3.5" />}
                 value={parentMgmtCoId || "all"}
                 onValueChange={onParentMgmtCoChange}
                 disabled={loading}
                 placeholder={loading ? "Loading..." : "All entities"}
               >
                <SelectItem value="all">Global (All entities)</SelectItem>
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Date From</label>
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Date To</label>
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