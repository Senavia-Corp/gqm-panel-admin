// app/api/purchases/table/route.ts
import { NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const API = `${getBackendUrl()}/purchase`

export async function GET(req: Request) {
  try {
    const url    = new URL(req.url)
    const qs     = url.searchParams.toString()
    const target = `${API}/table${qs ? `?${qs}` : ""}`

    const authHeader = req.headers.get("Authorization")
    
    const res = await fetch(target, {
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    const ct   = res.headers.get("content-type") ?? ""
    const body = ct.includes("application/json") ? await res.json() : { raw: await res.text() }
    return NextResponse.json(body, { status: res.status })
  } catch (e: any) {
    console.error("[proxy] purchases/table GET error:", e)
    return NextResponse.json({ detail: "Proxy error", error: e?.message }, { status: 500 })
  }
}