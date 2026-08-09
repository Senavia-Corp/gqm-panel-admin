import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

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
    const res = NextResponse.json({ ok: true })
    res.cookies.set("gqm_at", data.access_token, {
      httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: REFRESH_MAX_AGE,
    })
    if (data.refresh_token) {
      res.cookies.set("gqm_rt", data.refresh_token, {
        httpOnly: true, sameSite: "lax", secure, path: "/api/auth", maxAge: REFRESH_MAX_AGE,
      })
    }
    return res
  } catch (error) {
    console.error("[api/auth/refresh] Error:", error)
    return NextResponse.json({ error: "An error occurred during token refresh" }, { status: 500 })
  }
}
