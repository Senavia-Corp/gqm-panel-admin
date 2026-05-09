import { type NextRequest, NextResponse } from "next/server"

const PYTHON_BASE_URL = process.env.PYTHON_API_BASE_URL ?? "https://localhost:80/"

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
