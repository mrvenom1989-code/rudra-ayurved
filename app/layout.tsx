import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Rudra Ayurved',
  description: 'Premium Ayurvedic Care',
  keywords: [
    'Ayurvedic doctor near me',
    'Nearest Ayurvedic doctor',
    'Ayurvedic treatment',
    'Ayurvedic doctor',
    'Ayurvedic specialist doctor',
    'Ayurvedic clinic',
    'Nearby Ayurvedic clinic',
    'Ayurvedic clinic near me',
    'Ayurvedic treatment near me',
    'Ayurvedic specialist',
    'Panchkarma',
    'Panchkarma Clinic'
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-rudra-cream text-gray-800`}>
        {children}
      </body>
    </html>
  )
}