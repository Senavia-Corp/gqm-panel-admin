"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Megaphone,
  Search,
  Calendar,
  Zap,
  CheckCircle2,
  Loader2,
  Users,
  AlertCircle,
  ExternalLink,
  Plus,
} from "lucide-react"
import { SectionCard } from "./components/SectionCard"
import { EmptyState } from "./components/EmptyState"
import { TableSkeleton } from "./components/LoadingSkeleton"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { toast } from "@/components/ui/use-toast"
import { LinkSubcontractorModal } from "@/components/organisms/LinkSubcontractorModal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OpportunitySkill {
  ID_Skill: string
  Skill_name: string
  Division_trade: string | null
}

interface Opportunity {
  ID_Opportunities: string
  Project_name: string | null
  Description: string | null
  Priority: string | null
  Start_Date: string | null
  State: boolean | null
  ID_Jobs: string | null
  skills: OpportunitySkill[]
  subcontractors: Array<{ ID_Subcontractor: string }>
  applicants_count: number
}

interface Props {
  subcontractorId?: string | null
  isTechnician?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(val: string | null | undefined) {
  if (!val) return "—"
  const datePart = val.split("T")[0]
  if (!datePart) return "—"
  const [y, m, d] = datePart.split("-").map(Number)
  if (!y || !m || !d) return "—"
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d))
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Critical: "bg-red-100 text-red-700 border-red-200",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpportunitiesPanel({ subcontractorId, isTechnician }: Props) {
  const t = useTranslations("opportunities")
  const [loading, setLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  // Modal state for members
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [activeOppId, setActiveOppId] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [skillFilter, setSkillFilter] = useState<string>("ALL")
  const [availableSkills, setAvailableSkills] = useState<OpportunitySkill[]>([])

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // ── Fetch skills for filter ───────────────────────────────────────────────
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await apiFetch("/api/skills")
        if (!res.ok) return
        const data = await res.json()
        setAvailableSkills(Array.isArray(data) ? data : data.results || [])
      } catch (e) {
        console.error("[OpportunitiesPanel] fetch skills error:", e)
      }
    }
    fetchSkills()
  }, [])

  // ── Fetch opportunities ───────────────────────────────────────────────────
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ state: "active", limit: "100" })
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter)
      if (skillFilter !== "ALL") params.set("skill_id", skillFilter)
      
      const res = await apiFetch(`/api/opportunities?${params}`)
      if (res.status === 404) {
        setOpportunities([])
        return
      }
      if (!res.ok) throw new Error(`Status ${res.status}`)
      
      const data = await res.json()
      // The API uses a paginate decorator that returns { results: [], total: ... }
      if (data && Array.isArray(data.results)) {
        setOpportunities(data.results)
      } else {
        setOpportunities(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error("[OpportunitiesPanel] fetch error:", e)
      setOpportunities([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, priorityFilter, skillFilter])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  // ── Apply Logic ───────────────────────────────────────────────────────────
  const handleApply = async (oppId: string) => {
    if (isTechnician) {
      if (!subcontractorId) {
        toast({
          title: "Error",
          description: "No associated subcontractor found for your account.",
          variant: "destructive",
        })
        return
      }
      
      try {
        setApplyingId(oppId)
        const res = await apiFetch(`/api/opportunities/${oppId}/applicants/${subcontractorId}`, {
          method: "POST",
        })
        
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || "Failed to apply")
        }
        
        toast({
          title: "Success",
          description: "You have applied to this opportunity successfully!",
        })
        fetchOpportunities()
      } catch (e: any) {
        toast({
          title: "Application Failed",
          description: e.message,
          variant: "destructive",
        })
      } finally {
        setApplyingId(null)
      }
    } else {
      // Member flow: open modal
      setActiveOppId(oppId)
      setLinkModalOpen(true)
    }
  }

  const handleLinkSubcontractor = async (subId: string) => {
    if (!activeOppId) return
    
    try {
      const res = await apiFetch(`/api/opportunities/${activeOppId}/applicants/${subId}`, {
        method: "POST",
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to link subcontractor")
      }
      
      toast({
        title: "Linked",
        description: "Subcontractor linked to opportunity successfully.",
      })
      setLinkModalOpen(false)
      fetchOpportunities()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  // ── Render Helpers ────────────────────────────────────────────────────────

  const isApplied = (opp: Opportunity) => {
    if (!subcontractorId) return false
    return opp.subcontractors.some(s => s.ID_Subcontractor === subcontractorId)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-black bg-gradient-to-br from-gqm-green-dark via-[#064e3b] to-emerald-950 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">{t("boardTitle")}</h2>
            <p className="mt-0.5 text-sm text-emerald-100/70">{t("boardSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-emerald-400/20 px-2 text-xs font-bold text-emerald-400 border border-emerald-400/30">
              {Array.isArray(opportunities) ? opportunities.length : 0}
            </span>
            <span className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-wider">{t("active")}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4 mb-8">
            <div className="relative">
              <Search className="h-4 w-4 text-emerald-100/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:ring-emerald-500 rounded-xl h-11"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[180px]">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white h-9 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-emerald-400/50" />
                      <SelectValue placeholder={t("priority")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("allPriorities")}</SelectItem>
                    <SelectItem value="Low">{t("low")}</SelectItem>
                    <SelectItem value="Medium">{t("medium")}</SelectItem>
                    <SelectItem value="High">{t("high")}</SelectItem>
                    <SelectItem value="Critical">{t("critical")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[220px]">
                <Select value={skillFilter} onValueChange={setSkillFilter}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white h-9 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-emerald-400/50" />
                      <SelectValue placeholder={t("skills")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("allSkills")}</SelectItem>
                    {availableSkills.map((skill) => (
                      <SelectItem key={skill.ID_Skill} value={skill.ID_Skill}>
                        {skill.Division_trade || skill.Skill_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(priorityFilter !== "ALL" || skillFilter !== "ALL") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPriorityFilter("ALL")
                    setSkillFilter("ALL")
                  }}
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20 h-9 px-4 rounded-lg text-xs font-bold transition-all"
                >
                  {t("clearFilters")}
                </Button>
              )}
            </div>
          </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-2xl border border-slate-100 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : (!Array.isArray(opportunities) || opportunities.length === 0) ? (
          <EmptyState message="No active opportunities found at the moment." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opp) => {
              const applied = isApplied(opp)
              const priorityClass = opp.Priority ? PRIORITY_COLORS[opp.Priority] : "bg-slate-50 text-slate-400"
              const isApplying = applyingId === opp.ID_Opportunities

              return (
                <div
                  key={opp.ID_Opportunities}
                  className="flex flex-col rounded-2xl border-2 border-black bg-white p-5 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <Zap className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityClass}`}>
                      {opp.Priority ? t(opp.Priority.toLowerCase()) : t("low")}
                    </span>
                  </div>

                  <div className="mb-2">
                    <h4 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {opp.Project_name || t("unnamedProject")}
                    </h4>
                    <p className="text-xs font-mono text-gray-500">{opp.ID_Opportunities}</p>
                  </div>

                  <p className="mb-4 line-clamp-2 text-xs text-gray-600 min-h-[32px]">
                    {opp.Description || t("noDescription")}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4 min-h-[24px]">
                    {opp.skills?.slice(0, 3).map((skill, idx) => (
                      <span key={skill.ID_Skill || idx} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 border border-gray-200">
                        {skill.Division_trade || skill.Skill_name}
                      </span>
                    ))}
                    {opp.skills?.length > 3 && (
                      <span className="text-[10px] text-gray-500 font-medium self-center">
                        +{opp.skills.length - 3} {t("more")}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        {formatDate(opp.Start_Date)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                        <Users className="h-3.5 w-3.5 text-gray-500" />
                        {opp.applicants_count} {t("applicants")}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/opportunities/${opp.ID_Opportunities}`} target="_blank">
                        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </Link>
                      
                      {applied ? (
                        <div className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("applied")}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isApplying}
                          onClick={() => handleApply(opp.ID_Opportunities)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-9 px-4 shadow-sm"
                        >
                          {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                          {isTechnician ? t("apply") : t("link")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>

      <LinkSubcontractorModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onLink={handleLinkSubcontractor}
        excludeIds={opportunities.find(o => o.ID_Opportunities === activeOppId)?.subcontractors?.map(s => s.ID_Subcontractor) || []}
      />
    </div>
  )
}
