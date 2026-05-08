import { NextResponse } from "next/server"

// Use the same environment variable as the rest of the app for consistency
const getBaseUrl = () => {
  const url = process.env.PYTHON_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://6qh4h0kx-80.use.devtunnels.ms"
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/technician/${id}`
    console.log(`[technician proxy] GET ${url}`)

    const authHeader = request.headers.get("Authorization")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (authHeader) headers["Authorization"] = authHeader

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const text = await response.text()
    if (!response.ok) {
      console.error(`[technician proxy] Backend error ${response.status}:`, text.slice(0, 500))
      return NextResponse.json({ error: "Backend error", details: text }, { status: response.status })
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch (e) {
      console.error("[technician proxy] JSON parse error:", text.slice(0, 500))
      return NextResponse.json({ error: "Invalid JSON from backend", details: text }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[technician proxy] Request failed:", error.message)
    return NextResponse.json({ 
      error: "Connection failed", 
      message: error.message,
      target: getBaseUrl() 
    }, { status: 502 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/technician/${id}`
    console.log(`[technician proxy] PATCH ${url}`)

    const authHeader = request.headers.get("Authorization")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (authHeader) headers["Authorization"] = authHeader

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    })

    const text = await response.text()
    if (!response.ok) {
      console.error(`[technician proxy] PATCH backend error ${response.status}:`, text.slice(0, 500))
      return NextResponse.json({ error: "Backend error", details: text }, { status: response.status })
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON from backend", details: text }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[technician proxy] PATCH failed:", error.message)
    return NextResponse.json({ error: "Connection failed", message: error.message }, { status: 502 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/technician/${id}`
    console.log(`[technician proxy] DELETE ${url}`)

    const authHeader = request.headers.get("Authorization")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (authHeader) headers["Authorization"] = authHeader

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    })

    const text = await response.text()
    if (!response.ok) {
      return NextResponse.json({ error: "Backend error", details: text }, { status: response.status })
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch (e) {
      return NextResponse.json({ success: true })
    }
  } catch (error: any) {
    console.error("[technician proxy] DELETE failed:", error.message)
    return NextResponse.json({ error: "Connection failed", message: error.message }, { status: 502 })
  }
}
