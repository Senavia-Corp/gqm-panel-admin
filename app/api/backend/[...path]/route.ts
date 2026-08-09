// Proxy catchall same-origin → backend Python (REG-108/REG-022).
// Para los clientes que llamaban al API directo desde el navegador
// (ApiProvider/axios): la cookie httpOnly no puede viajar cross-origin, así
// que pasan por aquí y el middleware inyecta Authorization.
import { type NextRequest, NextResponse } from "next/server"

import { getBackendUrl } from "@/lib/api-utils"

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const url = new URL(`${getBackendUrl()}/${path.join("/")}`)
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value))

  const headers: Record<string, string> = {}
  const auth = request.headers.get("authorization")
  if (auth) headers["Authorization"] = auth
  const uid = request.headers.get("x-user-id")
  if (uid) headers["X-User-Id"] = uid
  const contentType = request.headers.get("content-type")
  if (contentType) headers["Content-Type"] = contentType

  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.text()

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    redirect: "follow",
  })

  const respBody = await response.text()
  return new NextResponse(respBody, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  })
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE }
