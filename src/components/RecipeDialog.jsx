import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueries } from '@tanstack/react-query'
import { X, Search } from 'lucide-react'
import api from '../api/client'
import { CATEGORY_ICONS } from './ItemRow'
import { RecipeThumb } from './RecipePhoto'
import RecipeToShoppingDialog from './RecipeToShoppingDialog'
import { parseRecipe, categoryLabel, matchesSearch } from '../utils/recipe'

const BLUE = '#0050AA'

// Erste http(s)-URL aus dem Text ziehen (Satzzeichen am Ende abschneiden).
const URL_RE = /https?:\/\/[^\s"'<>]+/i
function extractUrl(text) {
  const m = String(text || '').match(URL_RE)
  return m ? m[0].replace(/[.,;:!?)\]]+$/, '') : null
}

/**
 * „Rezept importieren“ in der Einkaufsliste: Zutaten aus einem gespeicherten Rezept der
 * Gruppe (Reiter „Meine Rezepte“) oder aus einem Gericht, Text oder Link (wie bisher).
 */
export default function RecipeDialog({ groupId, listId, onClose, onImport, onNoteUpdate }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState(null) // null = noch offen: "Meine Rezepte", sobald es welche gibt
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)
  const [recipeText, setRecipeText] = useState('')
  const [portions, setPortions] = useState('4')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(new Set())

  // Gespeicherte Rezepte: alle Rezeptlisten der Gruppe
  const { data: listsData, isLoading: listsLoading } = useQuery({
    queryKey: ['lists', Number(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/lists`).then((r) => r.data),
    enabled: !!groupId,
  })
  const recipeLists = useMemo(() => (listsData?.lists ?? []).filter((list) => list.type === 'recipes'), [listsData])
  const recipeQueries = useQueries({
    queries: recipeLists.map((list) => ({
      queryKey: ['items', list.id],
      queryFn: () => api.get(`/lists/${list.id}/items`).then((r) => r.data),
    })),
  })
  const recipesLoading = listsLoading || recipeQueries.some((query) => query.isLoading)
  const recipes = recipeQueries
    .flatMap((query) => query.data?.items ?? [])
    .filter((item) => !item.checked)
    .map((item) => ({ item, content: parseRecipe(item) }))
    .sort((a, b) => a.item.name.localeCompare(b.item.name))
  const shown = recipes.filter((recipe) => matchesSearch(recipe, search))
  const activeTab = tab ?? (recipesLoading ? null : recipes.length ? 'saved' : 'text')

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
    const url = extractUrl(recipeText)
    if (url) onNoteUpdate?.(url)
    const ingredients = (result.ingredients ?? []).filter((_, i) => selected.has(i))
    onImport(ingredients)
    onClose()
  }

  // Ein gespeichertes Rezept ist gewählt: Portionen und Zutaten für genau diese Liste
  if (picked) {
    return (
      <RecipeToShoppingDialog
        item={picked}
        groupId={groupId}
        listId={Number(listId)}
        onClose={onClose}
        onBack={() => setPicked(null)}
      />
    )
  }

  const portionsInt = parseInt(portions, 10) || 4
  const detectedUrl = extractUrl(recipeText)
  const tabButton = (value, label) => (
    <button
      type="button"
      onClick={() => { setTab(value); setError('') }}
      className="flex-1 py-2 text-sm font-medium border-b-2"
      style={activeTab === value ? { color: BLUE, borderColor: BLUE } : { color: 'var(--pill-fg)', borderColor: 'transparent' }}
    >
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
          <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
          <span className="flex-1 font-semibold text-gray-800">{t('items.import_recipe')}</span>
        </div>

        {!result && (
          <div className="flex border-b border-gray-100 px-3">
            {tabButton('saved', t('recipes.my_recipes'))}
            {tabButton('text', t('recipes.text_or_link'))}
          </div>
        )}

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {activeTab === null && <div className="text-center py-8 text-gray-400 text-sm">{t('common.loading')}</div>}

          {activeTab === 'saved' && (
            recipes.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">{recipesLoading ? t('common.loading') : t('recipes.none_saved')}</p>
            ) : (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('recipes.search')}
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  {shown.length === 0 && <p className="text-sm text-gray-400 py-3">{t('recipes.no_match')}</p>}
                  {shown.map(({ item, content }) => (
                    <button
                      key={item.id}
                      onClick={() => setPicked(item)}
                      className="flex items-center w-full gap-3 p-1.5 rounded-lg text-left hover:bg-gray-50"
                    >
                      <RecipeThumb item={item} size={40} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {[categoryLabel(t, item.category), content.source.label].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )
          )}

          {activeTab === 'text' && (!result ? (
            <>
              <textarea
                autoFocus
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                placeholder={t('items.recipe_text_placeholder')}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
              {detectedUrl && (
                <p className="text-xs text-gray-400">{t('items.recipe_url_hint')}</p>
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
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center gap-3">
          {result ? (
            <button onClick={() => { setResult(null); setError('') }} className="px-4 py-2 text-sm text-gray-600">
              {t('common.back')}
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">{t('common.cancel')}</button>
          )}
          {activeTab === 'text' && (!result ? (
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
          ))}
        </div>
      </div>
    </div>
  )
}
