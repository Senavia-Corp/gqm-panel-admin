import { NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()
    const response = await fetch(`${getBackendUrl()}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, Password: password }),
      cache: "no-store",
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[api/auth/reset-password] Error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
