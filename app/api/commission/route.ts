import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://localhost:80/"
const COMMISSION_BASE = `${PYTHON_BASE_URL}commission`

const DEFAULT_PAGE = "1"
const DEFAULT_LIMIT = "10"
const TIMEOUT_MS = 120_000

function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
    return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

async function proxyFetch(url: string, init?: RequestInit) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const res = await fetch(url, {
            ...init,
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                ...(init?.headers ?? {}),
            },
            signal: controller.signal,
        })

        const text = await res.text()
        let data: any = null
        if (text) {
            try { data = JSON.parse(text) } catch { data = null }
        }

        if (!res.ok) {
            const detail =
                (data && (data.detail || data.error || data.message)) ??
                text?.slice(0, 1000) ??
                `Python API returned ${res.status}`
            return { ok: false, status: res.status, data: null, raw: text, error: detail }
        }

        return { ok: true, status: res.status, data: data ?? (text ? text : null), raw: text, error: null }
    } catch (e: any) {
        const isAbort = e?.name === "AbortError"
        return {
            ok: false,
            status: isAbort ? 504 : 502,
            data: null,
            raw: null,
            error: isAbort
                ? `Request timeout after ${TIMEOUT_MS}ms`
                : e?.message ?? "Failed to connect to Python API",
        }
    } finally {
        clearTimeout(timeout)
    }
}

// ─── GET /api/commission ──────────────────────────────────────────────────────
// Supports:
//   ?page=1&limit=10              → paginated full list with relationships
//   ?table=true                   → lightweight table view (no relationships)
//   ?memberId=<id>                → commissions by member
//   ?id=<commission_id>           → single commission by ID
export async function GET(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const { searchParams } = new URL(request.url)

    const id = searchParams.get("id")
    const memberId = searchParams.get("memberId")
    const isTable = searchParams.get("table") === "true"
    const page = searchParams.get("page") ?? DEFAULT_PAGE
    const limit = searchParams.get("limit") ?? DEFAULT_LIMIT
    const q = searchParams.get("q")

    // Single commission by ID
    if (id) {
        const url = `${COMMISSION_BASE}/${encodeURIComponent(id)}`
        console.log("[commission proxy] GET by id ->", url)
        const result = await proxyFetch(url, { method: "GET" })
        if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
        return NextResponse.json(result.data)
    }

    // Commissions by member
    if (memberId) {
        const url = `${COMMISSION_BASE}/member/${encodeURIComponent(memberId)}`
        console.log("[commission proxy] GET by member ->", url)
        const result = await proxyFetch(url, { method: "GET" })
        if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
        return NextResponse.json(result.data)
    }

    // Lightweight table view
    if (isTable) {
        const params = new URLSearchParams({ page, limit })
        if (q) params.set("q", q)
        const url = `${COMMISSION_BASE}/commission_table?${params.toString()}`
        console.log("[commission proxy] GET table ->", url)
        const result = await proxyFetch(url, { method: "GET" })
        if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
        return NextResponse.json(result.data)
    }

    // Full paginated list
    const params = new URLSearchParams({ page, limit })
    const url = `${COMMISSION_BASE}/?${params.toString()}`
    console.log("[commission proxy] GET list ->", url)
    const result = await proxyFetch(url, { method: "GET" })
    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data)
}

// ─── POST /api/commission ─────────────────────────────────────────────────────
// Body: CommissionCreate { Month, Year, Total_commission, Total_margin, Total_reimbursment, ID_Member }
export async function POST(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const body = await request.json().catch(() => null)
    if (!body) return jsonError("Invalid JSON body", 400)

    const url = `${COMMISSION_BASE}/`
    console.log("[commission proxy] POST ->", url)

    const result = await proxyFetch(url, {
        method: "POST",
        body: JSON.stringify(body),
    })

    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data, { status: 201 })
}

// ─── PATCH /api/commission ────────────────────────────────────────────────────
// Query: ?id=<commission_id>
// Body: CommissionUpdate (partial)
export async function PATCH(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return jsonError("Missing required query param: id", 400)

    const body = await request.json().catch(() => null)
    if (!body) return jsonError("Invalid JSON body", 400)

    const url = `${COMMISSION_BASE}/${encodeURIComponent(id)}`
    console.log("[commission proxy] PATCH ->", url)

    const result = await proxyFetch(url, {
        method: "PATCH",
        body: JSON.stringify(body),
    })

    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data)
}

// ─── DELETE /api/commission ───────────────────────────────────────────────────
// Query: ?id=<commission_id>
export async function DELETE(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return jsonError("Missing required query param: id", 400)

    const url = `${COMMISSION_BASE}/${encodeURIComponent(id)}`
    console.log("[commission proxy] DELETE ->", url)

    const result = await proxyFetch(url, { method: "DELETE" })
    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data)
}