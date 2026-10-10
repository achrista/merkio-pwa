import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'

const BLUE = '#0050AA'
const FACTORS = [0.5, 1, 2, 3]

/** Ausgangswert der Auswahl: die Portionen des Rezepts, sonst das einfache Rezept. */
export function defaultAmount(content) {
  return content.portions || 1
}

/** Faktor, mit dem die Mengen umzurechnen sind. */
export function factorOf(content, amount) {
  return content.portions ? amount / content.portions : amount
}

/**
 * Wahl der Menge: Nennt das Rezept eine Portionenzahl, wird sie hoch- und
 * heruntergezählt; sonst ("1 Blech") wählt man das halbe, einfache, doppelte … Rezept.
 */
export default function RecipePortions({ content, amount, onChange }) {
  const { t } = useTranslation()

  if (!content.portions) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">{t('recipes.amount')}</span>
        {FACTORS.map((factor) => (
          <button
            key={factor}
            type="button"
            onClick={() => onChange(factor)}
            className="px-3 py-1 rounded-full text-sm border"
            style={amount === factor
              ? { backgroundColor: BLUE, color: 'white', borderColor: BLUE }
              : { color: 'var(--pill-fg)', borderColor: 'var(--pill-border)' }}
          >
            {factor === 0.5 ? '½' : factor}×
          </button>
        ))}
        {content.servings && <span className="text-xs text-gray-400">({t('recipes.yields', { servings: content.servings })})</span>}
      </div>
    )
  }

  const step = (delta) => onChange(Math.min(100, Math.max(1, amount + delta)))
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{t('recipes.portions')}</span>
      <button type="button" onClick={() => step(-1)} disabled={amount <= 1} aria-label={t('recipes.fewer')}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 disabled:opacity-40">
        <Minus size={16} />
      </button>
      <input
        type="number"
        min="1"
        max="100"
        value={amount}
        onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= 100) onChange(n) }}
        className="w-14 text-center border border-gray-300 rounded-lg py-1 text-sm font-semibold focus:outline-none focus:border-blue-500"
      />
      <button type="button" onClick={() => step(1)} disabled={amount >= 100} aria-label={t('recipes.more')}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 disabled:opacity-40">
        <Plus size={16} />
      </button>
      {amount !== content.portions && (
        <button type="button" onClick={() => onChange(content.portions)} className="text-xs text-blue-700 underline">
          {t('recipes.original', { n: content.portions })}
        </button>
      )}
    </div>
  )
}
