import { NextResponse, type NextRequest } from "next/server"

const RAW_PYTHON_BASE_URL =
  process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base
  const p = path.startsWith("/") ? path : `/${path}`
  return `${b}${p}`
}

async function readBody(response: Response) {
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  return isJson ? await response.json() : await response.text()
}

// ✅ IMPORTANT: params is a Promise in your setup
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const authHeader = _req.headers.get("Authorization")

    const url = joinUrl(RAW_PYTHON_BASE_URL, `/subcontractors/${encodeURIComponent(id)}`)
    const response = await fetch(url, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    const body = await readBody(response)
    return NextResponse.json(body, { status: response.status })
  } catch (error: any) {
    console.error("[subcontractors/[id]] GET proxy error:", error)
    return NextResponse.json(
      {
        detail: "Proxy error calling Python API",
        code: "proxy_error",
        error: error?.message ?? String(error),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const authHeader = req.headers.get("Authorization")
    const userId     = req.headers.get("X-User-Id")
    const payload = await req.json()

    const { searchParams } = new URL(req.url)
    const syncPodio = (searchParams.get("sync_podio") ?? "false").toLowerCase() === "true"

    const url = joinUrl(
      RAW_PYTHON_BASE_URL,
      `/subcontractors/${encodeURIComponent(id)}?sync_podio=${syncPodio ? "true" : "false"}`
    )

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(userId     ? { "X-User-Id": userId }       : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const body = await readBody(response)
    return NextResponse.json(body, { status: response.status })
  } catch (error: any) {
    console.error("[subcontractors/[id]] PATCH proxy error:", error)
    return NextResponse.json(
      {
        detail: "Proxy error calling Python API",
        code: "proxy_error",
        error: error?.message ?? String(error),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const authHeader = req.headers.get("Authorization")
    const userId     = req.headers.get("X-User-Id")

    const { searchParams } = new URL(req.url)
    const syncPodio = (searchParams.get("sync_podio") ?? "false").toLowerCase() === "true"

    const url = joinUrl(
      RAW_PYTHON_BASE_URL,
      `/subcontractors/${encodeURIComponent(id)}?sync_podio=${syncPodio ? "true" : "false"}`
    )

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(userId     ? { "X-User-Id": userId }       : {}),
      },
      cache: "no-store",
    })

    const body = await readBody(response)
    return NextResponse.json(body, { status: response.status })
  } catch (error: any) {
    console.error("[subcontractors/[id]] DELETE proxy error:", error)
    return NextResponse.json(
      {
        detail: "Proxy error calling Python API",
        code: "proxy_error",
        error: error?.message ?? String(error),
      },
      { status: 500 }
    )
  }
}