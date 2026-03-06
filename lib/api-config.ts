/**
 * API Configuration
 *
 * Replace these URLs with your actual Python API endpoints
 *
 * Example structure:
 * - POST /api/auth/login - Login endpoint
 * - GET /api/jobs - Get all jobs
 * - GET /api/jobs/:id - Get job details
 * - POST /api/jobs - Create new job
 * - PUT /api/jobs/:id - Update job
 * - DELETE /api/jobs/:id - Delete job
 * - GET /api/clients - Get all clients
 * - GET /api/members - Get all GQM members
 * - GET /api/dashboard/metrics - Get dashboard metrics
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },
  jobs: {
    list: "/api/jobs",
    create: "/api/jobs",
    get: (id: string) => `/api/jobs/${id}`,
    update: (id: string) => `/api/jobs/${id}`,
    delete: (id: string) => `/api/jobs/${id}`,
    archive: (id: string) => `/api/jobs/${id}/archive`,
  },
  clients: {
    list: "/api/clients",
    get: (id: string) => `/api/clients/${id}`,
  },
  members: {
    list: "/api/members",
    get: (id: string) => `/api/members/${id}`,
  },
  dashboard: {
    metrics: "/api/dashboard/metrics",
    jobsData: "/api/dashboard/jobs",
    clientsData: "/api/dashboard/clients",
  },
}

/**
 * Helper function to make API calls
 * Add your authentication token handling here
 */
export async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token")

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}
