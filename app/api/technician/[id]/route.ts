import { NextResponse } from "next/server"
const PYTHON_API_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`[v0] Fetching technician data for ID: ${id}`)

    const url = `${PYTHON_API_URL}/technician/${id}`

    console.log(`[v0] Fetching from: ${url}`)

    const authHeader = request.headers.get("Authorization")
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`[v0] Error fetching technician: ${response.status}`)
      const errorText = await response.text()
      console.error(`[v0] Error response: ${errorText}`)
      return NextResponse.json({ error: "Failed to fetch technician" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Technician data fetched successfully")
    console.log(`[v0] Technician has ${data.subcontractor?.jobs?.length || 0} jobs`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in technician API route:", error)
    console.error("[v0] Error details:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
