import { UserAvatar } from "@/components/atoms/UserAvatar"

interface UserInfoProps {
  name: string
  id?: string
  avatar: string
  showId?: boolean
  size?: "sm" | "md" | "lg"
}

export function UserInfo({ name, id, avatar, showId = true, size = "md" }: UserInfoProps) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar src={avatar} alt={name} size={size} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{name}</span>
        {showId && id && <span className="text-xs text-muted-foreground">{id}</span>}
      </div>
    </div>
  )
}
