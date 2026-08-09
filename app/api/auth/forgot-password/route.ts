import { NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const response = await fetch(`${getBackendUrl()}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Email_Address: email }),
      cache: "no-store",
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[api/auth/forgot-password] Error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
