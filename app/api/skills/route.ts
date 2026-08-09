import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_BASE_URL = `${getBackendUrl()}/`
const SKILLS_ENDPOINT = `${PYTHON_BASE_URL}skills/`

async function proxyFetch(url: string, authHeader?: string | null) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, status: res.status, error: data.detail || "Internal Server Error" }
    return { ok: true, data }
  } catch (err: any) {
    return { ok: false, status: 502, error: err.message || "Failed to reach backend" }
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  const result = await proxyFetch(SKILLS_ENDPOINT, authHeader)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.data)
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  try {
    const body = await request.json()
    const res = await fetch(SKILLS_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.detail || "Internal Server Error" }, { status: res.status })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reach backend" }, { status: 502 })
  }
}