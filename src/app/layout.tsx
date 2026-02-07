import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import "./globals.css"

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Floriday Content Generator",
  description:
    "AI-powered content generator voor professionele productfotografie in Floriday",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
