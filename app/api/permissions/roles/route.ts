import { NextResponse } from "next/server"

const PYTHON_API_BASE_URL =
  process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

const asJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const body = isJson ? await response.json() : await response.text()
  return NextResponse.json(isJson ? body : { raw: body }, { status: response.status })
}

type LinkPayload = {
  permissionId: string
  roleId: string
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as LinkPayload
    const authHeader = req.headers.get("Authorization")

    if (!payload?.permissionId || !payload?.roleId) {
      return NextResponse.json(
        { detail: "permissionId and roleId are required", code: "validation_error" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${PYTHON_API_BASE_URL}permission_role/permission/${payload.permissionId}/role/${payload.roleId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
        cache: "no-store",
      }
    )

    return asJsonResponse(response)
  } catch (error: any) {
    console.error("[proxy] permissions/roles POST error:", error)
    return NextResponse.json(
      { detail: "Proxy error calling Python API", code: "proxy_error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const payload = (await req.json()) as LinkPayload
    const authHeader = req.headers.get("Authorization")

    if (!payload?.permissionId || !payload?.roleId) {
      return NextResponse.json(
        { detail: "permissionId and roleId are required", code: "validation_error" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${PYTHON_API_BASE_URL}permission_role/permission/${payload.permissionId}/role/${payload.roleId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
        cache: "no-store",
      }
    )

    return asJsonResponse(response)
  } catch (error: any) {
    console.error("[proxy] permissions/roles DELETE error:", error)
    return NextResponse.json(
      { detail: "Proxy error calling Python API", code: "proxy_error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
