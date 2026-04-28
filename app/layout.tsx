import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { LocaleProvider } from "@/components/providers/LocaleProvider"
import { SidebarProvider } from "@/components/providers/SidebarContext"
import "./globals.css"

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
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <LocaleProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
          <Analytics />
          <Toaster richColors position="top-right" />
        </LocaleProvider>
      </body>
    </html>
  )
}
