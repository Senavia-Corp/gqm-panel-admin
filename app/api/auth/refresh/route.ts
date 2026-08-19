import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"
import { roleSlugFrom } from "@/lib/role-map"

const REFRESH_MAX_AGE = 7 * 24 * 60 * 60

export async function POST() {
  try {
    // El refresh token vive SOLO en la cookie httpOnly (REG-108)
    const refreshToken = (await cookies()).get("gqm_rt")?.value
    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 })
    }

    const response = await fetch(`${getBackendUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    })

    const data = await response.json()

    if (!response.ok) {
      const res = NextResponse.json(
        { error: data.error || "Failed to refresh token" },
        { status: response.status },
      )
      // Refresh inválido: matar la sesión
      res.cookies.delete("gqm_at")
      res.cookies.set("gqm_rt", "", { path: "/api/auth", maxAge: 0 })
      res.cookies.delete("gqm_role")
      res.cookies.delete("gqm_uid")
      return res
    }

    const secure = process.env.NODE_ENV === "production"

    // gqm_role y gqm_uid solo se escribían en el login, con maxAge de 7 días y
    // sin renovarse nunca — mientras gqm_at SÍ se renueva aquí a otros 7. Pasada
    // la semana la sesión seguía viva pero la cookie de rol ya no estaba, y el
    // `|| "gqm_member"` del middleware degradaba al Full Admin en silencio.
    // Se recalculan desde el backend para que además un CAMBIO de rol surta
    // efecto sin obligar a cerrar sesión.
    let role: string | null = null
    let uid: string | null = null
    try {
      const me = await fetch(`${getBackendUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
        cache: "no-store",
      })
      if (me.ok) {
        const meData = await me.json()
        role = roleSlugFrom(meData.user_type, meData.user_data?.role_detail?.Name)
        uid = String(meData.user_id ?? "")
      }
    } catch (error) {
      // Si /auth/me falla, se renueva el token igualmente y se dejan las
      // cookies de rol como estaban: degradar aquí sería peor que no tocarlas.
      console.error("[api/auth/refresh] No se pudo releer el rol:", error)
    }

    const res = NextResponse.json({ ok: true, ...(role ? { role } : {}) })
    res.cookies.set("gqm_at", data.access_token, {
      httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: REFRESH_MAX_AGE,
    })
    if (data.refresh_token) {
      res.cookies.set("gqm_rt", data.refresh_token, {
        httpOnly: true, sameSite: "lax", secure, path: "/api/auth", maxAge: REFRESH_MAX_AGE,
      })
    }
    if (role) {
      res.cookies.set("gqm_role", role, {
        httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: REFRESH_MAX_AGE,
      })
      res.cookies.set("gqm_uid", uid ?? "", {
        httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: REFRESH_MAX_AGE,
      })
    }
    return res
  } catch (error) {
    console.error("[api/auth/refresh] Error:", error)
    return NextResponse.json({ error: "An error occurred during token refresh" }, { status: 500 })
  }
}
