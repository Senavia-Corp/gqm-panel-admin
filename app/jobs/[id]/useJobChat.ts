"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessageData {
  ID_ChatMessage: string
  content:        string
  ID_Job:         string
  ID_Member:      string
  member_name:    string | null
  created_at:     string   // ISO string
}

interface UseJobChatOptions {
  jobId:          string
  pollIntervalMs?: number   // default: 10_000
}

interface UseJobChatReturn {
  messages:    ChatMessageData[]
  isLoading:   boolean
  isSending:   boolean
  error:        string | null
  sendMessage: (content: string) => Promise<void>
  currentUserId: string | null
}

// ─── Token helper ─────────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  try {
    return localStorage.getItem("access_token")
  } catch {
    return null
  }
}

function getCurrentUserId(): string | null {
  try {
    const direct = localStorage.getItem("user_id")
    if (direct) return direct
    const raw = localStorage.getItem("user_data")
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id ?? user?.ID_Member ?? null
  } catch {
    return null
  }
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return {
    "Content-Type":  "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJobChat({
  jobId,
  pollIntervalMs = 10_000,
}: UseJobChatOptions): UseJobChatReturn {
  const [messages,    setMessages]    = useState<ChatMessageData[]>([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [isSending,   setIsSending]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [currentUserId] = useState<string | null>(() => getCurrentUserId())

  // Track the ID of the last message we received so polling only fetches new ones
  const lastIdRef   = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Initial load ─────────────────────────────────────────────────────────

  const loadInitial = useCallback(async () => {
    if (!jobId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/chat/job/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        cache:   "no-store",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as any)?.error ?? `Error ${res.status}`)
      }
      const data: ChatMessageData[] = await res.json()
      setMessages(data)
      if (data.length > 0) {
        lastIdRef.current = data[data.length - 1].ID_ChatMessage
      }
    } catch (err) {
      console.error("[useJobChat] initial load failed:", err)
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  // ── Incremental poll — only fetches messages newer than lastId ────────────

  const pollNew = useCallback(async () => {
    if (!jobId) return
    try {
      const qs  = lastIdRef.current ? `?desde_id=${encodeURIComponent(lastIdRef.current)}` : ""
      const res = await fetch(`/api/chat/job/${encodeURIComponent(jobId)}${qs}`, {
        headers: authHeaders(),
        cache:   "no-store",
      })
      if (!res.ok) return   // silent on poll errors — don't disrupt the UI

      const data: ChatMessageData[] = await res.json()
      if (!Array.isArray(data) || data.length === 0) return

      setMessages((prev) => {
        // Deduplicate by ID in case of race conditions
        const existingIds = new Set(prev.map((m) => m.ID_ChatMessage))
        const newOnes     = data.filter((m) => !existingIds.has(m.ID_ChatMessage))
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev
      })

      lastIdRef.current = data[data.length - 1].ID_ChatMessage
    } catch {
      // Silent — polling errors don't break the chat
    }
  }, [jobId])

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!jobId) return

    loadInitial()

    // Start polling after the initial load settles
    intervalRef.current = setInterval(pollNew, pollIntervalMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [jobId, loadInitial, pollNew, pollIntervalMs])

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !jobId) return

    setIsSending(true)
    try {
      const res = await fetch(`/api/chat/job/${encodeURIComponent(jobId)}`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({ content: trimmed }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as any)?.error ?? `Error ${res.status}`)
      }
      const created: ChatMessageData = await res.json()

      // Optimistically append the new message without waiting for the next poll
      setMessages((prev) => {
        const exists = prev.some((m) => m.ID_ChatMessage === created.ID_ChatMessage)
        return exists ? prev : [...prev, created]
      })
      lastIdRef.current = created.ID_ChatMessage
    } catch (err) {
      console.error("[useJobChat] sendMessage failed:", err)
      throw err   // Let the UI handle the error toast
    } finally {
      setIsSending(false)
    }
  }, [jobId])

  return { messages, isLoading, isSending, error, sendMessage, currentUserId }
}