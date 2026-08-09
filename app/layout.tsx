import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { LocaleProvider } from "@/components/providers/LocaleProvider"
import { SidebarProvider } from "@/components/providers/SidebarContext"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"
import ReactQueryProvider from "./providers/query-client-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GQM Admin",
  description: "Created by Senavia Corp",
  generator: "Senavia Corp Team",
  icons: {
    icon: [
      {
        url: "/gqm-logo.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/gqm-logo.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/gqm-favicon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/gqm-logo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // suppressHydrationWarning: extensiones del navegador (LanguageTool añade
  // data-lt-installed) mutan <html> antes de hidratar y React lo reporta
  // como mismatch; solo silencia atributos de ESTE nodo, no de los hijos.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ReactQueryProvider>
          <LocaleProvider>
            <TooltipProvider>
              <SidebarProvider>
                {children}
              </SidebarProvider>
            </TooltipProvider>
            <Analytics />
            <Toaster richColors position="top-right" />
          </LocaleProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
