/**
 * client-service.ts
 * All calls go through Next.js API proxies — no hardcoded backend URLs.
 * The proxies at /api/clients/* forward to PYTHON_API_BASE_URL (set in .env).
 */

export type ClientDetails = {
  ID_Client: string
  Client_Community?: string | null
  Address?: string | null
  Website?: string | null
  Invoice_Collection?: string | null
  Compliance_Partner?: string | null
  Risk_Value?: string | null
  Maintenance_Sup?: string | null
  Email_Address?: string[] | string | null
  Phone_Number?: string[] | string | null
  Client_Status?: string | null
  Services_interested_in?: string | null
  Collection_Process?: string | null
  Payment_Collection?: string | null
  Text?: string | null
  podio_item_id?: string | null
  ID_Community_Tracking?: string | null
  jobs?: unknown[]
  manager?: unknown[]
  members?: unknown[]
}

export type UpdateClientRequest = Partial<Omit<ClientDetails, "ID_Client" | "jobs" | "manager" | "members">>

// ─── List ─────────────────────────────────────────────────────────────────────

export async function fetchClients(
  page = 1,
  limit = 10,
  query?: string,
): Promise<{ clients: ClientDetails[]; total: number }> {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("limit", String(limit))
  if (query?.trim()) params.set("q", query.trim())

  const response = await fetch(`/api/clients?${params.toString()}`, { cache: "no-store" })

  if (!response.ok) {
    throw new Error(`Failed to fetch clients (${response.status})`)
  }

  const data = await response.json()
  return {
    clients: data.results ?? [],
    total: data.total ?? 0,
  }
}

// ─── Single ───────────────────────────────────────────────────────────────────

export async function fetchClientById(clientId: string): Promise<ClientDetails> {
  const response = await fetch(`/api/clients/${clientId}`, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Failed to fetch client ${clientId} (${response.status})`)
  }
  return response.json()
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createClient(
  clientData: Partial<ClientDetails>,
  syncPodio = false,
): Promise<ClientDetails> {
  const response = await fetch(`/api/clients?sync_podio=${syncPodio}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientData),
  })
  if (!response.ok) {
    throw new Error(`Failed to create client (${response.status})`)
  }
  return response.json()
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateClient(
  clientId: string,
  updates: UpdateClientRequest,
  syncPodio = false,
): Promise<ClientDetails> {
  const response = await fetch(`/api/clients/${clientId}?sync_podio=${syncPodio}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    throw new Error(`Failed to update client ${clientId} (${response.status})`)
  }
  return response.json()
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteClient(clientId: string, syncPodio = false): Promise<void> {
  const response = await fetch(`/api/clients/${clientId}?sync_podio=${syncPodio}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    throw new Error(`Failed to delete client ${clientId} (${response.status})`)
  }
}

// ─── Link / Unlink Manager ────────────────────────────────────────────────────

export async function linkManager(
  clientId: string,
  managerId: string,
  rol?: string,
  syncPodio = false,
): Promise<void> {
  const res = await fetch(
    `/api/client_manager?clientId=${clientId}&managerId=${managerId}&sync_podio=${syncPodio}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol }) }
  )
  if (!res.ok) throw new Error(`Failed to link manager (${res.status})`)
}

export async function unlinkManager(
  clientId: string,
  managerId: string,
  syncPodio = false,
): Promise<void> {
  const res = await fetch(
    `/api/client_manager?clientId=${clientId}&managerId=${managerId}&sync_podio=${syncPodio}`,
    { method: "DELETE" }
  )
  if (!res.ok) throw new Error(`Failed to unlink manager (${res.status})`)
}

export async function updateManagerRole(
  clientId: string,
  managerId: string,
  rol: string | null,
): Promise<void> {
  const res = await fetch(
    `/api/client_manager?clientId=${clientId}&managerId=${managerId}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol }) }
  )
  if (!res.ok) throw new Error(`Failed to update manager role (${res.status})`)
}

// ─── Link / Unlink Member ─────────────────────────────────────────────────────

export async function linkMember(
  clientId: string,
  memberId: string,
  rol?: string,
  syncPodio = false,
): Promise<void> {
  const res = await fetch(
    `/api/client_member?clientId=${clientId}&memberId=${memberId}&sync_podio=${syncPodio}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol }) }
  )
  if (!res.ok) throw new Error(`Failed to link member (${res.status})`)
}

export async function unlinkMember(
  clientId: string,
  memberId: string,
  syncPodio = false,
): Promise<void> {
  const res = await fetch(
    `/api/client_member?clientId=${clientId}&memberId=${memberId}&sync_podio=${syncPodio}`,
    { method: "DELETE" }
  )
  if (!res.ok) throw new Error(`Failed to unlink member (${res.status})`)
}

export async function updateMemberRole(
  clientId: string,
  memberId: string,
  rol: string | null,
): Promise<void> {
  const res = await fetch(
    `/api/client_member?clientId=${clientId}&memberId=${memberId}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol }) }
  )
  if (!res.ok) throw new Error(`Failed to update member role (${res.status})`)
}