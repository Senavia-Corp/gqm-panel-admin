import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("gqm_at")
  res.cookies.set("gqm_rt", "", { path: "/api/auth", maxAge: 0 })
  res.cookies.delete("gqm_role")
  res.cookies.delete("gqm_uid")
  return res
}
