// app/api/tasks/weekly/route.ts
// GET /api/tasks/weekly
// GET /api/tasks/weekly?job_type=QID   (también PTL | PAR)
// Maps to Python: GET /tasks/weekly?job_type=<value>
//
// Retorna tareas cuya Delivery_date cae en la semana actual (lun–dom).
// job_type es opcional; si se omite, retorna todos los tipos.

import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const TIMEOUT_MS   = 20_000

const VALID_JOB_TYPES = ["QID", "PTL", "PAR"] as const
type JobType = typeof VALID_JOB_TYPES[number]

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const jobType          = searchParams.get("job_type")

  // Validación temprana en el proxy — evita un round-trip innecesario al backend
  if (jobType && !VALID_JOB_TYPES.includes(jobType as JobType)) {
    return jsonError(
      `job_type inválido: "${jobType}". Valores permitidos: ${VALID_JOB_TYPES.join(", ")}`,
      400
    )
  }

  const url = new URL(`${API_BASE_URL}/tasks/weekly`)
  if (jobType) url.searchParams.set("job_type", jobType)

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), {
      method:  "GET",
      cache:   "no-store",
      signal:  controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return jsonError(`Python API error: ${text || res.statusText}`, res.status)
    }

    const data = await res.json().catch(() => [])
    return NextResponse.json(data)

  } catch (e: any) {
    if (e?.name === "AbortError") return jsonError(`Timeout after ${TIMEOUT_MS}ms`, 504)
    return jsonError(e?.message ?? "Connection failed", 502)
  } finally {
    clearTimeout(timeout)
  }
}