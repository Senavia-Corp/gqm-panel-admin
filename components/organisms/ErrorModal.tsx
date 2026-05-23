"use client"

import React from "react"
import { createPortal } from "react-dom"
import { XCircle, AlertTriangle, AlertCircle, Copy, Check } from "lucide-react"

type ErrorSeverity = "error" | "warning" | "info"

interface ErrorModalProps {
  open: boolean
  onClose: () => void
  message: string
  detail?: string
  endpoint?: string
  severity?: ErrorSeverity
  statusCode?: number
}

const severityConfig = {
  error: {
    icon: XCircle,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
  },
  info: {
    icon: AlertCircle,
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
  },
}

function formatErrorForCopy(props: ErrorModalProps): string {
  const parts: string[] = []

  parts.push(`=== ERROR REPORT ===`)
  parts.push(`Timestamp: ${new Date().toISOString()}`)

  if (props.endpoint) {
    parts.push(`Endpoint: ${props.endpoint}`)
  }

  if (props.statusCode) {
    parts.push(`Status Code: ${props.statusCode}`)
  }

  parts.push(`\nError: ${props.message}`)

  if (props.detail) {
    parts.push(`Detail: ${props.detail}`)
  }

  parts.push(`\nSeverity: ${props.severity || "error"}`)

  if (typeof window !== "undefined") {
    parts.push(`URL: ${window.location.href}`)
  }

  parts.push(`====================`)

  return parts.join("\n")
}

export function ErrorModal({
  open,
  onClose,
  message,
  detail,
  endpoint,
  severity = "error",
  statusCode,
}: ErrorModalProps) {
  const config = severityConfig[severity]
  const Icon = config.icon
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    const errorText = formatErrorForCopy({ open, onClose: () => {}, message, detail, endpoint, severity, statusCode })
    await navigator.clipboard.writeText(errorText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col w-full max-w-md ${config.bgClass} ${config.borderClass} border-2 rounded-2xl shadow-xl overflow-hidden`}
        style={{ maxHeight: "calc(100vh - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-6 w-6 text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900">
              {severity === "error" ? "Error" : severity === "warning" ? "Warning" : "Info"}
            </h3>
            {endpoint && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
                {endpoint}
                {statusCode && ` (${statusCode})`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:bg-white/50 hover:text-slate-700 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-2 space-y-3 overflow-auto">
          <p className="text-sm text-slate-700 font-medium">
            {message}
          </p>

          {detail && (
            <div className="mt-2 p-3 rounded-lg bg-white/70 border border-slate-200">
              <p className="text-xs text-slate-600 font-mono whitespace-pre-wrap break-all">
                {detail}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 bg-white/30 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Error
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== "undefined" ? document.body : (null as any)
  )
}

// Hook para manejar errores de manera sencilla
export interface UseErrorModalResult {
  errorModal: {
    open: boolean
    message: string
    detail?: string
    endpoint?: string
    severity?: ErrorSeverity
    statusCode?: number
  }
  showError: (message: string, detail?: string, endpoint?: string, statusCode?: number) => void
  showWarning: (message: string, detail?: string, endpoint?: string) => void
  showInfo: (message: string, detail?: string, endpoint?: string) => void
  closeError: () => void
}

export function useErrorModal(): UseErrorModalResult {
  const [errorModal, setErrorModal] = React.useState<UseErrorModalResult["errorModal"]>({
    open: false,
    message: "",
  })

  const showError = React.useCallback(
    (message: string, detail?: string, endpoint?: string, statusCode?: number) => {
      setErrorModal({ open: true, message, detail, endpoint, severity: "error", statusCode })
    },
    []
  )

  const showWarning = React.useCallback(
    (message: string, detail?: string, endpoint?: string) => {
      setErrorModal({ open: true, message, detail, endpoint, severity: "warning" })
    },
    []
  )

  const showInfo = React.useCallback(
    (message: string, detail?: string, endpoint?: string) => {
      setErrorModal({ open: true, message, detail, endpoint, severity: "info" })
    },
    []
  )

  const closeError = React.useCallback(() => {
    setErrorModal(prev => ({ ...prev, open: false }))
  }, [])

  return {
    errorModal,
    showError,
    showWarning,
    showInfo,
    closeError,
  }
}