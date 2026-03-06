import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const upstream = `${BACKEND_URL}/skills/${encodeURIComponent(id)}`

    const res = await fetch(upstream, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
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

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const body = await req.text()
    const upstream = `${BACKEND_URL}/skills/${encodeURIComponent(id)}`

    const res = await fetch(upstream, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
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
    const { id } = await params
    const upstream = `${BACKEND_URL}/skills/${encodeURIComponent(id)}`

    const res = await fetch(upstream, {
      method: "DELETE",
      cache: "no-store",
      headers: { Accept: "application/json" },
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