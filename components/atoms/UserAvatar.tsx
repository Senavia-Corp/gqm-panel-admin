import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  src: string
  alt: string
  fallback?: string
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
}

export function UserAvatar({ src, alt = "", fallback, size = "md" }: UserAvatarProps) {
  const initials =
    fallback ||
    (alt
      ? alt
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "?")

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarImage src={src || "/placeholder.svg"} alt={alt} />
      <AvatarFallback className="bg-gqm-green text-white">{initials}</AvatarFallback>
    </Avatar>
  )
}
