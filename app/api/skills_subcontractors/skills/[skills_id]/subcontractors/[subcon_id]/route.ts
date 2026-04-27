import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

type Ctx = { params: Promise<{ skills_id: string; subcon_id: string }> }

function buildUpstream(req: NextRequest, skillsId: string, subconId: string) {
  const url = new URL(req.url)
  const qs = url.searchParams.toString()

  return `${BACKEND_URL}/skills_subcontractors/skills/${encodeURIComponent(
    skillsId
  )}/subcontractors/${encodeURIComponent(subconId)}${qs ? `?${qs}` : ""}`
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { skills_id, subcon_id } = await params
    const upstream = buildUpstream(req, skills_id, subcon_id)
    

    const authHeader = req.headers.get("Authorization")
    const userId     = req.headers.get("X-User-Id")
    const res = await fetch(upstream, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(userId     ? { "X-User-Id": userId }       : {}),
      },
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return NextResponse.json(
      { detail: e?.message ?? "Proxy error", code: "proxy_error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { skills_id, subcon_id } = await params
    const upstream = buildUpstream(req, skills_id, subcon_id)
    console.log("[skills_subcontractors proxy] upstream:", upstream)

    const authHeader = req.headers.get("Authorization")
    const userId     = req.headers.get("X-User-Id")
    const res = await fetch(upstream, {
      method: "DELETE",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(userId     ? { "X-User-Id": userId }       : {}),
      },
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return NextResponse.json(
      { detail: e?.message ?? "Proxy error", code: "proxy_error" },
      { status: 500 }
    )
  }
}