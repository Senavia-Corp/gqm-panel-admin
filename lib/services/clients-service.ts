import type { ClientDetails, UpdateClientRequest } from "@/lib/types"

const API_BASE_URL = "https://6qh4h0kx-80.use.devtunnels.ms"

export async function fetchClients(
  page = 1,
  limit = 10,
  query?: string,
): Promise<{ clients: ClientDetails[]; total: number }> {
  try {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(limit))
    if (query) params.set("q", query)

    const response = await fetch(`${API_BASE_URL}/clients?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    return {
      clients: data.results || [],
      total: data.total || 0,
    }
  } catch (error) {
    console.error("[v0] Error fetching clients:", error)
    throw error
  }
}

export async function fetchClientById(clientId: string): Promise<ClientDetails> {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] Error fetching client:", error)
    throw error
  }
}

export async function createClient(clientData: Partial<ClientDetails>): Promise<ClientDetails> {
  try {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(clientData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] Error creating client:", error)
    throw error
  }
}

export async function updateClient(clientId: string, updates: UpdateClientRequest): Promise<ClientDetails> {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] Error updating client:", error)
    throw error
  }
}

export async function deleteClient(clientId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error("[v0] Error deleting client:", error)
    throw error
  }
}
