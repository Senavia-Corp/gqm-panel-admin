import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/api-utils"

const PYTHON_BASE_URL = `${getBackendUrl()}/`

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("Authorization") ?? ""
    const actions = new URL(request.url).searchParams.get("actions") ?? ""

    try {
        const url = `${PYTHON_BASE_URL}auth/can?actions=${encodeURIComponent(actions)}`
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            cache: "no-store",
        })
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch {
        return NextResponse.json({ results: {} }, { status: 200 })
    }
}
