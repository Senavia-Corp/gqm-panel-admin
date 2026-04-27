// app/api/parent_mgmt_co/route.ts
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const PYTHON_PARENT_MGMT_CO_URL = `${PYTHON_API_BASE_URL}/parent_mgmt_co/`

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pythonUrl = new URL(PYTHON_PARENT_MGMT_CO_URL)
    url.searchParams.forEach((value, key) => pythonUrl.searchParams.set(key, value))

    console.log("[proxy] GET parent_mgmt_co →", pythonUrl.toString())

    const authHeader = request.headers.get("Authorization") ?? ""
    const response = await fetch(pythonUrl.toString(), {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error("[proxy] Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API returned ${response.status}: ${responseText}` },
        { status: response.status }
      )
    }

    try {
      const data = JSON.parse(responseText)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from Python API", details: responseText.substring(0, 500) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[proxy] Error calling Python API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)

    // ✅ Forward sync_podio param to Python backend
    const syncPodio = url.searchParams.get("sync_podio") ?? "false"
    const pythonUrl = new URL(PYTHON_PARENT_MGMT_CO_URL)
    pythonUrl.searchParams.set("sync_podio", syncPodio)

    const body = await request.json()
    console.log("[proxy] POST parent_mgmt_co | sync_podio=%s | body:", syncPodio, body)

    const authHeader = request.headers.get("Authorization") ?? ""
    const userId     = request.headers.get("X-User-Id")
    const response = await fetch(pythonUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(userId     ? { "X-User-Id": userId }       : {}),
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error("[proxy] Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API returned ${response.status}: ${responseText}` },
        { status: response.status }
      )
    }

    try {
      const data = JSON.parse(responseText)
      console.log("[proxy] ParentMgmtCo created. sync_podio=%s", syncPodio)
      return NextResponse.json(data, { status: 201 })
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from Python API", details: responseText.substring(0, 500) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[proxy] Error creating ParentMgmtCo:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}