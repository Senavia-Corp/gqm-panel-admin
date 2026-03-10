/**
 * app/api/clients/table/route.ts
 *
 * Proxy ligero → GET /clients/table del backend Python.
 * Solo reenvía page, limit y q. No carga relaciones.
 *
 * IMPORTANTE: Este archivo DEBE estar en la ruta
 *   app/api/clients/table/route.ts
 * para que Next.js lo resuelva ANTES de app/api/clients/[id]/route.ts
 * (las rutas estáticas tienen prioridad sobre las dinámicas).
 */

import { type NextRequest, NextResponse } from "next/server"

const BASE = process.env.PYTHON_API_BASE_URL ?? ""

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Construir URL upstream
    const upstream = new URL(`${BASE}/clients/table`)
    ;(["page", "limit", "q"] as const).forEach((key) => {
      const val = searchParams.get(key)
      if (val !== null && val !== "") upstream.searchParams.set(key, val)
    })

    console.log("[proxy] GET /clients/table →", upstream.toString())

    const res = await fetch(upstream.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error("[proxy] /clients/table upstream error:", res.status, errText.slice(0, 300))
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, detail: errText.slice(0, 300) },
        { status: res.status },
      )
    }

    const data = await res.json()
    console.log(`[proxy] /clients/table OK — total=${data.total}, page=${data.page}, results=${data.results?.length}`)
    return NextResponse.json(data)
  } catch (e) {
    console.error("[proxy] /clients/table exception:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}