import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://localhost:80/"
const COMMISSION_DETAIL_BASE = `${PYTHON_BASE_URL}commission_detail`

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

// ─── GET /api/commission_detail ───────────────────────────────────────────────
// Supports:
//   ?page=1&limit=10     → paginated full list with job info
//   ?id=<id_comdetail>   → single commission detail by ID
export async function GET(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const page = searchParams.get("page") ?? DEFAULT_PAGE
    const limit = searchParams.get("limit") ?? DEFAULT_LIMIT

    if (id) {
        const url = `${COMMISSION_DETAIL_BASE}/${encodeURIComponent(id)}`
        console.log("[commission_detail proxy] GET by id ->", url)
        const result = await proxyFetch(url, { method: "GET" })
        if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
        return NextResponse.json(result.data)
    }

    const params = new URLSearchParams({ page, limit })
    const url = `${COMMISSION_DETAIL_BASE}/?${params.toString()}`
    console.log("[commission_detail proxy] GET list ->", url)
    const result = await proxyFetch(url, { method: "GET" })
    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data)
}

// ─── POST /api/commission_detail ─────────────────────────────────────────────
// Body: CommissionDeCreate { Factor, ID_Jobs, ID_ComGroup }
//
// The backend will:
//   1. Look up the job's Gqm_premium_in_money
//   2. Calculate Sell_Mgmt = Factor * Gqm_premium_in_money
//   3. Bubble up and recalculate Total_detail on CommissionGroup
//      and Total_commission on Commission automatically
export async function POST(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const body = await request.json().catch(() => null)
    if (!body) return jsonError("Invalid JSON body", 400)

    const url = `${COMMISSION_DETAIL_BASE}/`
    console.log("[commission_detail proxy] POST ->", url)

    const result = await proxyFetch(url, {
        method: "POST",
        body: JSON.stringify(body),
    })

    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data, { status: 201 })
}

// ─── PATCH /api/commission_detail ────────────────────────────────────────────
// Query: ?id=<id_comdetail>
// Body: CommissionDeUpdate (partial — Factor and/or ID_Jobs trigger Sell_Mgmt recalc)
//
// If Factor or ID_Jobs is updated, the backend recalculates Sell_Mgmt and
// bubbles totals up through CommissionGroup → Commission automatically.
export async function PATCH(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return jsonError("Missing required query param: id", 400)

    const body = await request.json().catch(() => null)
    if (!body) return jsonError("Invalid JSON body", 400)

    const url = `${COMMISSION_DETAIL_BASE}/${encodeURIComponent(id)}`
    console.log("[commission_detail proxy] PATCH ->", url)

    const result = await proxyFetch(url, {
        method: "PATCH",
        body: JSON.stringify(body),
    })

    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data)
}

// ─── DELETE /api/commission_detail ───────────────────────────────────────────
// Query: ?id=<id_comdetail>
//
// After deletion, the backend automatically recalculates Total_detail on the
// parent CommissionGroup and Total_commission on the parent Commission.
export async function DELETE(request: NextRequest) {
    if (!PYTHON_BASE_URL) return jsonError("Missing PYTHON_API_BASE_URL env var", 500)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return jsonError("Missing required query param: id", 400)

    const url = `${COMMISSION_DETAIL_BASE}/${encodeURIComponent(id)}`
    console.log("[commission_detail proxy] DELETE ->", url)

    const result = await proxyFetch(url, { method: "DELETE" })
    if (!result.ok) return jsonError(`Python API error (${result.status})`, result.status, { detail: result.error })
    return NextResponse.json(result.data)
}