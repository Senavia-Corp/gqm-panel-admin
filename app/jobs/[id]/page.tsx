"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Save } from "lucide-react"

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

// ✅ Tabs separados (ajusta la ruta si en tu proyecto las guardaste en otro folder)
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
import { useParams } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { LinkMemberDialog } from "@/components/organisms/LinkMemberDialog"
import { UnlinkMemberDialog } from "@/components/organisms/UnlinkMemberDialog"
import { apiFetch } from "@/lib/apiFetch"


// 👇 Dynamic components que solo aplica en algunos tabs (si tus tabs ya los importan internamente, puedes borrar esto)
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

// mocks (se quedan tal cual)
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

  const [documentFilter, setDocumentFilter] = useState<string>("all")
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

  const [activeChat, setActiveChat] = useState("general")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<Cost | null>(null)
  const [costs, setCosts] = useState<Cost[]>(mockCosts)

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [availableMembers, setAvailableMembers] = useState(mockAvailableMembers)
  const [clients, setClients] = useState<any[]>([])

  // Loading error state (job / clients)
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
  const [syncPodio, setSyncPodio] = useState(true) // ✅ default ON

  const jobDetail = useJobDetail(jobId)
  const job = jobDetail.job

  // ---------------------------
  // helpers basados en jobDetail (paso 2H)
  // ---------------------------
  const getChangedFieldsSet = (): Set<string> => {
    const anyDetail = jobDetail as any
    if (anyDetail?.changedFields instanceof Set) return anyDetail.changedFields as Set<string>
    return new Set()
  }

  const isFieldChanged = useCallback((field: string) => getChangedFieldsSet().has(field), [])

  const hasTabChanges = useCallback(
    (tabId: string) => {
      const changed = getChangedFieldsSet()

      if (tabId === "details") {
        return [
          "status",
          "serviceType",
          "projectName",
          "projectLocation",
          "poWtnWo",
          "dateAssigned",
          "estimatedStartDate",
          "estimatedDuration",
          "client",
          "location",
        ].some((f) => changed.has(f))
      }

      if (tabId === "pricing") {
        return Array.from(changed).some((f) => f.startsWith("pricing."))
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

    // clear prior load errors and fetch initial clients
    setLoadError(null)
    void loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // ---------------------------
  // reload job + hydrate estimate state from backend job payload
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

          loadDocuments()
          loadTasks()
          setOrders(mockOrders.filter((order) => order.ID_Jobs === jobId))

          // ... tu lógica de ensure client (igual, usando sourceJob)
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
      // traer la primera página (5 por página) para poblar el selector inicialmente
      const { clients: fetchedClients, total } = await fetchClients(1, 5)
      setClients(Array.isArray(fetchedClients) ? fetchedClients : [])
    } catch (error) {
      console.error("[jobs] loadClients error:", error)
      setClients([])
      setLoadError(error instanceof Error ? error.message : "Unexpected error loading clients")
    }
  }

  const loadDocuments = async () => {
    const jobsId = jobId as string
    if (jobsId === "create") return

    setIsLoadingDocuments(true)
    try {
      setDocuments(mockDocuments as any)
    } catch (error) {
      console.error("[docs] loadDocuments error:", error)
    } finally {
      setIsLoadingDocuments(false)
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

    // ── 1. Optimistic update ───────────────────────────────────────────────
    const prevTasks = (job as any).tasks as Task[]
    const updatedTasks = prevTasks.map((task: Task) =>
      task.ID_Tasks === taskId ? { ...task, Task_status: newStatus } : task,
    )
    jobDetail.setJob({ ...(job as any), tasks: updatedTasks } as any)

    // ── 2. PATCH to API ────────────────────────────────────────────────────
    try {
      const res = await apiFetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ID_Tasks: taskId,      // ← proxy reads this, puts it in the URL
          Task_status: newStatus,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? data?.detail ?? `Error ${res.status}`)
      }

      // ── 3. Sync with server after successful save ──────────────────────
      await jobDetail.reload()

    } catch (error) {
      console.error("[tasks] status change error:", error)

      // ── 4. Revert optimistic update on failure ─────────────────────────
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
    const j: any = job

    const next: any = { ...j }
    const mark = (f: string) => (jobDetail as any).markChanged?.(`pricing.${f}`)

    switch (field) {
      case "gqmFormulaPricing":
        next.Gqm_formula_pricing = value
        mark("gqmFormulaPricing")
        break

      case "gqmAdjFormulaPricing":
        next.Gqm_adj_formula_pricing = value
        mark("gqmAdjFormulaPricing")
        break

      case "gqmTargetReturn":
        next.Gqm_target_return = value
        mark("gqmTargetReturn")
        break

      case "gqmTargetSoldPricing":
        next.Gqm_target_sold_pricing = value
        mark("gqmTargetSoldPricing")
        break

      case "gqmPremiumInMoney":
        next.Gqm_premium_in_money = value
        mark("gqmPremiumInMoney")
        break

      case "gqmFinalSoldPricing":
        next.Gqm_final_sold_pricing = value
        mark("gqmFinalSoldPricing")
        break

      case "gqmFinalPercentage":
        next.Gqm_final_percentage = value
        mark("gqmFinalPercentage")
        break
    }

    jobDetail.setJob(next)
  }

  const handleAdjPricingCalculated = async (adjPricing: number) => {
    if (!job) return
    const j: any = job

    const next: any = { ...j }
    next.Gqm_adj_formula_pricing = adjPricing
      ; (jobDetail as any).markChanged?.("pricing.gqmAdjFormulaPricing")

    // NO autosave. Solo set state.
    jobDetail.setJob(next)

    toast({
      title: "Calculated",
      description: "Adjusted Formula Pricing calculated. Remember to Save Changes to persist.",
    })
  }

  const handleMultipliersChanged = async () => {
    await jobDetail.reload()
  }

  const handleSaveChanges = async () => {
    const anyDetail = jobDetail as any
    try {
      if (typeof anyDetail.save === "function") {
        console.log("[JobDetail] job.ID_Client before save ->", (job as any)?.ID_Client)
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

  // ---------------------------
  // estimate helpers (retry / dedupe / reporting)
  // ---------------------------
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
    // Normaliza strings para tener un "fingerprint" consistente
    const norm = (v: any) =>
      String(v ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")

    // Campos "más estables" para evitar duplicados
    // (evita incluir costos si hay riesgo de floats distintos)
    return [
      norm(i.Title),
      norm(i.Cost_Code),
      norm(i.Parent_Group),
      norm(i.Description),
      norm(i.Unit),
      norm(i.Category),
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
      match?.ID_EstimateCost ??
      match?.ID_Estimate_Cost ??
      match?.id ??
      match?.ID

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
        try {
          parsed = raw ? JSON.parse(raw) : null
        } catch {
          parsed = null
        }

        const errMsg = `POST /api/estimate failed (${response.status}) :: ${parsed?.error ?? parsed?.detail ?? raw ?? "no body"
          }`

        // Retry solo si es transiente
        if (isTransientStatus(response.status) && attempt < ESTIMATE_RETRY_MAX) {
          const backoff = 900 * Math.pow(2, attempt) + Math.floor(Math.random() * 500)
          console.warn("[estimate] transient error, retrying...", {
            attempt: attempt + 1,
            status: response.status,
            backoff,
          })
          await sleep(backoff)
          continue
        }

        throw new Error(errMsg)
      } catch (err) {
        lastErr = err
        // Retry solo si parece error de red
        if (isNetworkError(err) && attempt < ESTIMATE_RETRY_MAX) {
          const backoff = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
          console.warn("[estimate] network error, retrying...", { attempt: attempt + 1, backoff, err: String(err) })
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

    // 1) Deduplicar dentro del import
    const { unique, duplicates } = dedupeEstimateItems(estimateItems)

    // 2) Deduplicar contra lo que YA existe en DB (job.estimate_costs)
    //    - Si tu mapper ya hidrata estimateItems desde job, esto cubre re-saves o reimports.
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

    // Toast “in progress”
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

    // Report detallado a consola para debug
    if (failed.length) {
      const failedReport = failed.map((f, i) => {
        const idx = results.findIndex((r) => r === f)
        const it = toCreate[idx]
        return {
          idx,
          Title: it?.Title,
          Cost_Code: it?.Cost_Code,
          Parent_Group: it?.Parent_Group,
          error: String((f as any).reason),
        }
      })
      console.error("[estimate] failed items report:", failedReport)
    }

    // Recargar job para reflejar DB
    await jobDetail.reload()

    // Toast final (resumen)
    const skippedDupImport = duplicates.length
    const skipped = skippedExisting + skippedDupImport

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

    // borra en pool (2) para no saturar
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
    // Si es TEMP, solo se borra del state
    const rawId = String(item?.ID_EstimateItem ?? "")
    if (!rawId || rawId.startsWith("TEMP")) {
      setEstimateItems((prev) => prev.filter((x) => x.ID_EstimateItem !== item.ID_EstimateItem))
      return
    }

    const persistedId = resolvePersistedEstimateId(item, job)
    if (!persistedId) throw new Error("Could not resolve persisted estimate id")

    const res = await fetch(`/api/estimate/${persistedId}`, { method: "DELETE" })

    // 404 -> ya no existe, lo tratamos como ok (idempotente)
    if (res.status !== 404 && !res.ok) {
      const raw = await res.text().catch(() => "")
      throw new Error(raw || `Failed to delete (${res.status})`)
    }

    // refresca estado
    await jobDetail.reload()
  }

  const handleCancelImport = () => {
    setEstimateItems([])
  }

  const handleCreateOrder = async (orderName: string, subcontractorId: string, selectedItemIds: string[], syncPodioOverride: boolean) => {
    try {
      const selectedItems = estimateItems.filter((item) => selectedItemIds.includes(item.ID_EstimateItem))
      const formula = selectedItems.reduce((sum, item) => sum + item.Builder_Cost, 0)

      const year = resolveJobYearForPodioSync(job) // ✅ nueva helper abajo

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
        // ✅ solo si existe
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

      // asignar items a la order (igual que ya lo tienes)
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
        ]
        : [
          { id: "details", label: "Details" },
          { id: "subcontractors", label: "Subcontractors" },
          { id: "documents", label: "Documents" },
          { id: "chat", label: "Chat" },
          { id: "pricing", label: "Pricing" },
          { id: "members", label: "Members" },
          { id: "tasks", label: "Tasks" },
          { id: "estimate", label: "Estimate" },
        ],
    [user?.role],
  )

  // ✅ Sidebar unificado (creado 1 sola vez)
  const rightSidebar = useMemo(() => {
    if (!user || !job) return null

    // Lead-tech: algunas vistas ya renderizan un sidebar técnico aparte (pricing/technicians),
    // pero mantenemos el sidebar general para el resto.
    return <JobRightSidebar role={user.role} job={job as any} />
  }, [user, job])

  const technicianSidebar = useMemo(() => {
    if (!job) return null
    return <TechnicianJobSidebar job={job as any} subcontractor={(job as any)?.subcontractors?.[0]} />
  }, [job])

  // ---------------------------
  // renderTab (tabs separados)
  // ---------------------------
  const renderTab = () => {
    if (!user || !job) return null

    // 🔥 IMPORTANT:
    // Para evitar errores de tipos si alguna tab cambió props, las usamos como ComponentType<any>.
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
      console.log("Job passing in props", job);
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
          <Docs
            role={user.role}
            job={job}
            jobId={jobId}
            documentFilter={documentFilter}
            setDocumentFilter={setDocumentFilter}
            documents={documents}
            isLoadingDocuments={isLoadingDocuments}
            onReload={jobDetail.reload}
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
      // Lead tech: layout especial (pricing + technician sidebar)
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
            jobCode={String((job as any)?.ID_Jobs ?? "")}   // ← nuevo: e.g. "QID6387"
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
            <div className="text-lg text-gray-500">Loading job details...</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={user?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Job Detail</h1>
              <p className="text-lg text-muted-foreground">Job ID: {(job as any).ID_Jobs}</p>
            </div>

            {jobDetail.hasChanges && (
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
                  <div className="leading-tight">
                    <Label htmlFor="sync-podio" className="text-sm">
                      Sync Podio
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {syncPodio ? "Enabled" : "Disabled"}
                    </p>
                  </div>

                  <Switch
                    id="sync-podio"
                    checked={syncPodio}
                    onCheckedChange={setSyncPodio}
                    disabled={jobDetail.isSaving}
                  />
                </div>

                {/* Save */}
                <Button
                  onClick={handleSaveChanges}
                  disabled={jobDetail.isSaving}
                  className="bg-gqm-green hover:bg-gqm-green/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {jobDetail.isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
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

      <CreateTaskDialog open={createTaskOpen} onOpenChange={setCreateTaskOpen} jobId={jobId} jobData={job as any} onTaskCreated={handleTaskCreated} />

      <LinkSubcontractorDialog
        open={linkSubcontractorOpen}
        onClose={() => setLinkSubcontractorOpen(false)}
        jobId={resolvedJobId} // ✅ ID correcto
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

// helper: normalize job.client en formato backend-like para la lista de clients
function normalizeJobClient(c: any) {
  if (!c) return null
  return {
    ID_Client: c.ID_Client ?? c.id ?? c.ID ?? null,
    Client_Community: c.Client_Community ?? c.clientCommunity ?? c.Prop_Manager ?? c.name ?? "",
    Parent_Company: c.Parent_Company ?? c.companyName ?? "",
    Email_Address: c.Email_Address ?? (c.email ? (Array.isArray(c.email) ? c.email : [c.email]) : []),
    Phone_Number: c.Phone_Number ?? c.phone ?? "",
    Address: c.Address ?? c.address ?? "",
    Client_Status: c.Client_Status ?? c.Client_Status ?? c.status ?? "",
    // preserve any extra fields
    ...c,
  }
}

function resolveJobYear(job: any): number | undefined {
  const v =
    job?.Year ??
    job?.year ??
    job?.Job_year ??
    job?.job_year ??
    job?.Job_Year ??
    job?.JOB_YEAR

  const asNum = Number(v)
  return Number.isFinite(asNum) && asNum > 0 ? asNum : undefined
}

function resolveJobYearForPodioSync(job: any): number | undefined {
  const jobType = String(job?.Job_type ?? job?.job_type ?? "").toUpperCase()

  const pickDate =
    jobType === "PTL"
      ? (job?.Estimated_start_date ?? job?.estimated_start_date ?? null)
      : (job?.Date_assigned ?? job?.date_assigned ?? null)

  if (!pickDate) return undefined

  const d = new Date(pickDate)
  const y = d.getFullYear()
  return Number.isFinite(y) ? y : undefined
}
