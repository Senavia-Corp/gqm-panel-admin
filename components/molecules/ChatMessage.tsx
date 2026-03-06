import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChatMessageProps {
  id: string
  content: string
  sender: {
    name: string
    avatar: string
    id: string
  }
  timestamp: string
  isSent: boolean
}

export function ChatMessage({ content, sender, timestamp, isSent }: ChatMessageProps) {
  return (
    <div className={`mb-4 flex items-end gap-2 ${isSent ? "flex-row-reverse" : "flex-row"}`}>
      {!isSent && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={sender.avatar || "/placeholder.svg"} alt={sender.name} />
          <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex max-w-[70%] flex-col ${isSent ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isSent ? "bg-gqm-green text-white" : "bg-gray-200 text-gray-800"
          }`}
        >
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
        <span className={`mt-1 text-xs text-gray-500 ${isSent ? "mr-2" : "ml-2"}`}>{timestamp}</span>
      </div>

      {isSent && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={sender.avatar || "/placeholder.svg"} alt={sender.name} />
          <AvatarFallback className="bg-gqm-dark text-white">{sender.name.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
