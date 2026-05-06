"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InfoTooltipProps {
  content: string
  className?: string
  iconSize?: number
}

export function InfoTooltip({ content, className = "", iconSize = 14 }: InfoTooltipProps) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button 
          type="button"
          className={`inline-flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-help ${className}`}
          aria-label="Info"
        >
          <HelpCircle size={iconSize} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        <p className="text-xs font-normal leading-relaxed">{content}</p>
      </TooltipContent>
    </Tooltip>
  )
}
