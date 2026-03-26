import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = `${PYTHON_API_BASE_URL}/multiplier/${id}`

    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: `Python API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

    const data = JSON.parse(responseText)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete multiplier", details: String(error) },
      { status: 500 },
    )
  }
}