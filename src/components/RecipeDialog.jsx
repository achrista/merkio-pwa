import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import api from '../api/client'
import { CATEGORY_ICONS } from './ItemRow'

const BLUE = '#0050AA'

export default function RecipeDialog({ onClose, onImport, onNoteUpdate }) {
  const { t } = useTranslation()
  const [recipeText, setRecipeText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [portions, setPortions] = useState('4')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(new Set())

  async function analyze() {
    if (!recipeText.trim()) return
    setAnalyzing(true)
    setError('')
    try {
      const portionsInt = parseInt(portions, 10) || 4
      const res = await api.post('/ai/parse-recipe', { text: recipeText.trim(), portions: portionsInt })
      setResult(res.data)
      setSelected(new Set((res.data.ingredients ?? []).map((_, i) => i)))
    } catch (err) {
      const code = err.response?.status
      setError(code ? t('items.analyze_failed', { code }) : t('auth.connection_failed', { msg: err.message }))
    } finally {
      setAnalyzing(false)
    }
  }

  function toggle(idx) {
    const next = new Set(selected)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    setSelected(next)
  }

  function doImport() {
    const note = sourceUrl.trim()
    if (note) onNoteUpdate?.(note)
    const ingredients = (result.ingredients ?? []).filter((_, i) => selected.has(i))
    onImport(ingredients)
    onClose()
  }

  const portionsInt = parseInt(portions, 10) || 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
          <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
          <span className="flex-1 font-semibold text-gray-800">{t('items.import_recipe')}</span>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {!result ? (
            <>
              <textarea
                autoFocus
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                placeholder={t('items.recipe_text_placeholder')}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={t('items.recipe_source_placeholder')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              {sourceUrl.trim() && (
                <p className="text-xs text-gray-400">{t('items.recipe_source_hint')}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('items.portions')}</span>
                <input
                  type="number"
                  min="1"
                  value={portions}
                  onChange={(e) => setPortions(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
            </>
          ) : (
            <>
              {result.originalPortions && result.originalPortions !== portionsInt && (
                <p className="text-xs text-gray-500">
                  {t('items.recipe_scaled', { from: result.originalPortions, to: portionsInt })}
                </p>
              )}
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {(result.ingredients ?? []).map((ing, idx) => (
                  <label key={idx} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(idx)}
                      onChange={() => toggle(idx)}
                      style={{ accentColor: BLUE }}
                      className="w-4 h-4"
                    />
                    <span className="text-base">{CATEGORY_ICONS[ing.iconKey] ?? '📦'}</span>
                    <span className="text-sm text-gray-800">
                      {[ing.quantity, ing.unit].filter(Boolean).join(' ')} {ing.name}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center gap-3">
          {result ? (
            <button onClick={() => { setResult(null); setError('') }} className="px-4 py-2 text-sm text-gray-600">
              {t('common.back')}
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">{t('common.cancel')}</button>
          )}
          {!result ? (
            <button
              onClick={analyze}
              disabled={!recipeText.trim() || analyzing}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: BLUE }}
            >
              {analyzing ? t('items.analyzing') : t('items.analyze')}
            </button>
          ) : (
            <button
              onClick={doImport}
              disabled={selected.size === 0}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: BLUE }}
            >
              {t('items.add_count', { count: selected.size })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
