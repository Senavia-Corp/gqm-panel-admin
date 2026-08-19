import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

/**
 * Estado actual de la sesión: rol y políticas vigentes del usuario del JWT.
 *
 * Existe porque el panel congelaba `user_data` y `user_policies` en
 * localStorage durante el login y no los refrescaba nunca: quien no cerrara
 * sesión arrastraba indefinidamente la etiqueta de rol y los permisos del día
 * que entró. El middleware inyecta el Authorization desde la cookie httpOnly.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization") ?? ""

  try {
    const response = await fetch(`${getBackendUrl()}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[api/auth/me] Error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
