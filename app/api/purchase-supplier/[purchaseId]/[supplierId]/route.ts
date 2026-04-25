import { NextResponse } from "next/server"

const PYTHON_API_BASE_URL =
  process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

type Params = { purchaseId: string; supplierId: string }

export async function POST(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { purchaseId, supplierId } = await params
    const authHeader = req.headers.get("Authorization")
    const target = `${PYTHON_API_BASE_URL}purchase_supplier/purchase/${encodeURIComponent(purchaseId)}/supplier/${encodeURIComponent(supplierId)}`

    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    const ct = response.headers.get("content-type") ?? ""
    const body = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(body, { status: response.status })
  } catch (error: any) {
    return NextResponse.json(
      { detail: "Proxy error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { purchaseId, supplierId } = await params
    const authHeader = req.headers.get("Authorization")
    const target = `${PYTHON_API_BASE_URL}purchase_supplier/purchase/${encodeURIComponent(purchaseId)}/supplier/${encodeURIComponent(supplierId)}`

    const response = await fetch(target, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    })

    const ct = response.headers.get("content-type") ?? ""
    const body = ct.includes("application/json") ? await response.json() : await response.text()
    return NextResponse.json(body, { status: response.status })
  } catch (error: any) {
    return NextResponse.json(
      { detail: "Proxy error", error: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
