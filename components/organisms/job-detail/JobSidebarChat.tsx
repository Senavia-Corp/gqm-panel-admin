"use client"

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react"
import { Send, RefreshCw, AlertCircle, BookOpen } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useJobChat, type ChatMessageData } from "@/app/jobs/[id]/useJobChat"
import { useToast } from "@/hooks/use-toast"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
  catch { return "" }
}

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500",
]
function avatarColor(memberId: string): string {
  let hash = 0
  for (let i = 0; i < memberId.length; i++) hash = memberId.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Compact message bubble ───────────────────────────────────────────────────

function SidebarBubble({
  msg,
  isSelf,
  showName,
}: {
  msg: ChatMessageData
  isSelf: boolean
  showName: boolean
}) {
  const name  = msg.member_name ?? "Unknown"
  const color = avatarColor(msg.ID_Member)

  return (
    <div className={`flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
      {isSelf ? (
        <div className="w-6 flex-shrink-0" />
      ) : (
        <Avatar className={`h-6 w-6 flex-shrink-0 ${color}`}>
          <AvatarFallback className={`text-[9px] font-bold text-white ${color}`}>
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex max-w-[78%] flex-col gap-0.5 ${isSelf ? "items-end" : "items-start"}`}>
        {!isSelf && showName && (
          <span className="ml-0.5 text-[10px] font-semibold text-slate-400">{name}</span>
        )}
        <div
          className={`rounded-2xl px-3 py-1.5 text-xs leading-relaxed shadow-sm ${
            isSelf
              ? "rounded-br-sm bg-indigo-600 text-white"
              : "rounded-bl-sm border border-slate-100 bg-white text-slate-800"
          }`}
        >
          <span className="whitespace-pre-wrap">{msg.content}</span>
        </div>
        <span className={`text-[9px] text-slate-400 ${isSelf ? "mr-0.5" : "ml-0.5"}`}>
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
        {date}
      </span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JobSidebarChat({ jobId }: { jobId: string }) {
  const { toast } = useToast()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")

  const { messages, isLoading, isSending, error, sendMessage, currentUserId } =
    useJobChat({ jobId })

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    setInput("")
    try {
      await sendMessage(trimmed)
    } catch {
      toast({ title: "Failed to send", description: "Please try again.", variant: "destructive" })
      setInput(trimmed)
    }
  }, [input, isSending, sendMessage, toast])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Group messages by date and detect sender runs
  type GroupedEntry =
    | { type: "date"; date: string }
    | { type: "msg"; msg: ChatMessageData; isSelf: boolean; showName: boolean }

  const grouped: GroupedEntry[] = []
  let lastDate   = ""
  let lastSender = ""

  function formatDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) }
    catch { return "" }
  }

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

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm" style={{ height: "460px" }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
          <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">Logbook</p>
          <p className="text-[10px] text-slate-400">
            {isLoading ? "Loading…" : `${messages.length} entr${messages.length !== 1 ? "ies" : "y"}`}
          </p>
        </div>
        {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-1.5 border-b border-red-100 bg-red-50 px-4 py-2">
          <AlertCircle className="h-3 w-3 flex-shrink-0 text-red-500" />
          <p className="text-[10px] text-red-700">{error}</p>
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────────────────────────── */}
      <div ref={messagesContainerRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <BookOpen className="h-5 w-5 text-indigo-200" />
            </div>
            <p className="text-xs font-medium text-slate-400">No entries yet</p>
            <p className="text-[10px] text-slate-300">Document notes and events below.</p>
          </div>
        )}

        {grouped.map((entry, idx) =>
          entry.type === "date" ? (
            <DateDivider key={`date-${idx}`} date={entry.date} />
          ) : (
            <SidebarBubble
              key={entry.msg.ID_ChatMessage}
              msg={entry.msg}
              isSelf={entry.isSelf}
              showName={entry.showName}
            />
          ),
        )}
      </div>

      {/* ── Input ─────────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            placeholder="Add a log entry…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = `${Math.min(e.target.scrollHeight, 88)}px`
            }}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition-all"
            style={{ minHeight: "34px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            title="Send (Enter)"
          >
            {isSending
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <Send className="h-3 w-3" />}
          </button>
        </div>
        <p className="mt-1 text-[9px] text-slate-400">
          Shift+Enter for new line · updates every 10 s
        </p>
      </div>
    </div>
  )
}
