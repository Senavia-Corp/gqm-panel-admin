"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Save, RefreshCcw, Zap, ZapOff, Calendar, Hash } from "lucide-react"

import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"

import { mockTimelineEvents } from "@/lib/mock-data"
import { updateJob } from "@/lib/services/jobs-service"
import { fetchClients } from "@/lib/services/clients-service"
import { useToast } from "@/hooks/use-toast"

import { JobRightSidebar } from "@/components/organisms/JobRightSidebar"

import type { Subcontractor, Document, Task, EstimateItem, SubcontractorOrder } from "@/lib/types"
import { ChatSettingsDialog } from "@/components/organisms/ChatSettingsDialog"
import { CostDialog } from "@/components/organisms/CostDialog"
import { AddMemberDialog } from "@/components/organisms/AddMemberDialog"
import { CreateOrderDialog } from "@/components/organisms/CreateOrderDialog"
import { TaskDetailsDialog } from "@/components/organisms/TaskDetailsDialog"
import { CreateTaskDialog } from "@/components/organisms/CreateTaskDialog"
import { LinkSubcontractorDialog } from "@/components/organisms/LinkSubcontractorDialog"

import { useJobDetail } from "./useJobDetail"
import { mapEstimateCostsFromJob, mapEstimateItemToCreatePayload } from "@/lib/mappers/estimate.mapper"

import { mockOrders } from "@/lib/mock-data/estimates"
import type { Cost } from "@/components/organisms/CostBreakdownTable"

import { JobTabLayout } from "@/components/organisms/job-detail/JobTabLayout"
import { JobDetailsTab } from "@/components/organisms/job-detail/tabs/JobDetailsTab"
import { JobDocumentsTab } from "@/components/organisms/job-detail/tabs/JobDocumentsTab"
import { JobChatTab } from "@/components/organisms/job-detail/tabs/JobChatTab"
import { JobPricingTab } from "@/components/organisms/job-detail/tabs/JobPricingTab"
import { JobMembersTab } from "@/components/organisms/job-detail/tabs/JobMembersTab"
import { JobTasksTab } from "@/components/organisms/job-detail/tabs/JobTasksTab"
import { JobEstimateTab } from "@/components/organisms/job-detail/tabs/JobEstimateTab"
import { JobDetailTabs } from "@/components/organisms/JobDetailTabs"
import { JobSubcontractorsTab } from "@/components/organisms/job-detail/tabs/JobSubcontractorsTab"
import { JobTechniciansTab } from "@/components/organisms/job-detail/tabs/JobTechniciansTab"
import { JobPurchasesTab } from "@/components/organisms/job-detail/tabs/JobPurchasesTab"

import { useParams } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { LinkMemberDialog } from "@/components/organisms/LinkMemberDialog"
import { UnlinkMemberDialog } from "@/components/organisms/UnlinkMemberDialog"
import { apiFetch } from "@/lib/apiFetch"


const TechnicianJobSidebar = dynamic(
  () => import("@/components/organisms/TechnicianJobSidebar").then((mod) => mod.TechnicianJobSidebar),
  { ssr: false },
)
const LeadTechnicianPricingView = dynamic(
  () => import("@/components/organisms/LeadTechnicianPricingView").then((mod) => mod.LeadTechnicianPricingView),
  { ssr: false },
)
const LeadTechnicianTechniciansView = dynamic(
  () => import("@/components/organisms/LeadTechnicianTechniciansView").then((mod) => mod.LeadTechnicianTechniciansView),
  { ssr: false },
)

const mockDocuments = [
  { id: "1", fileName: "FileName.jpg", fileSize: "2.5 MB", uploadDate: "01/15/2025", tag: "TAG" },
  { id: "2", fileName: "FileName.jpg", fileSize: "1.8 MB", uploadDate: "01/14/2025", tag: "TAG" },
  { id: "3", fileName: "FileName.jpg", fileSize: "3.2 MB", uploadDate: "01/13/2025", tag: "TAG" },
  { id: "4", fileName: "FileName.jpg", fileSize: "4.1 MB", uploadDate: "01/12/2025", tag: "TAG" },
  { id: "5", fileName: "FileName.jpg", fileSize: "2.9 MB", uploadDate: "01/11/2025", tag: "TAG" },
  { id: "6", fileName: "FileName.jpg", fileSize: "1.5 MB", uploadDate: "01/10/2025", tag: "TAG" },
  { id: "7", fileName: "FileName.jpg", fileSize: "3.7 MB", uploadDate: "01/09/2025", tag: "TAG" },
  { id: "8", fileName: "FileName.jpg", fileSize: "2.2 MB", uploadDate: "01/08/2025", tag: "TAG" },
]

const mockAdminChatMessages = [
  {
    id: "1",
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mollis quam eu libero pharetra, vitae tincidunt ligula tincidunt.",
    sender: { name: "John Smith", avatar: "/placeholder.svg?height=40&width=40", id: "2" },
    timestamp: "6:30 pm",
    isSent: false,
  },
  {
    id: "2",
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mollis quam eu libero pharetra, vitae tincidunt ligula tincidunt.",
    sender: { name: "You", avatar: "/placeholder.svg?height=40&width=40", id: "1" },
    timestamp: "6:30 pm",
    isSent: true,
  },
]

const mockGeneralChatMessages = [
  {
    id: "1",
    content: "Good morning team! Just checking in on the progress.",
    sender: { name: "Sarah Johnson", avatar: "/placeholder.svg?height=40&width=40", id: "3" },
    timestamp: "9:15 am",
    isSent: false,
  },
  {
    id: "2",
    content: "Everything is on track. We should be done by end of day.",
    sender: { name: "You", avatar: "/placeholder.svg?height=40&width=40", id: "1" },
    timestamp: "9:20 am",
    isSent: true,
  },
]

const adminChatParticipants = [
  { id: "1", name: "Admin User", avatar: "/placeholder.svg?height=40&width=40", role: "Administrator" },
  { id: "2", name: "John Smith", avatar: "/placeholder.svg?height=40&width=40", role: "Manager" },
]

const generalChatParticipants = [
  { id: "1", name: "Admin User", avatar: "/placeholder.svg?height=40&width=40", role: "Administrator" },
  { id: "3", name: "Sarah Johnson", avatar: "/placeholder.svg?height=40&width=40", role: "Technician" },
  { id: "4", name: "Mike Davis", avatar: "/placeholder.svg?height=40&width=40", role: "Technician" },
]

const mockCosts: Cost[] = [
  { id: "1", name: "Skilled Labor - Carpentry", quantity: 40, unitPrice: 45, total: 1800, type: "Labor" },
  { id: "2", name: "Lumber - 2x4x8", quantity: 50, unitPrice: 8.5, total: 425, type: "Materials" },
  { id: "3", name: "Concrete Mix", quantity: 20, unitPrice: 12, total: 240, type: "Materials" },
]

const mockAvailableMembers = [
  {
    id: "5",
    name: "Jessica Taylor",
    memberId: "GQM-005",
    avatar: "/placeholder.svg?height=80&width=80",
    role: "Coordinator",
    email: "jessica.taylor@gqm.com",
    phone: "(555) 567-8901",
    address: "654 Maple Dr, Bronx, NY",
    status: "Active",
  },
  {
    id: "6",
    name: "Robert Martinez",
    memberId: "GQM-006",
    avatar: "/placeholder.svg?height=80&width=80",
    role: "Project Manager",
    email: "robert.martinez@gqm.com",
    phone: "(555) 678-9012",
    address: "987 Cedar Ln, Staten Island, NY",
    status: "Active",
  },
]

const STATUS_OPTIONS_BY_JOB_TYPE: Record<string, string[]> = {
  QID: [
    "Assigned/P. Quote",
    "Waiting for Approval",
    "Scheduled / Work in Progress",
    "Cancelled",
    "Completed P. INV / POs",
    "Invoiced",
    "HOLD",
    "PAID",
    "Warranty",
    "Archived",
  ],
  PTL: ["Received-Stand By", "Assigned-In progress", "Completed PVI", "Cancelled", "Paid"],
  PAR: ["In Progress", "Completed PVI / POs", "Invoiced", "PAID", "Cancelled"],
}

// ── Job type → header color ────────────────────────────────────────────────
const JOB_TYPE_BADGE: Record<string, string> = {
  QID: "bg-violet-100 text-violet-700",
  PTL: "bg-sky-100 text-sky-700",
  PAR: "bg-amber-100 text-amber-700",
}

// ── Status → semantic color ────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  "Assigned/P. Quote": "bg-blue-50 text-blue-700 border-blue-200",
  "Waiting for Approval": "bg-amber-50 text-amber-700 border-amber-200",
  "Scheduled / Work in Progress": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Completed P. INV / POs": "bg-teal-50 text-teal-700 border-teal-200",
  "Invoiced": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "HOLD": "bg-orange-50 text-orange-700 border-orange-200",
  "PAID": "bg-green-50 text-green-700 border-green-200",
  "Paid": "bg-green-50 text-green-700 border-green-200",
  "Warranty": "bg-purple-50 text-purple-700 border-purple-200",
  "Cancelled": "bg-red-50 text-red-700 border-red-200",
  "Archived": "bg-slate-100 text-slate-500 border-slate-200",
  "Received-Stand By": "bg-slate-100 text-slate-600 border-slate-200",
  "Assigned-In progress": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Completed PVI": "bg-teal-50 text-teal-700 border-teal-200",
  "In Progress": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Completed PVI / POs": "bg-teal-50 text-teal-700 border-teal-200",
}

type JobDetailPageProps = {
  params: { id: string }
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const routeParams = useParams<{ id: string }>()
  const jobId = String(routeParams?.id ?? "")

  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const [activeTab, setActiveTab] = useState("details")

  const [activeChat, setActiveChat] = useState("general")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<Cost | null>(null)
  const [costs, setCosts] = useState<Cost[]>(mockCosts)

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [availableMembers, setAvailableMembers] = useState(mockAvailableMembers)
  const [clients, setClients] = useState<any[]>([])

  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null)
  const [linkSubcontractorOpen, setLinkSubcontractorOpen] = useState(false)
  const [linkMemberOpen, setLinkMemberOpen] = useState(false)
  const [unlinkMemberOpen, setUnlinkMemberOpen] = useState(false)
  const [unlinkTargetMember, setUnlinkTargetMember] = useState<{ memberId: string; name?: string } | null>(null)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)

  const [selectedEstimateItem, setSelectedEstimateItem] = useState<EstimateItem | null>(null)
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false)
  const [estimateItems, setEstimateItems] = useState<EstimateItem[]>([])
  const [hasSavedEstimates, setHasSavedEstimates] = useState(false)
  const [orders, setOrders] = useState<SubcontractorOrder[]>([])
  const [syncPodio, setSyncPodio] = useState(true)

  const jobDetail = useJobDetail(jobId)
  const job = jobDetail.job

  // ---------------------------
  // helpers basados en jobDetail
  // ---------------------------
  // Read changedFields directly from the hook — do NOT wrap in a helper fn
  // called inside useCallback([]). That pattern creates a stale closure:
  // the callback is created once and always sees the initial (empty) Set,
  // so fields stay highlighted amber even after saving.
  const changedFields: Set<string> = (jobDetail as any).changedFields instanceof Set
    ? (jobDetail as any).changedFields as Set<string>
    : new Set<string>()

  // Depends on `changedFields` — re-memoized every time the Set reference
  // changes (i.e. after every save/reload), so the UI reflects reality.
  const isFieldChanged = useCallback(
    (field: string) => changedFields.has(field),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [changedFields],
  )

  const hasTabChanges = useCallback(
    (tabId: string) => {
      const changed = changedFields

      if (tabId === "details") {
        return [
          "status", "serviceType", "projectName", "projectLocation", "poWtnWo",
          "dateAssigned", "estimatedStartDate", "estimatedDuration", "client", "location",
        ].some((f) => changed.has(f))
      }

      if (tabId === "pricing") {
        return Array.from(changed).some((f) => f.startsWith("pricing.") || f === "pricingTarget")
      }

      if (tabId === "estimate") {
        return Array.from(changed).some((f) => f.startsWith("estimateItem."))
      }

      return false
    },
    [jobDetail],
  )

  // ---------------------------
  // mount + auth
  // ---------------------------
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    setActiveChat(parsedUser.role === "LEAD_TECHNICIAN" ? "general" : "admin")

    setLoadError(null)
    void loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // ---------------------------
  // reload job
  // ---------------------------
  useEffect(() => {
    if (!mounted || !jobId || jobId === "create") return

      ; (async () => {
        try {
          setLoadError(null)

          const reloadedJob = await jobDetail.reload()
          const sourceJob = reloadedJob ?? jobDetail.job
          if (!sourceJob) return

          const { items, hasSaved } = mapEstimateCostsFromJob(sourceJob)
          setEstimateItems(items)
          setHasSavedEstimates(hasSaved)

          loadTasks()
          setOrders(mockOrders.filter((order) => order.ID_Jobs === jobId))
        } catch (err) {
          console.error("[jobs] reload error:", err)
          setLoadError(err instanceof Error ? err.message : "Unexpected error loading job")
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, jobId])

  // ---------------------------
  // data loaders
  // ---------------------------
  const loadClients = async () => {
    try {
      setLoadError(null)
      const { clients: fetchedClients, total } = await fetchClients(1, 5)
      setClients(Array.isArray(fetchedClients) ? fetchedClients : [])
    } catch (error) {
      console.error("[jobs] loadClients error:", error)
      setClients([])
      setLoadError(error instanceof Error ? error.message : "Unexpected error loading clients")
    }
  }

  const loadTasks = async () => {
    // Placeholder
  }

  // ---------------------------
  // event handlers
  // ---------------------------
  const handleRetry = async () => {
    setLoadError(null)
    try {
      await loadClients()
      await jobDetail.reload()
    } catch (err) {
      console.error("[jobs] retry error:", err)
      setLoadError(err instanceof Error ? err.message : "Retry failed")
    }
  }

  const handleSendMessage = (message: string) => {
    console.log("[chat] send:", message)
  }

  const handleSaveChatSettings = (name: string, participants: Array<any>) => {
    console.log("[chat] save settings:", { name, participants })
  }

  const handleEditCost = (cost: Cost) => {
    setEditingCost(cost)
    setIsCostDialogOpen(true)
  }

  const handleDeleteCost = (id: string) => {
    setCosts((prev) => prev.filter((cost) => cost.id !== id))
  }

  const handleAddNewCost = () => {
    setEditingCost(null)
    setIsCostDialogOpen(true)
  }

  const handleSaveCost = (costData: Omit<Cost, "id"> & { id?: string }) => {
    setCosts((prev) => {
      if (costData.id) return prev.map((c) => (c.id === costData.id ? { ...c, ...costData } : c))
      const newCost: Cost = { ...costData, id: Date.now().toString() }
      return [...prev, newCost]
    })
  }

  const handleTaskOpen = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsOpen(true)
  }

  const handleTaskCreated = async () => {
    await jobDetail.reload()
  }

  const handleTaskSave = async () => {
    try {
      await jobDetail.reload()
      setTaskDetailsOpen(false)
      setSelectedTask(null)
    } catch (error) {
      console.error("[tasks] reload after save error:", error)
    }
  }

  const handleTaskDelete = async () => {
    try {
      await jobDetail.reload()
    } catch (error) {
      console.error("[tasks] reload after delete error:", error)
    }
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (!job || !(job as any).tasks) return

    const prevTasks = (job as any).tasks as Task[]
    const updatedTasks = prevTasks.map((task: Task) =>
      task.ID_Tasks === taskId ? { ...task, Task_status: newStatus } : task,
    )
    jobDetail.setJob({ ...(job as any), tasks: updatedTasks } as any)

    try {
      const res = await apiFetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ID_Tasks: taskId,
          Task_status: newStatus,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? data?.detail ?? `Error ${res.status}`)
      }

      await jobDetail.reload()

    } catch (error) {
      console.error("[tasks] status change error:", error)
      jobDetail.setJob({ ...(job as any), tasks: prevTasks } as any)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task status",
        variant: "destructive",
      })
    }
  }

  const handleAddMember = (member: (typeof mockAvailableMembers)[0]) => {
    if (!job) return
    const members = Array.isArray((job as any).members) ? (job as any).members : []
    jobDetail.setJob({ ...(job as any), members: [...members, member] })
      ; (jobDetail as any).markChanged?.("members")

    setAvailableMembers((prev) => prev.filter((m) => m.id !== member.id))
  }

  const handleRemoveMember = (id: string) => {
    if (!job) return
    const members = Array.isArray((job as any).members) ? (job as any).members : []
    const member = members.find((m: any) => m.ID_Member === id)
    if (!member) return

    jobDetail.setJob({ ...(job as any), members: members.filter((m: any) => m.ID_Member !== id) })
      ; (jobDetail as any).markChanged?.("members")

    setAvailableMembers((prev) => [...prev, member])
  }

  const handleFieldChange = (field: string, value: any) => {
    if (!job) return
    jobDetail.setJob({ ...(job as any), [field]: value })
      ; (jobDetail as any).markChanged?.(field)
  }

  const handlePricingFieldChange = (field: string, value: number) => {
    if (!job) return
    if (field !== "gqmTargetSoldPricing") return   // all others are now read-only
    const next: any = { ...(job as any), Gqm_target_sold_pricing: value }
    jobDetail.setJob(next)
      ; (jobDetail as any).markChanged?.("pricing.gqmTargetSoldPricing")
  }

  const handlePricingTargetChange = useCallback((value: string | null) => {
    if (!job) return
    jobDetail.setJob({ ...(job as any), Pricing_target: value } as any)
      ; (jobDetail as any).markChanged?.("pricingTarget")
  }, [job, jobDetail])

  const handlePermitChange = useCallback((value: string | null) => {
    if (!job) return
    jobDetail.setJob({ ...(job as any), Permit: value } as any)
      ; (jobDetail as any).markChanged?.("permit")
  }, [job, jobDetail])

  const handleAdjPricingCalculated = async (_adjPricing: number) => {
    toast({
      title: "Multiplier applied",
      description: "Adjusted Formula Pricing will update after saving. Save Changes to persist.",
    })
  }

  const handleMultipliersChanged = async () => {
    await jobDetail.reload()
  }

  const handleSaveChanges = async () => {
    const anyDetail = jobDetail as any
    try {
      if (typeof anyDetail.save === "function") {
        await anyDetail.save({ sync_podio: syncPodio })
        toast({ title: "Saved", description: "Changes saved successfully." })
        await jobDetail.reload()
        return
      }

      toast({
        title: "Save not wired",
        description: "Your useJobDetail hook doesn't expose save(). Add it to persist changes.",
        variant: "destructive",
      })
    } catch (error) {
      console.error("[job] save error:", error)
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" })
    }
  }

  // ---------------------------
  // estimates
  // ---------------------------
  const handleItemsImported = (items: EstimateItem[]) => {
    setEstimateItems(items)
  }

  const ESTIMATE_POOL_LIMIT = 2
  const ESTIMATE_RETRY_MAX = 3

  function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms))
  }

  function isTransientStatus(status: number) {
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
  }

  function isNetworkError(err: unknown) {
    const msg = String(err ?? "")
    return (
      msg.includes("TypeError: Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("EAI_AGAIN") ||
      msg.includes("fetch failed")
    )
  }

  function getEstimateItemSignature(i: Partial<EstimateItem>) {
    const norm = (v: any) =>
      String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ")
    return [
      norm(i.Title), norm(i.Cost_Code), norm(i.Parent_Group),
      norm(i.Description), norm(i.Unit), norm(i.Category),
    ].join("||")
  }

  function resolvePersistedEstimateId(item: EstimateItem, job: any): string | null {
    const id = String(item?.ID_EstimateItem ?? "")
    if (id && !id.startsWith("TEMP")) return id

    const costs = Array.isArray(job?.estimate_costs) ? job.estimate_costs : []
    const targetSig = getEstimateItemSignature(item)

    const match = costs.find((c: any) => {
      const sig = getEstimateItemSignature({
        Title: c.Title,
        Cost_Code: c.Cost_code ?? c.Cost_Code,
        Parent_Group: c.Parent_group ?? c.Parent_Group,
        Description: c.Description,
        Unit: c.Unit,
        Category: c.Category,
      } as any)
      return sig === targetSig
    })

    const persistedId =
      match?.ID_EstimateCost ?? match?.ID_Estimate_Cost ?? match?.id ?? match?.ID
    return persistedId ? String(persistedId) : null
  }

  function dedupeEstimateItems(items: EstimateItem[]) {
    const seen = new Set<string>()
    const unique: EstimateItem[] = []
    const duplicates: Array<{ idx: number; sig: string; item: EstimateItem }> = []

    items.forEach((it, idx) => {
      const sig = getEstimateItemSignature(it)
      if (seen.has(sig)) {
        duplicates.push({ idx, sig, item: it })
        return
      }
      seen.add(sig)
      unique.push(it)
    })

    return { unique, duplicates, sigSet: seen }
  }

  async function postEstimateWithRetry(payload: any) {
    let lastErr: unknown = null

    for (let attempt = 0; attempt <= ESTIMATE_RETRY_MAX; attempt++) {
      try {
        const response = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          return await response.json().catch(() => ({}))
        }

        const raw = await response.text().catch(() => "")
        let parsed: any = null
        try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = null }

        const errMsg = `POST /api/estimate failed (${response.status}) :: ${parsed?.error ?? parsed?.detail ?? raw ?? "no body"}`

        if (isTransientStatus(response.status) && attempt < ESTIMATE_RETRY_MAX) {
          const backoff = 900 * Math.pow(2, attempt) + Math.floor(Math.random() * 500)
          await sleep(backoff)
          continue
        }

        throw new Error(errMsg)
      } catch (err) {
        lastErr = err
        if (isNetworkError(err) && attempt < ESTIMATE_RETRY_MAX) {
          const backoff = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
          await sleep(backoff)
          continue
        }
        throw err
      }
    }

    throw lastErr ?? new Error("Unknown error")
  }

  async function asyncPool<T, R>(
    poolLimit: number,
    array: T[],
    iteratorFn: (item: T, index: number) => Promise<R>,
  ): Promise<PromiseSettledResult<R>[]> {
    const ret: Promise<PromiseSettledResult<R>>[] = []
    const executing: Promise<any>[] = []

    for (let i = 0; i < array.length; i++) {
      const item = array[i]
      const p = Promise.resolve()
        .then(() => iteratorFn(item, i))
        .then(
          (value) => ({ status: "fulfilled", value } as const),
          (reason) => ({ status: "rejected", reason } as const),
        )

      ret.push(p)

      const e = p.then(() => executing.splice(executing.indexOf(e), 1))
      executing.push(e)

      if (executing.length >= poolLimit) {
        await Promise.race(executing)
      }
    }

    return Promise.all(ret)
  }

  const handleSaveEstimates = async () => {
    if (!estimateItems?.length) {
      toast({ title: "Nothing to save", description: "No estimate items found." })
      return
    }

    const { unique, duplicates } = dedupeEstimateItems(estimateItems)

    const existingCostsRaw = Array.isArray((job as any)?.estimate_costs) ? (job as any).estimate_costs : []
    const existingSigSet = new Set<string>(
      existingCostsRaw.map((c: any) =>
        getEstimateItemSignature({
          Title: c.Title,
          Cost_Code: c.Cost_code ?? c.Cost_Code,
          Parent_Group: c.Parent_group ?? c.Parent_Group,
          Description: c.Description,
          Unit: c.Unit,
          Category: c.Category,
        }),
      ),
    )

    const toCreate = unique.filter((it) => !existingSigSet.has(getEstimateItemSignature(it)))
    const skippedExisting = unique.length - toCreate.length

    if (!toCreate.length) {
      toast({
        title: "Nothing new to save",
        description: `All items already exist in this job. Skipped: ${skippedExisting}.`,
      })
      return
    }

    toast({
      title: "Saving estimates...",
      description: `Creating ${toCreate.length} items (pool=${ESTIMATE_POOL_LIMIT}, retry=${ESTIMATE_RETRY_MAX})`,
    })

    const results = await asyncPool(ESTIMATE_POOL_LIMIT, toCreate, async (item, idx) => {
      const payload = mapEstimateItemToCreatePayload(item, jobId)
      return await postEstimateWithRetry(payload)
    })

    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected") as Array<PromiseRejectedResult>

    if (failed.length) {
      console.error("[estimate] failed items:", failed)
    }

    await jobDetail.reload()

    const skipped = skippedExisting + duplicates.length

    if (!failed.length) {
      toast({
        title: "Estimates saved",
        description: `Created ${succeeded}/${toCreate.length}. Skipped ${skipped} (duplicates/existing).`,
      })
      return
    }

    toast({
      title: "Partial save",
      description: `Created ${succeeded}/${toCreate.length}. Failed ${failed.length}. Skipped ${skipped}. See console for details.`,
      variant: "destructive",
    })
  }

  const handleDeleteAllEstimates = async () => {
    const costs = Array.isArray((job as any)?.estimate_costs) ? (job as any).estimate_costs : []

    if (!costs.length) {
      toast({ title: "Nothing to delete", description: "This job has no saved estimate costs." })
      return
    }

    const ids = costs
      .map((c: any) => String(c?.ID_EstimateCost ?? c?.ID_Estimate_Cost ?? c?.id ?? c?.ID ?? ""))
      .filter(Boolean)

    await asyncPool(2, ids, async (id) => {
      const res = await fetch(`/api/estimate/${id}`, { method: "DELETE" })
      if (res.status === 404) return { ok: true, skipped: true }
      if (!res.ok) {
        const raw = await res.text().catch(() => "")
        throw new Error(`DELETE /api/estimate/${id} failed (${res.status}) :: ${raw}`)
      }
      return res.json().catch(() => ({}))
    })

    setEstimateItems([])
    setHasSavedEstimates(false)
    await jobDetail.reload()

    toast({ title: "Deleted", description: `Deleted ${ids.length} estimate costs.` })
  }

  const handleDeleteEstimateItem = async (item: EstimateItem) => {
    const rawId = String(item?.ID_EstimateItem ?? "")
    if (!rawId || rawId.startsWith("TEMP")) {
      setEstimateItems((prev) => prev.filter((x) => x.ID_EstimateItem !== item.ID_EstimateItem))
      return
    }

    const persistedId = resolvePersistedEstimateId(item, job)
    if (!persistedId) throw new Error("Could not resolve persisted estimate id")

    const res = await fetch(`/api/estimate/${persistedId}`, { method: "DELETE" })

    if (res.status !== 404 && !res.ok) {
      const raw = await res.text().catch(() => "")
      throw new Error(raw || `Failed to delete (${res.status})`)
    }

    await jobDetail.reload()
  }

  const handleCancelImport = () => {
    setEstimateItems([])
  }

  const handleCreateOrder = async (orderName: string, subcontractorId: string, selectedItemIds: string[], syncPodioOverride: boolean) => {
    try {
      const selectedItems = estimateItems.filter((item) => selectedItemIds.includes(item.ID_EstimateItem))
      const formula = selectedItems.reduce((sum, item) => sum + item.Builder_Cost, 0)

      const year = resolveJobYearForPodioSync(job)

      const qs =
        syncPodioOverride
          ? `?sync_podio=true&year=${encodeURIComponent(String(year ?? ""))}`
          : `?sync_podio=false`

      if (syncPodioOverride && !year) {
        toast({ title: "Missing year", description: "Year is required when Sync Podio is enabled.", variant: "destructive" })
        return
      }

      const orderBody: any = {
        Title: orderName,
        Formula: formula,
        Adj_formula: formula,
        ID_Subcontractor: subcontractorId,
        job_podio_id: (job as any)?.podio_item_id ?? null,
      }

      const orderResponse = await apiFetch(`/api/order${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}))
        throw new Error((errorData as any)?.error || (errorData as any)?.detail || "Failed to create order")
      }

      const orderData = await orderResponse.json()
      const orderId = orderData.ID_Order

      const updatePromises = selectedItemIds.map(async (estimateId) => {
        const response = await fetch(`/api/estimate/${estimateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ID_Order: orderId }),
        })
        if (!response.ok) return { success: false, id: estimateId }
        return { success: true, id: estimateId }
      })

      await Promise.allSettled(updatePromises)
      await jobDetail.reload()

      toast({ title: "Success", description: `Order "${orderName}" created successfully.` })
    } catch (error) {
      console.error("[order] create error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create order",
        variant: "destructive",
      })
    }
  }

  // ---------------------------
  // derived / ui
  // ---------------------------
  const tabs = useMemo(
    () =>
      user?.role === "LEAD_TECHNICIAN"
        ? [
          { id: "details", label: "Details" },
          { id: "documents", label: "Documents" },
          { id: "chat", label: "Chat" },
          { id: "pricing", label: "Pricing" },
          { id: "members", label: "Members" },
          { id: "tasks", label: "Tasks" },
          { id: "technicians", label: "Technicians" },
          { id: "purchases", label: "Purchases" },
        ]
        : [
          { id: "details", label: "Details" },
          { id: "subcontractors", label: "Subcontractors" },
          { id: "documents", label: "Documents" },
          { id: "pricing", label: "Pricing" },
          { id: "members", label: "Members" },
          { id: "tasks", label: "Tasks" },
          { id: "estimate", label: "Estimate" },
          { id: "purchases", label: "Purchases" },
        ],
    [user?.role],
  )

  const rightSidebar = useMemo(() => {
    if (!user || !job) return null
    return <JobRightSidebar role={user.role} job={job as any} />
  }, [user, job])

  const technicianSidebar = useMemo(() => {
    if (!job) return null
    return <TechnicianJobSidebar job={job as any} subcontractor={(job as any)?.subcontractors?.[0]} />
  }, [job])

  // ---------------------------
  // renderTab
  // ---------------------------
  const renderTab = () => {
    if (!user || !job) return null

    const Details: React.ComponentType<any> = JobDetailsTab as any
    const Docs: React.ComponentType<any> = JobDocumentsTab as any
    const Chat: React.ComponentType<any> = JobChatTab as any
    const Pricing: React.ComponentType<any> = JobPricingTab as any
    const Members: React.ComponentType<any> = JobMembersTab as any
    const Tasks: React.ComponentType<any> = JobTasksTab as any
    const Estimate: React.ComponentType<any> = JobEstimateTab as any
    const Subcontractors: React.ComponentType<any> = JobSubcontractorsTab as any
    const Technicians: React.ComponentType<any> = JobTechniciansTab as any

    if (activeTab === "details") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <Details
            role={user.role}
            job={job}
            clients={clients}
            statusOptionsByJobType={STATUS_OPTIONS_BY_JOB_TYPE}
            onFieldChange={handleFieldChange}
            isFieldChanged={isFieldChanged}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "documents") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <JobDocumentsTab
            job={job}
            onRefresh={async () => {
              // FIX: recargar el job completo para que job.attachments se actualice
              await jobDetail.reload()
            }}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "chat") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <Chat
            role={user.role}
            activeChat={activeChat}
            setActiveChat={setActiveChat}
            adminChatParticipants={adminChatParticipants}
            generalChatParticipants={generalChatParticipants}
            adminMessages={mockAdminChatMessages}
            generalMessages={mockGeneralChatMessages}
            onSendMessage={handleSendMessage}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "subcontractors" && user.role === "GQM_MEMBER") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <Subcontractors
            role={user.role}
            job={job}
            selectedSubcontractor={selectedSubcontractor}
            setSelectedSubcontractor={setSelectedSubcontractor}
            onOpenLinkDialog={() => setLinkSubcontractorOpen(true)}
            onReload={jobDetail.reload}
            timelineEvents={mockTimelineEvents}
            syncPodio={syncPodio}
            jobYear={resolveJobYearForPodioSync(job)}
            jobPodioId={job.podio_item_id}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "pricing") {
      if (user.role === "LEAD_TECHNICIAN") {
        return (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <LeadTechnicianPricingView jobId={jobId} job={job as any} />
            </div>
            <div className="space-y-6">{technicianSidebar}</div>
          </div>
        )
      }

      return (
        <JobTabLayout sidebar={rightSidebar}>
          <Pricing
            role={user.role}
            jobId={jobId}
            jobCode={String((job as any)?.ID_Jobs ?? "")}
            job={job}
            costs={costs}
            onEditCost={handleEditCost}
            onDeleteCost={handleDeleteCost}
            onAddCost={handleAddNewCost}
            onPricingFieldChange={handlePricingFieldChange}
            onMultipliersChanged={handleMultipliersChanged}
            onAdjPricingCalculated={handleAdjPricingCalculated}
            isFieldChanged={isFieldChanged}
            onReload={jobDetail.reload}
            onSyncComplete={jobDetail.reload}
            syncPodio={syncPodio}
            onJobUpdate={async (_updates: Record<string, any>) => {
            }}
            onPricingTargetChange={handlePricingTargetChange}
            onPermitChange={handlePermitChange}
            isReloading={jobDetail.isLoading}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "members") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <Members
            role={user.role}
            job={job}
            onOpenLinkMember={() => setLinkMemberOpen(true)}
            onRequestUnlinkMember={(payload: { memberId: string; name?: string }) => {
              setUnlinkTargetMember(payload)
              setUnlinkMemberOpen(true)
            }}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "tasks") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <Tasks
            role={user.role}
            tasks={job.tasks ?? []}
            onCreateTask={() => setCreateTaskOpen(true)}
            onTaskOpen={handleTaskOpen}
            onTaskStatusChange={handleTaskStatusChange}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "technicians" && user.role === "LEAD_TECHNICIAN") {
      return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Technicians role={user.role} job={job} jobId={jobId} LeadTechnicianTechniciansView={LeadTechnicianTechniciansView} />
          </div>
          <div className="space-y-6">{technicianSidebar}</div>
        </div>
      )
    }

    if (activeTab === "estimate") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <Estimate
            role={user.role}
            jobId={jobId}
            items={estimateItems ?? []}
            selectedItem={selectedEstimateItem ?? null}
            onSelectItem={setSelectedEstimateItem}
            hasSavedEstimates={hasSavedEstimates}
            onItemsImported={handleItemsImported}
            onCreateOrder={() => setIsCreateOrderOpen(true)}
            onSaveEstimates={handleSaveEstimates}
            onDeleteAllEstimates={handleDeleteAllEstimates}
            onCancelImport={handleCancelImport}
            onDeleteItem={handleDeleteEstimateItem}
          />
        </JobTabLayout>
      )
    }

    if (activeTab === "purchases") {
      return (
        <JobTabLayout sidebar={rightSidebar}>
          <JobPurchasesTab jobId={jobId} userRole={user.role} />
        </JobTabLayout>
      )
    }

    return (
      <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
        <div className="text-lg font-medium">{tabs.find((t) => t.id === activeTab)?.label} Section</div>
        <div className="text-sm">This section is not yet implemented</div>
      </div>
    )
  }

  // ---------------------------
  // guards
  // ---------------------------
  if (!user || !mounted) return null
  if (jobId === "create") return null

  const resolvedJobId = String((job as any)?.ID_Jobs ?? (job as any)?.id ?? "")

  // ── Derive year from Job ID for display and Podio sync ────────────────────
  const resolvedYear = job ? resolveJobYearForPodioSync(job) : undefined

  if (loadError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex flex-1 items-center justify-center">
            <div className="rounded-lg border bg-white p-8 text-center">
              <h2 className="text-lg font-semibold mb-2">Error loading job</h2>
              <p className="mb-4 text-sm text-muted-foreground">{loadError}</p>
              <div className="flex justify-center gap-2">
                <Button onClick={handleRetry} className="bg-gqm-green">Retry</Button>
                <Button variant="ghost" onClick={() => router.push("/jobs")}>Back to jobs</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (jobDetail.isLoading || !job) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading job details…</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const jobType = String((job as any)?.Job_type ?? "")
  const jobStatus = String((job as any)?.Job_status ?? "")

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={user?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── Page header ────────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              {/* Left: job identity */}
              <div className="flex items-start gap-3">
                {/* Job type pill */}
                <div className={`flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold tracking-wide shadow-sm ${JOB_TYPE_BADGE[jobType] ?? "bg-slate-100 text-slate-600"}`}>
                  {jobType || "—"}
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Job Detail</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {/* ID */}
                    <span className="flex items-center gap-1 font-mono text-sm text-slate-500">
                      <Hash className="h-3.5 w-3.5" />
                      {(job as any).ID_Jobs}
                    </span>

                    {/* Year derived from ID */}
                    {resolvedYear && (
                      <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {resolvedYear}
                      </span>
                    )}

                    {/* Status badge */}
                    {jobStatus && (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[jobStatus] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {jobStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Podio sync toggle + Save button (only when there are changes) */}
              {jobDetail.hasChanges && (
                <div className="flex items-center gap-3 flex-shrink-0">

                  {/* Podio toggle — styled button instead of Switch */}
                  <button
                    type="button"
                    onClick={() => setSyncPodio((v) => !v)}
                    disabled={jobDetail.isSaving}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${syncPodio
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                      }`}
                    title={syncPodio ? "Podio sync enabled — click to disable" : "Podio sync disabled — click to enable"}
                  >
                    {syncPodio
                      ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500" />
                      : <ZapOff className="h-4 w-4" />
                    }
                    <span className="text-xs font-semibold">
                      Podio {syncPodio ? "ON" : "OFF"}
                    </span>
                    {/* Show the year being used when sync is on */}
                    {syncPodio && resolvedYear && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        {resolvedYear}
                      </span>
                    )}
                  </button>

                  {/* Save button */}
                  <button
                    onClick={handleSaveChanges}
                    disabled={jobDetail.isSaving}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {jobDetail.isSaving
                      ? <RefreshCcw className="h-4 w-4 animate-spin" />
                      : <Save className="h-4 w-4" />
                    }
                    {jobDetail.isSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <JobDetailTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} hasTabChanges={hasTabChanges} />

          {renderTab()}
        </main>
      </div>

      <ChatSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        chatName={activeChat === "admin" ? "Admin Discussion" : "General Project Chat"}
        chatAvatar={activeChat === "admin" ? "/admin-interface.png" : "/diverse-professional-team.png"}
        participants={activeChat === "admin" ? adminChatParticipants : generalChatParticipants}
        onSave={handleSaveChatSettings}
      />

      <CostDialog
        isOpen={isCostDialogOpen}
        onClose={() => {
          setIsCostDialogOpen(false)
          setEditingCost(null)
        }}
        cost={editingCost}
        onSave={handleSaveCost}
      />

      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onClose={() => setIsAddMemberDialogOpen(false)}
        availableMembers={availableMembers}
        onAddMember={handleAddMember}
      />

      <CreateOrderDialog
        open={isCreateOrderOpen}
        onOpenChange={setIsCreateOrderOpen}
        items={estimateItems}
        subcontractors={(job as any)?.subcontractors || []}
        defaultSyncPodio={syncPodio}
        onCreateOrder={handleCreateOrder}
      />

      {selectedTask && (
        <TaskDetailsDialog
          task={selectedTask}
          open={taskDetailsOpen}
          onOpenChange={(open) => {
            setTaskDetailsOpen(open)
            if (!open) setSelectedTask(null)
          }}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          technicians={
            (job as any)?.subcontractors?.flatMap(
              (sub: any) =>
                sub.technicians?.map((tech: any) => ({
                  id: tech.ID_Technician,
                  name: tech.Name,
                  type: tech.Technician_type,
                })) || [],
            ) || []
          }
        />
      )}

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        jobId={jobId}
        jobData={job as any}
        onTaskCreated={handleTaskCreated}
      />

      <LinkSubcontractorDialog
        open={linkSubcontractorOpen}
        onClose={() => setLinkSubcontractorOpen(false)}
        jobId={resolvedJobId}
        defaultSyncPodio={syncPodio}
        jobYear={resolveJobYearForPodioSync(job)}
        onSubcontractorLinked={async () => {
          await jobDetail.reload()
        }}
      />

      <LinkMemberDialog
        open={linkMemberOpen}
        onClose={() => setLinkMemberOpen(false)}
        jobId={resolvedJobId}
        defaultSyncPodio={syncPodio}
        jobYear={resolveJobYearForPodioSync(job)}
        onMemberLinked={async () => {
          await jobDetail.reload()
        }}
      />

      {unlinkTargetMember && (
        <UnlinkMemberDialog
          open={unlinkMemberOpen}
          onClose={() => {
            setUnlinkMemberOpen(false)
            setUnlinkTargetMember(null)
          }}
          jobId={resolvedJobId}
          memberId={unlinkTargetMember.memberId}
          memberName={unlinkTargetMember.name}
          defaultSyncPodio={syncPodio}
          jobYear={resolveJobYear(job)}
          onUnlinked={async () => {
            await jobDetail.reload()
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Year resolver — extracts first numeric digit from Job ID
// QID5123 → 2025 | PTL6001 → 2026 | PAR4567 → 2024 | PAR60039 → 2026
// ─────────────────────────────────────────────────────────────────────────────
function resolveJobYearForPodioSync(job: any): number | undefined {
  const idJobs = String(job?.ID_Jobs ?? job?.idJobs ?? job?.id ?? "").trim()

  if (idJobs) {
    const match = idJobs.match(/\d/)
    if (match) return 2020 + parseInt(match[0], 10)
  }

  // Fallback: date-based (less reliable due to date offsets)
  const jobType = String(job?.Job_type ?? job?.job_type ?? "").toUpperCase()
  const pickDate =
    jobType === "PTL"
      ? (job?.Estimated_start_date ?? job?.estimated_start_date ?? null)
      : (job?.Date_assigned ?? job?.date_assigned ?? null)

  if (!pickDate) return undefined
  const d = new Date(pickDate)
  const y = d.getFullYear()
  return Number.isFinite(y) && y > 2000 ? y : undefined
}

function resolveJobYear(job: any): number | undefined {
  return resolveJobYearForPodioSync(job)
}

function normalizeJobClient(c: any) {
  if (!c) return null
  return {
    ID_Client: c.ID_Client ?? c.id ?? c.ID ?? null,
    Client_Community: c.Client_Community ?? c.clientCommunity ?? c.Prop_Manager ?? c.name ?? "",
    Parent_Company: c.Parent_Company ?? c.companyName ?? "",
    Email_Address: c.Email_Address ?? (c.email ? (Array.isArray(c.email) ? c.email : [c.email]) : []),
    Phone_Number: c.Phone_Number ?? c.phone ?? "",
    Address: c.Address ?? c.address ?? "",
    Client_Status: c.Client_Status ?? c.status ?? "",
    ...c,
  }
}