import { NextResponse } from "next/server"

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"
const PYTHON_SUBCONTRACTOR_TABLE_URL = `${PYTHON_API_BASE_URL}subcontractors/subcontractors_table`

export async function GET(req: Request) {
  try {
    const incomingUrl = new URL(req.url)
    const pythonUrl = new URL(PYTHON_SUBCONTRACTOR_TABLE_URL)

    incomingUrl.searchParams.forEach((value, key) => {
      pythonUrl.searchParams.set(key, value)
    })

    console.log("[v0] Proxy: Fetching subcontractors_table from Python API:", pythonUrl.toString())

    const response = await fetch(pythonUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    const contentType = response.headers.get("content-type") || ""
    const isJson = contentType.includes("application/json")
    const body = isJson ? await response.json() : await response.text()

    return NextResponse.json(body, { status: response.status })
  } catch (error: any) {
    console.error("[v0] Proxy: Error calling Python API (subcontractors_table):", error)
    return NextResponse.json(
      {
        detail: "Proxy error calling Python API",
        code: "proxy_error",
        error: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}