import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Comunidade Plantaê | Ecologia e Sustentabilidade',
  description:
    'A Comunidade Plantaê promove educação ambiental, restauração de ecossistemas e desenvolvimento sustentável para um futuro mais equilibrado.',
  keywords: 'ecologia, sustentabilidade, educação ambiental, restauração ecológica, ipê amarelo',
  openGraph: {
    title: 'Comunidade Plantaê',
    description:
      'Educação ambiental, restauração ecológica e desenvolvimento sustentável com uma linguagem botânica e acolhedora.',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
