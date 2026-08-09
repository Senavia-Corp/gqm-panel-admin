import { NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"
import { roleSlugFrom } from "@/lib/role-map"

// TTLs alineados con el API (ACCESS_TOKEN_EXPIRES_MIN=60, REFRESH=7d)
const ACCESS_MAX_AGE = 60 * 60
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    const response = await fetch(`${getBackendUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Email_Address: email, Password: password }),
      cache: "no-store",
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Invalid email or password" },
        { status: 401 },
      )
    }

    // Sesión httpOnly (REG-108): los tokens viajan SOLO en cookies; el
    // cliente nunca los ve. gqm_role/gqm_uid son legibles para gating de UI.
    const { access_token, refresh_token, token_type: _tt, ...safe } = data
    const role = roleSlugFrom(data.user_type, data.user_data?.role_detail?.Name)

    const res = NextResponse.json({ ...safe, role })
    const secure = process.env.NODE_ENV === "production"
    res.cookies.set("gqm_at", access_token, {
      httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: ACCESS_MAX_AGE,
    })
    res.cookies.set("gqm_rt", refresh_token, {
      httpOnly: true, sameSite: "lax", secure, path: "/api/auth", maxAge: REFRESH_MAX_AGE,
    })
    res.cookies.set("gqm_role", role, {
      httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: REFRESH_MAX_AGE,
    })
    res.cookies.set("gqm_uid", String(data.user_id ?? ""), {
      httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: REFRESH_MAX_AGE,
    })
    return res
  } catch (error) {
    console.error("[api/auth/login] Error:", error)
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
