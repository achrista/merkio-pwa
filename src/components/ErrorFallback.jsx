import { useTranslation } from 'react-i18next'

const BLUE = '#0050AA'

/** Auffang-Bildschirm für unerwartete React-Fehler (via Sentry.ErrorBoundary).
 *  Zeigt statt eines weißen Bildschirms eine freundliche Seite mit Neu-laden-Button.
 *  Übersetzungen mit Default-Werten, damit es selbst bei i18n-Problemen funktioniert. */
export default function ErrorFallback() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">😕</div>
      <h1 className="text-xl font-semibold text-gray-800">
        {t('errorBoundary.title', 'Ups – etwas ist schiefgelaufen')}
      </h1>
      <p className="text-sm text-gray-500 max-w-sm">
        {t('errorBoundary.text', 'Die App ist auf einen Fehler gestoßen. Bitte lade sie neu.')}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{ backgroundColor: BLUE }}
      >
        {t('errorBoundary.reload', 'App neu laden')}
      </button>
    </div>
  )
}
