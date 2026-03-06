import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-gqm-green-dark" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
