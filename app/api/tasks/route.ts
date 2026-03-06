// app/api/tasks/route.ts
// POST  → GET /tasks/            (list)  — no usado desde el board
// POST  → POST /tasks/           (create)
// PATCH → PATCH /tasks/<ID_Tasks>
// DELETE → DELETE /tasks/<ID_Tasks>
//
// FIX: PATCH and DELETE now use ID_Tasks (not podio_item_id) as the task identifier,
// which matches the Python blueprint's /<task_id> parameter.

import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://6qh4h0kx-80.use.devtunnels.ms"
const TIMEOUT_MS   = 20_000

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-Id")
}

function buildHeaders(userId: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (userId) h["X-User-Id"] = userId
  return h
}

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

async function proxyFetch(url: string, init: RequestInit): Promise<NextResponse> {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return jsonError(`Python API error: ${text || res.statusText}`, res.status)
    }
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data)
  } catch (e: any) {
    if (e?.name === "AbortError") return jsonError(`Timeout after ${TIMEOUT_MS}ms`, 504)
    return jsonError(e?.message ?? "Connection failed", 502)
  } finally {
    clearTimeout(timeout)
  }
}

// ── POST /api/tasks → create task ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body   = await request.json()
    const userId = getUserId(request)
    return proxyFetch(`${API_BASE_URL}/tasks/`, {
      method:  "POST",
      headers: buildHeaders(userId),
      body:    JSON.stringify(body),
    })
  } catch (e) {
    return jsonError("Internal server error")
  }
}

// ── PATCH /api/tasks → update task ────────────────────────────────────────────
// Body must contain ID_Tasks (the primary key from the DB).
// Optionally also accepts the legacy podio_item_id field — it is stripped before forwarding.
export async function PATCH(request: NextRequest) {
  try {
    const body   = await request.json()
    const userId = getUserId(request)

    // ✅ Use ID_Tasks as the primary identifier (matches Python /<task_id>)
    const taskId = body?.ID_Tasks ?? body?.id ?? null
    if (!taskId) return jsonError("ID_Tasks is required for task update", 400)

    // Strip internal routing keys before forwarding
    const { ID_Tasks, podio_item_id, ...updateData } = body

    return proxyFetch(`${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}`, {
      method:  "PATCH",
      headers: buildHeaders(userId),
      body:    JSON.stringify(updateData),
    })
  } catch (e) {
    return jsonError("Internal server error")
  }
}

// ── DELETE /api/tasks → delete task ───────────────────────────────────────────
// Accepts ID_Tasks as query param: DELETE /api/tasks?task_id=TSK-001
// Also accepts legacy podio_item_id for backwards compat (ignored by Python, but accepted here).
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = getUserId(request)

    // ✅ Primary: task_id (= ID_Tasks). Fallback: podio_item_id (legacy, kept for compat).
    const taskId = searchParams.get("task_id") ?? searchParams.get("podio_item_id") ?? null
    if (!taskId) return jsonError("task_id (ID_Tasks) is required for task deletion", 400)

    return proxyFetch(`${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}`, {
      method:  "DELETE",
      headers: buildHeaders(userId),
    })
  } catch (e) {
    return jsonError("Internal server error")
  }
}