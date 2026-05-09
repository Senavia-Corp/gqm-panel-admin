import { NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_API_URL = getBackendUrl()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return NextResponse.json({ error: "Refresh token is required" }, { status: 400 })
    }

    // Call Python backend
    const response = await fetch(`${PYTHON_API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || "Failed to refresh token" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[api/auth/refresh] Error:", error)
    return NextResponse.json({ error: "An error occurred during token refresh" }, { status: 500 })
  }
}
