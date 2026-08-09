import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_API_BASE_URL = getBackendUrl()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = `${PYTHON_API_BASE_URL}/multiplier/${id}`

    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "Authorization": (request.headers.get("authorization") || request.headers.get("Authorization") || "") },
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