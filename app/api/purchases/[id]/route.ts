import { NextResponse } from "next/server"

const PYTHON_API_BASE_URL =
  process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

type Params = { params: Promise<{ id: string }> }

const asJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const body = isJson ? await response.json() : await response.text()
  return NextResponse.json(isJson ? body : { raw: body }, { status: response.status })
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const authHeader = _req.headers.get("Authorization")

    const response = await fetch(`${PYTHON_API_BASE_URL}purchase/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
      cache: "no-store",
    })

    return asJsonResponse(response)
  } catch (error: any) {
    console.error("[proxy] purchases/[id] GET error:", error)
    return NextResponse.json(
      { detail: "Proxy error calling Python API", code: "proxy_error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const payload = await req.json()
    const authHeader = req.headers.get("Authorization")

    const response = await fetch(`${PYTHON_API_BASE_URL}purchase/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    return asJsonResponse(response)
  } catch (error: any) {
    console.error("[proxy] purchases/[id] PATCH error:", error)
    return NextResponse.json(
      { detail: "Proxy error calling Python API", code: "proxy_error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const authHeader = _req.headers.get("Authorization")

    const response = await fetch(`${PYTHON_API_BASE_URL}purchase/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
      cache: "no-store",
    })

    return asJsonResponse(response)
  } catch (error: any) {
    console.error("[proxy] purchases/[id] DELETE error:", error)
    return NextResponse.json(
      { detail: "Proxy error calling Python API", code: "proxy_error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
