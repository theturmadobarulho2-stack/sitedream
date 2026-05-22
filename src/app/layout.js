import './globals.css'
import localFont from 'next/font/local'

const newAstro = localFont({
  src: [
    { path: '../../public/fonts/NewAstro-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/NewAstro-SemiBold.otf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/NewAstro-Bold.otf',    weight: '700', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  preload: true,
})

const ltSaeada = localFont({
  src: [
    { path: '../../public/fonts/LTSaeada-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/LTSaeada-Bold.otf',    weight: '700', style: 'normal' },
    { path: '../../public/fonts/LTSaeada-Black.otf',   weight: '900', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
  preload: true,
})

const pixelify = localFont({
  src: [{ path: '../../public/fonts/PixelifySans.ttf', weight: '100 900', style: 'normal' }],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://dreamstation.vercel.app'),
  title: 'DreamStation Clips',
  description: 'Uma coleção de clipes selecionados — assista e sinta a vibe.',
  openGraph: {
    title: 'DreamStation Clips',
    description: 'Uma coleção de clipes selecionados — assista e sinta a vibe.',
    url: '/',
    siteName: 'DreamStation',
    images: [{ url: '/logo-dream.png', width: 800, height: 600, alt: 'DreamStation' }],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DreamStation Clips',
    description: 'Uma coleção de clipes selecionados — assista e sinta a vibe.',
    images: ['/logo-dream.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${newAstro.variable} ${ltSaeada.variable} ${pixelify.variable}`}>
        <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  )
}
