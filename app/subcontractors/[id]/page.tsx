"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimelineItem } from "@/components/molecules/TimelineItem"
import { TechnicianCard } from "@/components/organisms/TechnicianCard"
import { DeleteTechnicianDialog } from "@/components/organisms/DeleteTechnicianDialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  ExternalLink,
  Save,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Link2,
  Unlink,
  Loader2,
  MapPin,
  Map,
  X,
} from "lucide-react"
import type { Subcontractor } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Skill = {
  ID_Skill: string
  Skill_name?: string | null
  Division_trade?: string | null
}

type SubcontractorTechnician = {
  ID_Technician: string
  Name?: string | null
  Email_Address?: string | null
  Location?: string | null
  Phone_Number?: string | null
  Type_of_technician?: "Leader" | "Worker" | string | null
  ID_Subcontractor?: string | null
  tasks?: any[]
}

type SubcontractorDetailsResponse = Subcontractor & {
  technicians?: SubcontractorTechnician[]
  attachments?: any[]
  opportunities?: any[]
  orders?: any[]
  jobs?: any[]
  skills?: Skill[]
  tlactivity?: any[]
  role?: any
  podio_item_id?: string | null
  Coverage_Area?: string[] | null
}

const ITEMS_PER_PAGE = 10

const COVERAGE_AREA_OPTIONS = [
  "Dade County",
  "Broward County",
  "Palm Beach County",
  "St. Lucie County",
  "Orange County",
  "Seminole County",
  "Pinellas County (St Pete)",
  "Hillsborough County (Tampa)",
  "Osceola County",
] as const

const asString = (v: unknown) => (v == null ? "" : String(v))

const normalizeOrg = (org?: string | null) => {
  if (!org) return ""
  const s = org.trim()
  if (!s) return ""
  if (s.startsWith("{") && s.endsWith("}")) {
    const inner = s.slice(1, -1).trim()
    return inner.replace(/^"+|"+$/g, "").replace(/\\"/g, '"').trim()
  }
  return s.replace(/\\"/g, '"').trim()
}

const safeWebsite = (url?: string | null) => {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`
}

function normalizeSkillsResponse(data: any): Skill[] {
  if (Array.isArray(data)) return data as Skill[]
  if (Array.isArray(data?.results)) return data.results as Skill[]
  if (Array.isArray(data?.data)) return data.data as Skill[]
  return []
}

export default function SubcontractorDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const activeTab = searchParams.get("tab") || "details"

  const [user, setUser] = useState<any>(null)

  const [subcontractor, setSubcontractor] = useState<SubcontractorDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<Partial<SubcontractorDetailsResponse>>({})

  // ✅ Toggle Podio for EDIT (PATCH)
  const [syncWithPodio, setSyncWithPodio] = useState(true)

  // ✅ Save button loading
  const [isSaving, setIsSaving] = useState(false)

  const [technicians, setTechnicians] = useState<SubcontractorTechnician[]>([])
  const [techSearch, setTechSearch] = useState("")
  const [techTypeFilter, setTechTypeFilter] = useState<"all" | "Leader" | "Worker">("all")
  const [techPage, setTechPage] = useState(1)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; technician: SubcontractorTechnician | null }>({
    open: false,
    technician: null,
  })

  // ---------------------------
  // Skills UI state
  // ---------------------------
  const [skillsSyncWithPodio, setSkillsSyncWithPodio] = useState(true)
  const [skillsModalOpen, setSkillsModalOpen] = useState(false)
  const [skillsDbLoading, setSkillsDbLoading] = useState(false)
  const [skillsDbError, setSkillsDbError] = useState<string | null>(null)
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [skillsSearch, setSkillsSearch] = useState("")
  const [skillsPage, setSkillsPage] = useState(1)
  const [isLinkingSkillId, setIsLinkingSkillId] = useState<string | null>(null)
  const [isUnlinkingSkillId, setIsUnlinkingSkillId] = useState<string | null>(null)

  // Coverage area picker (details)
  const [coveragePick, setCoveragePick] = useState<string>("")

  const fetchSubcontractor = async () => {
    if (!id) return

    try {
      setLoading(true)
      setLoadError(null)

      const response = await fetch(`/api/subcontractors/${id}`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Failed to fetch subcontractor (${response.status})`)
      }

      const data = (await response.json()) as SubcontractorDetailsResponse

      const normalized: SubcontractorDetailsResponse = {
        ...data,
        Organization: normalizeOrg(data.Organization as any),
        technicians: Array.isArray(data.technicians) ? data.technicians : [],
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
        orders: Array.isArray(data.orders) ? data.orders : [],
        jobs: Array.isArray(data.jobs) ? data.jobs : [],
        skills: Array.isArray(data.skills) ? (data.skills as Skill[]) : [],
        tlactivity: Array.isArray(data.tlactivity) ? data.tlactivity : [],
        Coverage_Area: Array.isArray((data as any).Coverage_Area) ? ((data as any).Coverage_Area as string[]) : [],
      }

      setSubcontractor(normalized)
      setFormData(normalized)
      setTechnicians(normalized.technicians ?? [])
      setTechPage(1)

      // (Optional) keep edit sync toggle default ON; do nothing here
    } catch (error: any) {
      console.error("Error fetching subcontractor:", error)
      setSubcontractor(null)
      setFormData({})
      setTechnicians([])
      setLoadError(error?.message ?? "Failed to load subcontractor")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  useEffect(() => {
    if (!user || !id) return
    fetchSubcontractor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  const handleFieldChange = (field: keyof SubcontractorDetailsResponse, value: any) => {
    setEditedFields((prev) => {
      const next = new Set(prev)
      next.add(field as string)
      return next
    })
    setFormData((prev) => ({ ...prev, [field]: value }))
    setIsEditing(true)
  }

  const handleSaveChanges = async () => {
    if (!id) return
    if (isSaving) return

    try {
      setIsSaving(true)

      const response = await fetch(`/api/subcontractors/${id}?sync_podio=${syncWithPodio ? "true" : "false"}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to update subcontractor (${response.status})`)
      }

      const updated = (await response.json()) as SubcontractorDetailsResponse
      const normalized: SubcontractorDetailsResponse = {
        ...updated,
        Organization: normalizeOrg(updated.Organization as any),
        technicians: Array.isArray(updated.technicians) ? updated.technicians : technicians,
        attachments: Array.isArray(updated.attachments) ? updated.attachments : subcontractor?.attachments ?? [],
        opportunities: Array.isArray(updated.opportunities) ? updated.opportunities : subcontractor?.opportunities ?? [],
        orders: Array.isArray(updated.orders) ? updated.orders : subcontractor?.orders ?? [],
        jobs: Array.isArray(updated.jobs) ? updated.jobs : subcontractor?.jobs ?? [],
        skills: Array.isArray(updated.skills) ? (updated.skills as Skill[]) : subcontractor?.skills ?? [],
        tlactivity: Array.isArray(updated.tlactivity) ? updated.tlactivity : subcontractor?.tlactivity ?? [],
        Coverage_Area: Array.isArray((updated as any).Coverage_Area) ? ((updated as any).Coverage_Area as string[]) : [],
      }

      setSubcontractor(normalized)
      setFormData(normalized)
      setIsEditing(false)
      setEditedFields(new Set())
    } catch (error) {
      console.error("Error updating subcontractor:", error)
      alert("Failed to update subcontractor.")
    } finally {
      setIsSaving(false)
    }
  }

  // ---------------------------
  // Coverage Area helpers (Details)
  // ---------------------------
  const coverageAreas = useMemo(() => {
    const arr = (formData as any)?.Coverage_Area
    return Array.isArray(arr) ? (arr as string[]) : []
  }, [formData])

  const addCoverageArea = (valueRaw?: string) => {
    const value = asString(valueRaw ?? coveragePick).trim()
    if (!value) return

    const next = Array.from(new Set([...coverageAreas, value].map((x) => x.trim()).filter(Boolean)))

    handleFieldChange("Coverage_Area" as any, next)
    setCoveragePick("")
  }

  const removeCoverageArea = (value: string) => {
    const next = coverageAreas.filter((x) => x !== value)
    handleFieldChange("Coverage_Area" as any, next)
  }

  // ---------------------------
  // Skills helpers
  // ---------------------------
  const linkedSkillIds = useMemo(() => {
    const ids = new Set<string>()
    for (const s of subcontractor?.skills ?? []) {
      if (s?.ID_Skill) ids.add(s.ID_Skill)
    }
    return ids
  }, [subcontractor?.skills])

  const fetchAllSkills = async () => {
    try {
      setSkillsDbLoading(true)
      setSkillsDbError(null)

      const res = await fetch(`/api/skills`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const detail = body?.detail || body?.error || body?.message || `Failed (${res.status})`
        throw new Error(detail)
      }

      const data = await res.json()
      const list = normalizeSkillsResponse(data)

      setAllSkills(Array.isArray(list) ? list : [])
      setSkillsPage(1)
    } catch (e: any) {
      console.error("fetchAllSkills error:", e)
      setAllSkills([])
      setSkillsDbError(e?.message ?? "Failed to load skills")
    } finally {
      setSkillsDbLoading(false)
    }
  }

  const openSkillsModal = async () => {
    setSkillsModalOpen(true)
    if (!allSkills.length) {
      await fetchAllSkills()
    }
  }

  const linkSkill = async (skillId: string) => {
    if (!id) return
    try {
      setIsLinkingSkillId(skillId)

      const res = await fetch(
        `/api/skills_subcontractors/skills/${encodeURIComponent(skillId)}/subcontractors/${encodeURIComponent(
          id
        )}?sync_podio=${skillsSyncWithPodio ? "true" : "false"}`,
        { method: "POST", cache: "no-store" }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const detail = body?.detail || body?.error || body?.message || `Failed (${res.status})`
        throw new Error(detail)
      }

      await fetchSubcontractor()
    } catch (e: any) {
      console.error("linkSkill error:", e)
      alert(e?.message ?? "Failed to link skill")
    } finally {
      setIsLinkingSkillId(null)
    }
  }

  const unlinkSkill = async (skillId: string) => {
    if (!id) return
    try {
      setIsUnlinkingSkillId(skillId)

      const res = await fetch(
        `/api/skills_subcontractors/skills/${encodeURIComponent(skillId)}/subcontractors/${encodeURIComponent(
          id
        )}?sync_podio=${skillsSyncWithPodio ? "true" : "false"}`,
        { method: "DELETE", cache: "no-store" }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const detail = body?.detail || body?.error || body?.message || `Failed (${res.status})`
        throw new Error(detail)
      }

      await fetchSubcontractor()
    } catch (e: any) {
      console.error("unlinkSkill error:", e)
      alert(e?.message ?? "Failed to unlink skill")
    } finally {
      setIsUnlinkingSkillId(null)
    }
  }

  const filteredSkillsDb = useMemo(() => {
    const q = skillsSearch.trim().toLowerCase()
    if (!q) return allSkills
    return allSkills.filter((s) => {
      const name = asString(s.Skill_name).toLowerCase()
      const div = asString(s.Division_trade).toLowerCase()
      const sid = asString(s.ID_Skill).toLowerCase()
      return name.includes(q) || div.includes(q) || sid.includes(q)
    })
  }, [allSkills, skillsSearch])

  const SKILLS_PAGE_SIZE = 12
  const skillsTotalPages = Math.max(1, Math.ceil(filteredSkillsDb.length / SKILLS_PAGE_SIZE))
  const skillsStart = (skillsPage - 1) * SKILLS_PAGE_SIZE
  const skillsEnd = skillsStart + SKILLS_PAGE_SIZE
  const paginatedSkillsDb = filteredSkillsDb.slice(skillsStart, skillsEnd)

  useEffect(() => {
    setSkillsPage(1)
  }, [skillsSearch])

  // ---------------------------
  // Technicians
  // ---------------------------
  const filteredTechnicians = useMemo(() => {
    const q = techSearch.trim().toLowerCase()
    return technicians.filter((t) => {
      const name = asString(t.Name).toLowerCase()
      const email = asString(t.Email_Address).toLowerCase()
      const tid = asString(t.ID_Technician).toLowerCase()
      const type = asString(t.Type_of_technician)
      const matchesSearch = !q || name.includes(q) || email.includes(q) || tid.includes(q)
      const matchesType = techTypeFilter === "all" || type === techTypeFilter
      return matchesSearch && matchesType
    })
  }, [technicians, techSearch, techTypeFilter])

  const techTotalPages = Math.max(1, Math.ceil(filteredTechnicians.length / ITEMS_PER_PAGE))
  const techStartIndex = (techPage - 1) * ITEMS_PER_PAGE
  const techEndIndex = techStartIndex + ITEMS_PER_PAGE
  const paginatedTechnicians = filteredTechnicians.slice(techStartIndex, techEndIndex)

  useEffect(() => {
    setTechPage(1)
  }, [techSearch, techTypeFilter])

  const leaderTechnician = useMemo(() => {
    return (technicians ?? []).find((t) => asString(t.Type_of_technician) === "Leader") ?? null
  }, [technicians])

  const handleViewTechnician = (techId: string) => {
    router.push(`/subcontractors/${id}/technicians/${techId}`)
  }

  const handleDeleteTechnician = (techId: string) => {
    const tech = technicians.find((t) => t.ID_Technician === techId) ?? null
    if (tech) setDeleteDialog({ open: true, technician: tech })
  }

  const confirmDeleteTechnician = async () => {
    if (!deleteDialog.technician?.ID_Technician) return

    try {
      await fetch(`/api/technicians/${deleteDialog.technician.ID_Technician}`, {
        method: "DELETE",
        cache: "no-store",
      }).catch(() => null)

      setTechnicians((prev) => prev.filter((t) => t.ID_Technician !== deleteDialog.technician?.ID_Technician))
      setDeleteDialog({ open: false, technician: null })
    } catch (error) {
      console.error("Error deleting technician:", error)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex h-64 items-center justify-center rounded-lg border bg-white">
              <p className="text-gray-500">Loading subcontractor...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!subcontractor) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <Button variant="ghost" onClick={() => router.push("/subcontractors")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Subcontractors
            </Button>

            <Card className="p-6">
              <h1 className="text-xl font-semibold">Subcontractor could not be loaded</h1>
              <p className="mt-2 text-sm text-red-600">{loadError ?? "Unknown error."}</p>
              <div className="mt-4">
                <Button onClick={fetchSubcontractor}>Retry</Button>
              </div>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  const website = safeWebsite(asString(formData.Organization_Website))

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <Button variant="ghost" onClick={() => router.push("/subcontractors")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subcontractors
          </Button>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{subcontractor.Name ?? "-"}</h1>
                  <p className="text-muted-foreground">{subcontractor.ID_Subcontractor ?? id}</p>
                </div>

                {/* ✅ Header actions: Sync + Save */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-yellow-500 px-4 py-1 text-sm font-semibold text-white">
                    Score: {subcontractor.Score ?? "-"}
                  </span>

                  <span
                    className={`rounded-full px-4 py-1 text-sm font-semibold ${
                      subcontractor.Status === "Active" ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                    }`}
                  >
                    {subcontractor.Status ?? "Unknown"}
                  </span>

                  <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Sync with Podio</div>
                      <div className="text-xs text-gray-500">Applies to save changes</div>
                    </div>
                    <Switch checked={syncWithPodio} onCheckedChange={setSyncWithPodio} disabled={isSaving} />
                  </div>

                  {isEditing && editedFields.size > 0 ? (
                    <Button onClick={handleSaveChanges} className="gap-2" disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(value) => router.push(`/subcontractors/${id}?tab=${value}`)} className="w-full">
                <TabsList className="mb-6 inline-flex h-auto flex-wrap gap-2 rounded-lg border bg-white p-1">
                  <TabsTrigger value="details" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="technicians" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Technicians
                  </TabsTrigger>
                  {/* <TabsTrigger value="attachments" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Attachments
                  </TabsTrigger> */}
                  {/* <TabsTrigger value="opportunities" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Opportunities
                  </TabsTrigger> */}
                  <TabsTrigger value="orders" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Orders
                  </TabsTrigger>
                  <TabsTrigger value="jobs" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Jobs
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Skills
                  </TabsTrigger>
                  {/* <TabsTrigger value="timeline" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-gqm-green data-[state=active]:text-white">
                    Timeline
                  </TabsTrigger> */}
                </TabsList>

                {/* -------------------- DETAILS -------------------- */}
                <TabsContent value="details" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="mb-6 text-xl font-semibold">Organization Information</h2>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <Label className="mb-2 block font-semibold">Organization</Label>
                        <Input
                          value={asString(formData.Organization)}
                          onChange={(e) => handleFieldChange("Organization" as any, normalizeOrg(e.target.value))}
                          className={editedFields.has("Organization") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                          disabled={isSaving}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block font-semibold">Website</Label>
                        <div className="relative">
                          <Input
                            value={asString(formData.Organization_Website)}
                            onChange={(e) => handleFieldChange("Organization_Website" as any, e.target.value)}
                            className={editedFields.has("Organization_Website") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                            disabled={isSaving}
                          />

                          {website ? (
                            <a href={website} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2">
                              <ExternalLink className="h-4 w-4 text-blue-600" />
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <Label className="mb-2 block font-semibold">Address</Label>
                        <Textarea
                          value={asString(formData.Address)}
                          onChange={(e) => handleFieldChange("Address" as any, e.target.value)}
                          className={editedFields.has("Address") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                          rows={2}
                          disabled={isSaving}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block font-semibold">Specialty</Label>
                        <Input
                          value={asString(formData.Specialty)}
                          onChange={(e) => handleFieldChange("Specialty" as any, e.target.value)}
                          className={editedFields.has("Specialty") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                          disabled={isSaving}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block font-semibold">Status</Label>
                        <Select value={asString(formData.Status) || "Active"} onValueChange={(v) => handleFieldChange("Status" as any, v)} disabled={isSaving}>
                          <SelectTrigger className={editedFields.has("Status") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="mb-6 text-xl font-semibold">Contact Information</h2>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <Label className="mb-2 block font-semibold">Email</Label>
                        <Input
                          type="email"
                          value={asString(formData.Email_Address)}
                          onChange={(e) => handleFieldChange("Email_Address" as any, e.target.value)}
                          className={editedFields.has("Email_Address") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                          disabled={isSaving}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block font-semibold">Phone Number</Label>
                        <Input
                          value={asString(formData.Phone_Number)}
                          onChange={(e) => handleFieldChange("Phone_Number" as any, e.target.value)}
                          className={editedFields.has("Phone_Number") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Coverage Area */}
                  <Card className="p-6">
                    <div className="mb-6 flex items-center gap-2">
                      <Map className="h-5 w-5 text-gray-700" />
                      <h2 className="text-xl font-semibold">Coverage Area</h2>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                        <div className="relative">
                          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <MapPin className="h-4 w-4" />
                          </div>

                          <Select
                            value={coveragePick || undefined}
                            onValueChange={(v) => {
                              setCoveragePick(v)
                              addCoverageArea(v)
                            }}
                            disabled={isSaving}
                          >
                            <SelectTrigger
                              className={[
                                "h-10 pl-10",
                                editedFields.has("Coverage_Area") ? "border-yellow-500 ring-2 ring-yellow-200" : "",
                              ].join(" ")}
                            >
                              <SelectValue placeholder="Select a county..." />
                            </SelectTrigger>
                            <SelectContent>
                              {COVERAGE_AREA_OPTIONS.map((opt) => (
                                <SelectItem
                                  key={opt}
                                  value={opt}
                                  disabled={coverageAreas.some((x) => x.toLowerCase() === opt.toLowerCase())}
                                >
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button type="button" onClick={() => addCoverageArea()} className="gap-2" disabled={!coveragePick || isSaving}>
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </div>

                      {coverageAreas.length ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {coverageAreas.map((area) => (
                            <Badge key={area} variant="secondary" className="flex items-center gap-2 py-1">
                              {area}
                              <button
                                type="button"
                                onClick={() => removeCoverageArea(area)}
                                className="rounded p-0.5 hover:bg-black/10"
                                aria-label={`Remove ${area}`}
                                disabled={isSaving}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No coverage areas added yet.</p>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="mb-6 text-xl font-semibold">GQM Information</h2>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div>
                        <Label className="mb-2 block font-semibold">Score</Label>
                        <Input
                          type="number"
                          value={formData.Score == null ? "" : String(formData.Score)}
                          onChange={(e) => handleFieldChange("Score" as any, e.target.value === "" ? null : Number(e.target.value))}
                          className={editedFields.has("Score") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                          disabled={isSaving}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block font-semibold">GQM Compliance</Label>
                        <Select
                          value={asString(formData.Gqm_compliance) || "N/A"}
                          onValueChange={(v) => handleFieldChange("Gqm_compliance" as any, v)}
                          disabled={isSaving}
                        >
                          <SelectTrigger className={editedFields.has("Gqm_compliance") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="mb-2 block font-semibold">Best Service Training</Label>
                        <Select
                          value={asString(formData.Gqm_best_service_training) || "N/A"}
                          onValueChange={(v) => handleFieldChange("Gqm_best_service_training" as any, v)}
                          disabled={isSaving}
                        >
                          <SelectTrigger className={editedFields.has("Gqm_best_service_training") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-3">
                        <Label className="mb-2 block font-semibold">Notes</Label>
                        <Textarea
                          value={asString(formData.Notes)}
                          onChange={(e) => handleFieldChange("Notes" as any, e.target.value)}
                          className={editedFields.has("Notes") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                          rows={3}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* -------------------- TECHNICIANS / SKILLS / PLACEHOLDERS -------------------- */}
                {/* (El resto del archivo queda igual que antes; no lo toqué para no meterte ruido) */}

                <TabsContent value="technicians" className="space-y-6">
                  {/* ... igual que tu versión previa ... */}
                  <Card className="p-6">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative sm:w-80">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="Search technicians..." value={techSearch} onChange={(e) => setTechSearch(e.target.value)} className="pl-10" />
                        </div>

                        <Select value={techTypeFilter} onValueChange={(v: any) => setTechTypeFilter(v)}>
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Leader">Leader</SelectItem>
                            <SelectItem value="Worker">Worker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={() => router.push(`/subcontractors/${id}/technicians/create`)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Technician
                      </Button>
                    </div>

                    {paginatedTechnicians.length ? (
                      <>
                        <div className="grid gap-6 sm:grid-cols-2">
                          {paginatedTechnicians.map((t) => (
                            <TechnicianCard
                              key={t.ID_Technician}
                              technician={
                                {
                                  ID_Technician: t.ID_Technician,
                                  Name: t.Name ?? "",
                                  Email: t.Email_Address ?? "",
                                  Location: t.Location ?? "",
                                  Phone_number: t.Phone_Number ?? "",
                                  Type: (t.Type_of_technician as any) ?? "Worker",
                                  ID_Subcontractor: t.ID_Subcontractor ?? subcontractor.ID_Subcontractor,
                                } as any
                              }
                              onView={(techId) => router.push(`/subcontractors/${id}/technicians/${techId}`)}
                              onDelete={(techId) => {
                                const tech = technicians.find((x) => x.ID_Technician === techId) ?? null
                                if (tech) setDeleteDialog({ open: true, technician: tech })
                              }}
                            />
                          ))}
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t pt-4">
                          <p className="text-sm text-muted-foreground">
                            Showing {filteredTechnicians.length ? techStartIndex + 1 : 0} to {Math.min(techEndIndex, filteredTechnicians.length)} of{" "}
                            {filteredTechnicians.length} technicians
                          </p>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setTechPage((p) => Math.max(1, p - 1))} disabled={techPage === 1}>
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>

                            <span className="text-sm">
                              Page {techPage} of {techTotalPages}
                            </span>

                            <Button variant="outline" size="sm" onClick={() => setTechPage((p) => Math.min(techTotalPages, p + 1))} disabled={techPage === techTotalPages}>
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground">No technicians found</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="skills" className="space-y-6">
                  {/* ... tu bloque de skills existente (sin cambios) ... */}
                  <Card className="p-6">
                    {/* header skills */}
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gqm-yellow/30">
                          <Wrench className="h-5 w-5 text-gqm-green-dark" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">Skills</h2>
                          <p className="text-sm text-muted-foreground">Manage the skills linked to this subcontractor.</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-2">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">Sync with Podio</div>
                            <div className="text-xs text-gray-500">Applies to link/unlink</div>
                          </div>
                          <Switch checked={skillsSyncWithPodio} onCheckedChange={setSkillsSyncWithPodio} />
                        </div>

                        <Button onClick={openSkillsModal} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Link Skill
                        </Button>
                      </div>
                    </div>

                    {/* linked list */}
                    {Array.isArray(subcontractor.skills) && subcontractor.skills.length ? (
                      <div className="space-y-3">
                        {subcontractor.skills
                          .slice()
                          .sort((a, b) => asString(a.Skill_name).localeCompare(asString(b.Skill_name)))
                          .map((s) => {
                            const sid = s.ID_Skill
                            const busy = isUnlinkingSkillId === sid
                            return (
                              <div key={sid} className="flex flex-col gap-2 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="bg-gqm-green text-white hover:bg-gqm-green/90">{asString(s.Division_trade) || "No division"}</Badge>
                                    <div className="truncate font-medium">{asString(s.Skill_name) || "Unnamed skill"}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    ID: <span className="font-mono">{sid}</span>
                                  </div>
                                </div>

                                <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={() => unlinkSkill(sid)} disabled={busy}>
                                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                  Unlink
                                </Button>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-white p-8 text-center">
                        <p className="text-sm text-muted-foreground">No skills linked yet.</p>
                        <div className="mt-4">
                          <Button onClick={openSkillsModal} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Link first skill
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* modal skills */}
                  <Dialog open={skillsModalOpen} onOpenChange={setSkillsModalOpen}>
                    <DialogContent className="max-w-5xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Link2 className="h-5 w-5 text-gqm-green" />
                          Link a Skill
                        </DialogTitle>
                        <DialogDescription>Search and link a skill from the database. Already linked skills are disabled.</DialogDescription>
                      </DialogHeader>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="relative w-full sm:w-[420px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={skillsSearch} onChange={(e) => setSkillsSearch(e.target.value)} placeholder="Search by name, division, or ID..." className="pl-10" />
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={fetchAllSkills} disabled={skillsDbLoading} className="gap-2">
                              {skillsDbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Refresh
                            </Button>
                          </div>
                        </div>

                        {skillsDbError ? <div className="rounded-lg border bg-red-50 p-4 text-sm text-red-700">{skillsDbError}</div> : null}

                        <div className="rounded-lg border bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[160px]">ID</TableHead>
                                <TableHead>Skill Name</TableHead>
                                <TableHead className="w-[240px]">Division / Trade</TableHead>
                                <TableHead className="w-[160px] text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {skillsDbLoading ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                    Loading skills...
                                  </TableCell>
                                </TableRow>
                              ) : paginatedSkillsDb.length ? (
                                paginatedSkillsDb.map((s) => {
                                  const sid = s.ID_Skill
                                  const already = linkedSkillIds.has(sid)
                                  const busy = isLinkingSkillId === sid
                                  return (
                                    <TableRow key={sid}>
                                      <TableCell className="font-mono text-xs">{sid}</TableCell>
                                      <TableCell className="font-medium">{asString(s.Skill_name) || "-"}</TableCell>
                                      <TableCell>{asString(s.Division_trade) || "-"}</TableCell>
                                      <TableCell className="text-right">
                                        <Button size="sm" className="gap-2" onClick={() => linkSkill(sid)} disabled={already || busy} variant={already ? "outline" : "default"}>
                                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                                          {already ? "Linked" : "Link"}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                    No skills found.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-muted-foreground">
                            Showing {filteredSkillsDb.length ? skillsStart + 1 : 0} to {Math.min(skillsEnd, filteredSkillsDb.length)} of {filteredSkillsDb.length} skills
                          </p>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSkillsPage((p) => Math.max(1, p - 1))} disabled={skillsPage === 1}>
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>

                            <span className="text-sm">
                              Page {skillsPage} of {skillsTotalPages}
                            </span>

                            <Button variant="outline" size="sm" onClick={() => setSkillsPage((p) => Math.min(skillsTotalPages, p + 1))} disabled={skillsPage === skillsTotalPages}>
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSkillsModalOpen(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="mb-2 text-xl font-semibold">Attachments</h2>
                    <p className="text-sm text-muted-foreground">Base ready. Once you have examples with attachments, we can render previews, downloads, and metadata here.</p>
                  </Card>
                </TabsContent>

                <TabsContent value="opportunities" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="mb-2 text-xl font-semibold">Opportunities</h2>
                    <p className="text-sm text-muted-foreground">Base ready. When opportunities are present in the JSON, we’ll map them into a table/cards here.</p>
                  </Card>
                </TabsContent>

                <TabsContent value="orders" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="mb-2 text-xl font-semibold">Orders</h2>
                    <p className="text-sm text-muted-foreground">Base ready. When orders are present in the JSON, we’ll render them here (and enable view/create flows).</p>
                  </Card>
                </TabsContent>

                <TabsContent value="jobs" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="mb-2 text-xl font-semibold">Jobs</h2>
                    <p className="text-sm text-muted-foreground">Base ready. When jobs are present in the JSON, we’ll render active jobs and related info here.</p>
                  </Card>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="mb-4 text-xl font-semibold">Timeline</h2>
                    {Array.isArray(subcontractor.tlactivity) && subcontractor.tlactivity.length ? (
                      <div className="space-y-3">
                        {subcontractor.tlactivity.slice(0, 10).map((ev: any, idx: number) => (
                          <TimelineItem
                            key={ev?.id ?? ev?.podio_item_id ?? idx}
                            activity={asString(ev?.activity ?? ev?.Action ?? "Activity")}
                            date={asString(ev?.date ?? ev?.Created_At ?? new Date().toISOString())}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No timeline activity found for this subcontractor.</p>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Leader Information</h2>

                {leaderTechnician ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-gqm-yellow text-gqm-green-dark text-lg font-semibold">
                          {asString(leaderTechnician.Name)
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "LT"}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-semibold">{leaderTechnician.Name ?? "-"}</h3>
                        <p className="text-sm text-muted-foreground">{leaderTechnician.ID_Technician}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Organization:</span> {asString(subcontractor.Organization) || "-"}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span> {leaderTechnician.Phone_Number ?? "-"}
                      </p>
                      <p>
                        <span className="font-medium">Location:</span> {leaderTechnician.Location ?? "-"}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {leaderTechnician.Email_Address ?? "-"}
                      </p>
                      <p>
                        <span className="font-medium">Type:</span> {asString(leaderTechnician.Type_of_technician) || "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No leader assigned</p>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="mb-2 text-xl font-semibold">Quick Summary</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Technicians:</span> {technicians.length}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Attachments:</span> {subcontractor.attachments?.length ?? 0}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Orders:</span> {subcontractor.orders?.length ?? 0}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Jobs:</span> {subcontractor.jobs?.length ?? 0}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Opportunities:</span> {subcontractor.opportunities?.length ?? 0}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Skills:</span> {subcontractor.skills?.length ?? 0}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <DeleteTechnicianDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, technician: null })}
        technicianName={deleteDialog.technician?.Name || ""}
        onConfirm={confirmDeleteTechnician}
      />
    </div>
  )
}