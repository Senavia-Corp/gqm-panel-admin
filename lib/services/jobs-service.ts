import { mockClients } from "@/lib/mock-data"
import { apiFetch } from "@/lib/apiFetch"
import type { JobDTO, JobsPaginatedResponse, UpdateJobRequest, JobType } from "@/lib/types"

const JOBS_API_URL = "/api/jobs"

interface ClientAPIResponse {
  Address: string
  Client_Community: string
  Client_Status: string
  Compliance_Partner: string | null
  Email_Address: string
  ID_Client: string
  ID_Community_Tracking: string | null
  Invoice_Collection: string | null
  Parent_Company: string
  Parent_Mgmt_Company: string
  Phone_Number: string
  Prop_Manager: string
  Risk_Value: string | null
  Services_interested_in: string | null
  Website: string
  jobs?: any[]
  property_manager?: any[]
  property_mgmt_co?: string | null
}

interface AttachmentAPIResponse {
  ID_Attachment: string
  Document_name: string
  Document_type: string
  Link: string
  Attachment_descr: string
  ID_Jobs: string
}

interface Client {
  Address: string
  Client_Community: string
  Client_Status: string
  Email_Address: string
  ID_Client: string
  ID_Community_Tracking?: string | null
  Parent_Company: string
  Parent_Mgmt_Company: string
  Phone_Number: string
  Prop_Manager: string
  Website: string
  jobs?: any[]
  property_manager?: any[]
  property_mgmt_co?: string | null
}

function normalizeClient(raw: any): Client {
  return {
    Address: raw?.Address ?? raw?.address ?? "",
    Client_Community: raw?.Client_Community ?? raw?.clientCommunity ?? raw?.Client_community ?? "",
    Client_Status: raw?.Client_Status ?? raw?.status ?? "Active",
    Email_Address: raw?.Email_Address ?? raw?.email ?? "",
    ID_Client: raw?.ID_Client ?? raw?.id ?? raw?.ID ?? "",
    ID_Community_Tracking: raw?.ID_Community_Tracking ?? raw?.communityTrackingId ?? null,
    Parent_Company: raw?.Parent_Company ?? raw?.companyName ?? raw?.parentCompany ?? "",
    Parent_Mgmt_Company: raw?.Parent_Mgmt_Company ?? raw?.parentMgmtCompany ?? raw?.companyName ?? "",
    Phone_Number: raw?.Phone_Number ?? raw?.phone ?? "",
    Prop_Manager: raw?.Prop_Manager ?? raw?.name ?? raw?.propertyManagerName ?? raw?.Client_Community ?? "",
    Website: raw?.Website ?? raw?.website ?? "",
    jobs: raw?.jobs ?? [],
    property_manager: raw?.property_manager ?? raw?.propertyManager ?? [],
    property_mgmt_co: raw?.property_mgmt_co ?? raw?.propertyMgmtCo ?? null,
  }
}

// ─── READ operations ──────────────────────────────────────────────────────────

export async function fetchJobs(
  page = 1,
  limit = 10,
  filters?: {
    type?:   JobType
    status?: string
    year?:   string
    search?: string   // ← NEW
  }
): Promise<{ jobs: JobDTO[]; total: number }> {
  try {
    const params = new URLSearchParams()
    params.set("page",  String(page))
    params.set("limit", String(limit))
    if (filters?.type)   params.set("type",   filters.type)
    if (filters?.year)   params.set("year",   filters.year)
    if (filters?.status) params.set("status", filters.status)
    if (filters?.search) params.set("search", filters.search)  // ← NEW

    const response = await fetch(`${JOBS_API_URL}?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      const err = await response.text().catch(() => "")
      throw new Error(`fetchJobs failed (${response.status}): ${err}`)
    }

    const data = (await response.json()) as JobsPaginatedResponse
    if (Array.isArray(data as any)) {
      return { jobs: data as any, total: (data as any).length }
    }
    return { jobs: data.results ?? [], total: data.total ?? 0 }
  } catch (error) {
    console.error("[jobs-service] fetchJobs error:", error)
    return { jobs: [], total: 0 }
  }
}

export async function fetchJobById(idJob: string): Promise<JobDTO | null> {
  try {
    const response = await fetch(`${JOBS_API_URL}/${encodeURIComponent(idJob)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (response.status === 404) return null
    if (!response.ok) {
      const err = await response.text().catch(() => "")
      throw new Error(`fetchJobById failed (${response.status}): ${err}`)
    }
    return (await response.json()) as JobDTO
  } catch (error) {
    console.error("[jobs-service] fetchJobById error:", error)
    return null
  }
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const response = await fetch("/api/clients", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (!response.ok) {
      const err = await response.text().catch(() => "")
      throw new Error(`fetchClients failed (${response.status}): ${err}`)
    }
    const data = await response.json()
    const rawClients = Array.isArray(data) ? data : (data?.results ?? [])
    if (!Array.isArray(rawClients)) throw new Error("API returned invalid clients format")
    return rawClients.map(normalizeClient)
  } catch (error) {
    console.error("[jobs-service] fetchClients error:", error)
    return mockClients.map((c) =>
      normalizeClient({
        Address: c.address,
        Client_Community: "Sample Community",
        Client_Status: c.status,
        Email_Address: c.email,
        ID_Client: c.id,
        Parent_Company: c.companyName,
        Parent_Mgmt_Company: c.companyName,
        Phone_Number: c.phone,
        Prop_Manager: c.name,
        Website: "",
        jobs: [],
        property_manager: [],
        property_mgmt_co: null,
        ID_Community_Tracking: null,
      })
    )
  }
}

// ─── WRITE operations ─────────────────────────────────────────────────────────

type CreateJobOptions = { sync_podio?: boolean }
type UpdateJobOptions = { sync_podio?: boolean }
type DeleteJobOptions = { sync_podio?: boolean; year?: number }

export async function createJob(
  payload: Partial<JobDTO> & { Job_type: JobType },
  opts?: CreateJobOptions
): Promise<JobDTO> {
  const sync = opts?.sync_podio ?? false
  const url  = `${JOBS_API_URL}?sync_podio=${sync ? "true" : "false"}`

  const response = await apiFetch(url, {
    method: "POST",
    body:   JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`createJob failed (${response.status}): ${errText}`)
  }
  return (await response.json()) as JobDTO
}

export async function updateJob(
  idJob: string,
  updates: UpdateJobRequest,
  opts?: UpdateJobOptions
): Promise<JobDTO> {
  const sync = opts?.sync_podio ?? false
  const url  = `${JOBS_API_URL}/${encodeURIComponent(idJob)}?sync_podio=${sync ? "true" : "false"}`

  const response = await apiFetch(url, {
    method: "PATCH",
    body:   JSON.stringify(updates),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => "")
    throw new Error(`updateJob failed (${response.status}): ${err}`)
  }
  return (await response.json()) as JobDTO
}

export async function deleteJob(
  idJob: string,
  opts?: DeleteJobOptions
): Promise<{ message?: string; success?: boolean }> {
  const sync = opts?.sync_podio ?? false
  const qs   = new URLSearchParams()
  qs.set("sync_podio", sync ? "true" : "false")
  if (sync && opts?.year) qs.set("year", String(opts.year))

  const response = await apiFetch(
    `${JOBS_API_URL}/${encodeURIComponent(idJob)}?${qs.toString()}`,
    { method: "DELETE" }
  )

  if (!response.ok) {
    const err = await response.text().catch(() => "")
    throw new Error(`deleteJob failed (${response.status}): ${err}`)
  }
  const text = await response.text().catch(() => "")
  try {
    return text ? JSON.parse(text) : { success: true }
  } catch {
    return { message: text || "Deleted", success: true }
  }
}