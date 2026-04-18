import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
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
  // Fetch all skills (no pagination in proxy for select usage)
  const result = await proxyFetch(SKILLS_ENDPOINT, authHeader)
  
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  
  return NextResponse.json(result.data)
}