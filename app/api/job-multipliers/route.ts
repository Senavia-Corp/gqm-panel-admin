import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, multiplierId } = body

    console.log("[v0] Linking multiplier to job:", { jobId, multiplierId })

    const url = `${PYTHON_API_BASE_URL}/job_multiplier/jobs/${jobId}/multipliers/${multiplierId}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] Python API response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] Python API response body:", responseText)

    if (!response.ok) {
      console.error("[v0] Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in link multiplier proxy:", error)
    return NextResponse.json({ error: "Failed to link multiplier", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, multiplierId } = body

    console.log("[v0] Unlinking multiplier from job:", { jobId, multiplierId })

    const url = `${PYTHON_API_BASE_URL}/job_multiplier/jobs/${jobId}/multipliers/${multiplierId}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] Python API response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] Python API response body:", responseText)

    if (!response.ok) {
      console.error("[v0] Python API error:", responseText)
      return NextResponse.json(
        { error: `Python API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in unlink multiplier proxy:", error)
    return NextResponse.json({ error: "Failed to unlink multiplier", details: String(error) }, { status: 500 })
  }
}
