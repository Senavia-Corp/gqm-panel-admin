"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreVertical, Download, Trash2 } from "lucide-react"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatFileSize } from "@/lib/services/document-service"
import type { Document } from "@/lib/types"

interface DocumentCardProps {
  document: Document | any // Allow mock data format too
  onDelete?: (publicId: string) => void
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const fileName = document.fileName || "Unknown"
  const fileExtension = document.format || fileName.split(".").pop() || "file"
  const fileSize =
    typeof document.fileSize === "number" ? formatFileSize(document.fileSize) : document.fileSize || "Unknown size"
  const uploadDate = document.uploadDate || "Unknown date"
  const tag = document.tag || "TAG"
  const secureUrl = document.secureUrl || document.url
  const thumbnailUrl = document.thumbnailUrl
  const publicId = document.publicId || document.id

  const handleDownload = () => {
    if (secureUrl) {
      window.open(secureUrl, "_blank")
    }
  }

  const handleDelete = () => {
    if (onDelete && publicId) {
      onDelete(publicId)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-gray-300">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl || "/placeholder.svg"} alt={fileName} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-300">
            <span className="text-4xl font-bold text-gray-500 uppercase">{fileExtension}</span>
          </div>
        )}
        <Badge className="absolute left-3 top-3 bg-gqm-yellow text-black hover:bg-gqm-yellow/90">{tag}</Badge>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium text-sm truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {fileSize} | {uploadDate}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {secureUrl && (
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}
