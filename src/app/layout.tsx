import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'UniCode - University Coding Platform',
    template: '%s | UniCode',
  },
  description: 'Solve problems, join contests, and rank among your peers.',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#0a0a0f] text-slate-100 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
