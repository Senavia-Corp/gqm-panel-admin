import { apiFetch } from "@/lib/apiFetch"
import type { JobDTO, JobsPaginatedResponse, UpdateJobRequest, JobType, JobFilters, JobExportRequest } from "@/lib/types"

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
  filters?: JobFilters
): Promise<{ jobs: JobDTO[]; total: number }> {
  try {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(limit))

    if (filters?.type) params.set("type", filters.type)
    if (filters?.year) params.set("year", filters.year)
    if (filters?.status) params.set("status", filters.status)
    if (filters?.search?.trim()) params.set("search", filters.search.trim())
    if (filters?.clientId) params.set("client_id", filters.clientId)
    if (filters?.memberId) params.set("memberId", filters.memberId)
    if (filters?.parentMgmtCoId) params.set("parent_mgmt_co_id", filters.parentMgmtCoId)
    if (filters?.dateFrom) params.set("date_from", filters.dateFrom)
    if (filters?.dateTo) params.set("date_to", filters.dateTo)
    if (filters?.subcontractorId) params.set("subcontractorId", filters.subcontractorId)
    if ((filters as any)?.technicianId) params.set("technicianId", (filters as any).technicianId)

    const response = await apiFetch(`${JOBS_API_URL}?${params.toString()}`, {
      method: "GET",
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
    // Se relanza a propósito. Antes devolvía { jobs: [], total: 0 }, así que un
    // 500 o una caída de red se veían EXACTAMENTE igual que una base vacía: el
    // panel pintaba "0 trabajos" y nadie se enteraba. Eso hace imposible
    // verificar la paridad — el número que el cliente compara contra Podio
    // podría ser un error de red disfrazado de cero.
    //
    // La UI de error ya existe (app/jobs/page.tsx deriva `loadError` y pinta un
    // estado con botón de reintento); estaba muerta porque nunca le llegaba un
    // error. Mismo criterio que `fetchClients`, que ya relanzaba.
    console.error("[jobs-service] fetchJobs error:", error)
    throw error
  }
}

export async function fetchJobById(idJob: string): Promise<JobDTO | null> {
  try {
    const response = await apiFetch(`${JOBS_API_URL}/${encodeURIComponent(idJob)}`, {
      method: "GET",
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
    const response = await apiFetch("/api/clients", {
      method: "GET",
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
    // REG-078/REG-088: sin fallback a datos falsos — el error se propaga y
    // la UI lo muestra (antes se rendereaba "Sample Community" en silencio).
    console.error("[jobs-service] fetchClients error:", error)
    throw error
  }
}

// ─── WRITE operations ─────────────────────────────────────────────────────────

type CreateJobOptions = { sync_podio?: boolean; year?: number }

// FIX: added `year` — required by Python backend to resolve Podio workspace.
// Derive it from the Job ID first numeric digit: QID5xxx→2025, PTL6xxx→2026.
type UpdateJobOptions = { sync_podio?: boolean; year?: number }

type DeleteJobOptions = { sync_podio?: boolean; year?: number; force?: boolean }

/** 409 del API: el job tiene orders/COs/findocs vinculados — reintentar con
 * force=true (requiere job:force_delete). `detail` trae los conteos. */
export class DeleteJobConflictError extends Error {
  detail: string
  constructor(detail: string) {
    super(detail)
    this.name = "DeleteJobConflictError"
    this.detail = detail
  }
}

export async function createJob(
  payload: Partial<JobDTO> & { Job_type: JobType },
  opts?: CreateJobOptions
): Promise<JobDTO> {
  const sync = opts?.sync_podio ?? false
  const url = `${JOBS_API_URL}?sync_podio=${sync ? "true" : "false"}`

  // Include year in the body so the proxy can forward it as a query param
  const body = {
    ...payload,
    ...(sync && opts?.year ? { year: opts.year } : {}),
  }

  const response = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
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

  // FIX: include year in query string alongside sync_podio
  // Before: `?sync_podio=true`          → Python couldn't find Podio workspace → 500
  // After:  `?sync_podio=true&year=2025` → Python resolves workspace correctly
  const qs = new URLSearchParams()
  qs.set("sync_podio", sync ? "true" : "false")
  if (opts?.year) qs.set("year", String(opts.year))

  const url = `${JOBS_API_URL}/${encodeURIComponent(idJob)}?${qs.toString()}`

  console.log("[jobs-service] updateJob →", url, "| payload keys:", Object.keys(updates))

  const response = await apiFetch(url, {
    method: "PATCH",
    body: JSON.stringify(updates),
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
  const qs = new URLSearchParams()
  qs.set("sync_podio", sync ? "true" : "false")
  if (sync && opts?.year) qs.set("year", String(opts.year))
  if (opts?.force) qs.set("force", "true")

  const response = await apiFetch(
    `${JOBS_API_URL}/${encodeURIComponent(idJob)}?${qs.toString()}`,
    { method: "DELETE" }
  )

  if (!response.ok) {
    const err = await response.text().catch(() => "")
    if (response.status === 409) {
      let detail = err
      try { detail = JSON.parse(err)?.detail ?? err } catch {}
      throw new DeleteJobConflictError(detail)
    }
    throw new Error(`deleteJob failed (${response.status}): ${err}`)
  }
  const text = await response.text().catch(() => "")
  try {
    return text ? JSON.parse(text) : { success: true }
  } catch {
    return { message: text || "Deleted", success: true }
  }
}

export async function exportJobs(request: JobExportRequest): Promise<Blob> {
  const response = await apiFetch("/api/jobs/export", {
    method: "POST",
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`exportJobs failed (${response.status}): ${errText}`)
  }

  return await response.blob()
}