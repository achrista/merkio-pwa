import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './theme.js'
import './i18n/index.js'
import App from './App.jsx'
import ErrorFallback from './components/ErrorFallback'
import * as Sentry from '@sentry/react'

// Fehler-Tracking – aktiv nur, wenn VITE_SENTRY_DSN beim Build gesetzt ist.
// Bots (z. B. Google-Read-Aloud) erzeugen v. a. Service-Worker-Rauschen → ausschließen.
const BOT_RE = /bot|crawl|spider|slurp|mediapartners|google-read-aloud|lighthouse|headlesschrome|bingpreview|facebookexternalhit|whatsapp|pingdom|uptimerobot/i
const isBot = typeof navigator !== 'undefined' && BOT_RE.test(navigator.userAgent || '')

if (import.meta.env.VITE_SENTRY_DSN && !isBot) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      // Service-Worker-Registrierung scheitert in manchen Umgebungen (Bots, privater
      // Modus, deaktivierte SW) und ist nicht behebbar → nicht melden.
      const blob = JSON.stringify(event.exception || event.message || '')
      if (/serviceworker|registersw\.js/i.test(blob)) return null
      return event
    },
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

// Start-Splash ausblenden, sobald die App gemountet ist
const splash = document.getElementById('app-splash')
if (splash) {
  splash.classList.add('hide')
  setTimeout(() => splash.remove(), 350)
}
