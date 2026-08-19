// app/api/order/[id]/payments/route.ts
//
// Las cuotas al técnico de una orden. Hasta ahora el panel no las pedía: los
// pagos vivían en `Payment_1/2/3` y no se pintaban en ningún sitio, así que los
// cheques que el cliente lleva en Podio eran invisibles aquí.
import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_API_URL = getBackendUrl()

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const pythonUrl = new URL(
      `${PYTHON_API_URL}/order/${encodeURIComponent(id)}/payments`,
    )

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth =
      request.headers.get("authorization") || request.headers.get("Authorization") || ""
    if (auth) headers["Authorization"] = auth
    const userId = request.headers.get("X-User-Id")
    if (userId) headers["X-User-Id"] = userId

    const response = await fetch(pythonUrl.toString(), { headers, redirect: "follow" })
    const ct = response.headers.get("content-type") || ""
    const body = ct.includes("application/json")
      ? await response.json()
      : await response.text()

    return NextResponse.json(body, { status: response.status })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
