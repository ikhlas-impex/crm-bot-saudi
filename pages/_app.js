import '@/styles/globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import SiteFooter from '@/components/SiteFooter'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter();
  return (
    <LanguageProvider>
      <Component {...pageProps} />
      {!router.pathname.startsWith('/admin') && <SiteFooter />}
    </LanguageProvider>
  )
}

