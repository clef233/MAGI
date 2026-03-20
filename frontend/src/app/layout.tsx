import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MAGI - Multi-Agent Guided Intelligence',
  description: 'Multi-Agent AI Debate System inspired by Evangelion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className="dark">
      <body className="bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}