import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'

const BLUE = '#0050AA'
const CHECK_EVERY_MS = 60 * 60 * 1000

/**
 * Neue Version der Web-App: Der Service Worker lädt sie im Hintergrund, das offene
 * Fenster läuft aber mit der alten weiter, bis es neu geladen wird. Dieser Hinweis
 * erscheint, sobald die neue Version bereitsteht, und lädt auf Wunsch neu – von selbst
 * neu zu laden könnte eine Notiz kosten, die gerade geschrieben wird.
 *
 * Eine installierte App bleibt oft tagelang offen und fragt dann nie nach Neuem;
 * deshalb wird hier auch regelmäßig und beim Zurückkehren ins Fenster nachgesehen.
 */
export default function UpdateBanner() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // Beim allerersten Besuch übernimmt der Service Worker ebenfalls – das ist kein Update
    const hadController = !!navigator.serviceWorker.controller
    const onChange = () => { if (hadController) setReady(true) }
    const check = () => navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {})
    const onVisible = () => { if (document.visibilityState === 'visible') check() }

    navigator.serviceWorker.addEventListener('controllerchange', onChange)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [])

  if (!ready) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl shadow-lg text-sm text-white max-w-[92vw]" style={{ backgroundColor: '#323232' }}>
      <span>{t('common.update_ready')}</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
        style={{ backgroundColor: '#FFF000', color: BLUE }}
      >
        <RefreshCw size={14} />
        {t('common.reload')}
      </button>
    </div>
  )
}
