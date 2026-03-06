import { NextResponse } from "next/server"

const PYTHON_BASE_URL =
  process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms/"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get("type") ?? "ALL"
    const year = url.searchParams.get("year") // optional

    const backend = PYTHON_BASE_URL
    if (!backend) {
      return NextResponse.json({ detail: "Missing PYTHON_API_BASE_URL env var" }, { status: 500 })
    }

    const qs = new URLSearchParams({ type })
    if (year) qs.set("year", year)

    const target = `${backend.replace(/\/$/, "")}/metrics/reports/jobs?${qs.toString()}`

    const res = await fetch(target, {
      method: "GET",
      // NO pongas Content-Type aquí (no estás mandando body)
      headers: {
        Accept: "application/pdf",
      },
      // opcional: evita cache en Vercel/Next
      cache: "no-store",
    })

    if (!res.ok) {
      // El backend puede devolver JSON de error
      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const errJson = await res.json()
        return NextResponse.json(errJson, { status: res.status })
      }
      const errText = await res.text()
      return NextResponse.json(
        { detail: "Backend error generating PDF", backendStatus: res.status, backendBody: errText },
        { status: res.status }
      )
    }

    const pdfBuffer = await res.arrayBuffer()

    // Reusar filename del backend si lo manda; si no, crear uno
    const backendDisposition = res.headers.get("content-disposition")
    const filename = `jobs_report_${type}_${year ?? "ALL"}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": backendDisposition ?? `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("Proxy reports/jobs error:", err)
    return NextResponse.json({ detail: "Internal proxy error" }, { status: 500 })
  }
}