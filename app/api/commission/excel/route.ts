import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "http://localhost:8000/"
const COMMISSION_EXCEL_URL = `${PYTHON_BASE_URL}commission/excel`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Forward all query params (member_id, year, month)
  const targetUrl = new URL(COMMISSION_EXCEL_URL)
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value)
  })

  console.log("[commission excel proxy] GET ->", targetUrl.toString())

  try {
    const authHeader = request.headers.get("Authorization") ?? ""

    const res = await fetch(targetUrl.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[commission excel proxy] error:", res.status, errorText)
      return NextResponse.json(
        { error: `Backend error: ${res.status}`, detail: errorText },
        { status: res.status }
      )
    }

    const blob = await res.blob()
    
    // Create a response with the binary data
    const response = new NextResponse(blob)
    
    // Copy headers from backend response (like Content-Disposition, Content-Type)
    response.headers.set("Content-Type", res.headers.get("Content-Type") || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    const cd = res.headers.get("Content-Disposition")
    if (cd) response.headers.set("Content-Disposition", cd)
    
    return response
  } catch (error: any) {
    console.error("[commission excel proxy] fetch failure:", error)
    return NextResponse.json(
      { error: "Failed to connect to backend", detail: error.message },
      { status: 502 }
    )
  }
}
