import { NextResponse } from "next/server"

const PYTHON_API_BASE_URL =
  process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

const asJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const body = isJson ? await response.json() : await response.text()
  return NextResponse.json(isJson ? body : { raw: body }, { status: response.status })
}

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}role/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    return asJsonResponse(response)
  } catch (error: any) {
    console.error("[proxy] roles GET error:", error)
    return NextResponse.json(
      { detail: "Proxy error calling Python API", code: "proxy_error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()

    const response = await fetch(`${PYTHON_API_BASE_URL}role/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    return asJsonResponse(response)
  } catch (error: any) {
    console.error("[proxy] roles POST error:", error)
    return NextResponse.json(
      { detail: "Proxy error calling Python API", code: "proxy_error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
