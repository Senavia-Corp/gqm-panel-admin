import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"

export async function POST(request: NextRequest) {
  try {
    const pythonUrl = `${PYTHON_API_BASE_URL}/jobs_excel/export`
    const body = await request.json()
    const authHeader = request.headers.get("Authorization") ?? ""

    console.log("[proxy] POST jobs_excel/export →", pythonUrl)

    const response = await fetch(pythonUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(errorJson, { status: response.status })
      } catch {
        return NextResponse.json({ error: errorText }, { status: response.status })
      }
    }

    const blob = await response.blob()
    
    // Devolver el blob con las cabeceras correctas para descarga
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="jobs_export.xlsx"',
      },
    })
  } catch (error) {
    console.error("[proxy] Error exporting excel:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
