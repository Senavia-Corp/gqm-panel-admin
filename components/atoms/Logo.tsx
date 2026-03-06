import Image from "next/image"

interface LogoProps {
  className?: string
  showText?: boolean
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image src="/images/gqm-logo.png" alt="GQM Logo" width={60} height={40} className="object-contain" />
      {showText && <span className="text-lg font-semibold text-foreground">Admin</span>}
    </div>
  )
}
