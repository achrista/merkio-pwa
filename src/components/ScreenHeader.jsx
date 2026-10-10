import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

const BLUE = '#0050AA'

/**
 * Kopfzeile eines Bildschirms mit Zurück-Pfeil und Titel: am Desktop der blaue Balken,
 * am Handy die helle Zeile unter der App-Leiste – wie in der Artikelliste.
 * `actions` bekommt die Größe der Symbole und liefert die Knöpfe rechts.
 */
export default function ScreenHeader({ title, onBack, actions }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="hidden min-[900px]:flex items-center px-4 h-14 shrink-0 gap-3 text-white" style={{ backgroundColor: BLUE }}>
        <button onClick={onBack} aria-label={t('common.back')}><ArrowLeft size={22} /></button>
        <span className="font-semibold text-lg truncate flex-1">{title}</span>
        {actions?.(22)}
      </div>
      <div className="min-[900px]:hidden flex items-center px-4 py-2 bg-blue-50 border-b border-blue-100 gap-2 text-blue-800 shrink-0">
        <button onClick={onBack} aria-label={t('common.back')}><ArrowLeft size={18} /></button>
        <span className="font-medium text-sm text-blue-900 truncate flex-1">{title}</span>
        {actions?.(18)}
      </div>
    </>
  )
}
