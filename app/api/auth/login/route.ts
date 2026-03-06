import { NextResponse } from "next/server"

const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log("[v0] Attempting login for:", email)

    // Call Python backend
    const response = await fetch(`${PYTHON_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Email_Address: email,
        Password: password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.log("[v0] Login failed:", data.error)
      return NextResponse.json({ error: data.error || "Invalid email or password" }, { status: 401 })
    }

    console.log("[v0] Login successful, user_type:", data.user_type)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
