"use client"

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react"
import { Send, RefreshCw, AlertCircle, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useJobChat, type ChatMessageData } from "@/app/jobs/[id]/useJobChat"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  role:  UserRole
  jobId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "long", month: "short", day: "numeric",
    })
  } catch {
    return ""
  }
}

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

// Deterministic color per member ID so each user always gets the same avatar color
const AVATAR_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500",   "bg-indigo-500", "bg-teal-500",  "bg-orange-500",
]
function avatarColor(memberId: string): string {
  let hash = 0
  for (let i = 0; i < memberId.length; i++) hash = memberId.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isSelf,
  showName,
}: {
  msg:      ChatMessageData
  isSelf:   boolean
  showName: boolean
}) {
  const name  = msg.member_name ?? "Unknown"
  const color = avatarColor(msg.ID_Member)

  return (
    <div className={`flex items-end gap-2.5 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar — always shown, but transparent for self to keep alignment */}
      {isSelf ? (
        <div className="w-8 flex-shrink-0" />
      ) : (
        <Avatar className={`h-8 w-8 flex-shrink-0 ${color}`}>
          <AvatarFallback className={`text-[11px] font-bold text-white ${color}`}>
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex max-w-[72%] flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
        {/* Sender name — only for others, only on first bubble in a run */}
        {!isSelf && showName && (
          <span className="ml-1 text-[11px] font-semibold text-slate-500">{name}</span>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isSelf
              ? "rounded-br-sm bg-emerald-600 text-white"
              : "rounded-bl-sm bg-white text-slate-800 border border-slate-100"
          }`}
        >
          {msg.content}
        </div>

        {/* Time */}
        <span className={`text-[10px] text-slate-400 ${isSelf ? "mr-1" : "ml-1"}`}>
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-400">
        {date}
      </span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JobChatTab({ role, jobId }: Props) {
  const { toast }  = useToast()
  const bottomRef  = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")

  const { messages, isLoading, isSending, error, sendMessage, currentUserId } =
    useJobChat({ jobId })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    setInput("")
    try {
      await sendMessage(trimmed)
    } catch {
      toast({
        title:       "Failed to send message",
        description: "Please try again.",
        variant:     "destructive",
      })
      setInput(trimmed)   // restore so the user doesn't lose their text
    }
  }, [input, isSending, sendMessage, toast])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // ── Group messages by date and detect runs ─────────────────────────────────

  type GroupedEntry =
    | { type: "date"; date: string }
    | { type: "msg";  msg: ChatMessageData; isSelf: boolean; showName: boolean }

  const grouped: GroupedEntry[] = []
  let lastDate   = ""
  let lastSender = ""

  for (const msg of messages) {
    const dateStr = formatDate(msg.created_at)
    if (dateStr !== lastDate) {
      grouped.push({ type: "date", date: dateStr })
      lastDate   = dateStr
      lastSender = ""
    }
    const isSelf   = msg.ID_Member === currentUserId
    const showName = !isSelf && msg.ID_Member !== lastSender
    grouped.push({ type: "msg", msg, isSelf, showName })
    lastSender = msg.ID_Member
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-320px)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
          <MessageSquare className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Job Chat</p>
          <p className="text-[11px] text-slate-400">
            {isLoading ? "Loading…" : `${messages.length} message${messages.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {isLoading && (
          <RefreshCw className="ml-auto h-3.5 w-3.5 animate-spin text-slate-400" />
        )}
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <MessageSquare className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-400">Be the first to say something about this job.</p>
          </div>
        )}

        {grouped.map((entry, idx) =>
          entry.type === "date" ? (
            <DateDivider key={`date-${idx}`} date={entry.date} />
          ) : (
            <MessageBubble
              key={entry.msg.ID_ChatMessage}
              msg={entry.msg}
              isSelf={entry.isSelf}
              showName={entry.showName}
            />
          ),
        )}

        {/* Invisible anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-end gap-3">
          <textarea
            rows={1}
            placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-grow up to ~5 lines
              e.target.style.height = "auto"
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 transition-all"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send message (Enter)"
          >
            {isSending
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Shift+Enter for a new line · messages update every 10 s
        </p>
      </div>
    </div>
  )
}