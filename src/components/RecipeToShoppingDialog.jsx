import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import api from '../api/client'
import { CATEGORY_ICONS } from './ItemRow'
import RecipePortions, { defaultAmount, factorOf } from './RecipePortions'
import { parseRecipe, toShoppingItems, formatQuantity } from '../utils/recipe'

const BLUE = '#0050AA'
const lastListKey = (groupId) => `recipes.shoppingList.${groupId}`

/**
 * Setzt die Zutaten eines Rezepts auf eine Einkaufsliste: Portionen wählen, Zutaten
 * abhaken, hinzufügen. Mit `listId` steht das Ziel fest (Aufruf aus der Einkaufsliste),
 * sonst wählt man unter den Einkaufslisten der Gruppe.
 */
export default function RecipeToShoppingDialog({ item, groupId, listId, initialAmount, onClose, onBack, onAdded }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const content = useMemo(() => parseRecipe(item), [item])
  const [amount, setAmount] = useState(initialAmount ?? defaultAmount(content))
  const [skipped, setSkipped] = useState(new Set())
  const [chosenList, setChosenList] = useState(() => Number(localStorage.getItem(lastListKey(groupId))) || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const { data: listsData } = useQuery({
    queryKey: ['lists', Number(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/lists`).then((r) => r.data),
    enabled: !listId && !!groupId,
  })
  const shoppingLists = (listsData?.lists ?? []).filter((list) => list.type === 'shopping')
  const targetId = listId ?? (shoppingLists.some((list) => list.id === chosenList) ? chosenList : shoppingLists[0]?.id)

  const ingredients = useMemo(() => toShoppingItems(content, factorOf(content, amount)), [content, amount])
  const selected = ingredients.filter((ingredient) => !skipped.has(ingredient.name))

  function toggle(name) {
    const next = new Set(skipped)
    next.has(name) ? next.delete(name) : next.add(name)
    setSkipped(next)
  }

  async function add() {
    if (!targetId || !selected.length) return
    setBusy(true)
    setError('')
    let added = 0
    try {
      for (const ingredient of selected) {
        const body = { name: ingredient.name, iconKey: ingredient.iconKey }
        if (ingredient.quantity) body.quantity = ingredient.quantity
        if (ingredient.unit) body.unit = ingredient.unit
        await api.post(`/lists/${targetId}/items`, body)
        added += 1
      }
      if (!listId) localStorage.setItem(lastListKey(groupId), String(targetId))
      queryClient.invalidateQueries({ queryKey: ['items', Number(targetId)] })
      onAdded?.(added, shoppingLists.find((list) => list.id === targetId)?.name)
      onClose()
    } catch (err) {
      if (added) queryClient.invalidateQueries({ queryKey: ['items', Number(targetId)] })
      setError(t('common.error', { msg: err.response?.data?.error ?? err.message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
          <button onClick={onClose} className="text-gray-500" aria-label={t('common.close')}><X size={20} /></button>
          <span className="flex-1 font-semibold text-gray-800 truncate">{item.name}</span>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <RecipePortions content={content} amount={amount} onChange={setAmount} />

          {!listId && (
            shoppingLists.length === 0 ? (
              <p className="text-sm text-red-600">{t('recipes.no_shopping_list')}</p>
            ) : (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                {t('recipes.target_list')}
                <select
                  value={targetId ?? ''}
                  onChange={(e) => setChosenList(Number(e.target.value))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:border-blue-500"
                >
                  {shoppingLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              </label>
            )
          )}

          {ingredients.length === 0 && <p className="text-sm text-gray-500">{t('recipes.no_ingredients')}</p>}
          <div className="space-y-1">
            {ingredients.map((ingredient) => (
              <label key={ingredient.name} className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!skipped.has(ingredient.name)}
                  onChange={() => toggle(ingredient.name)}
                  style={{ accentColor: BLUE }}
                  className="w-4 h-4"
                />
                <span className="text-base">{CATEGORY_ICONS[ingredient.iconKey] ?? '📦'}</span>
                <span className="text-sm text-gray-800">
                  {[formatQuantity(ingredient.quantity, i18n.language), ingredient.unit].filter(Boolean).join(' ')} {ingredient.name}
                </span>
              </label>
            ))}
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center gap-3">
          <button onClick={onBack ?? onClose} className="px-4 py-2 text-sm text-gray-600">
            {onBack ? t('common.back') : t('common.cancel')}
          </button>
          <button
            onClick={add}
            disabled={!targetId || selected.length === 0 || busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {t('items.add_count', { count: selected.length })}
          </button>
        </div>
      </div>
    </div>
  )
}
