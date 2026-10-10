import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import api from '../api/client'
import ScreenHeader from '../components/ScreenHeader'
import RecipeView from '../components/RecipeView'
import RecipeEditor from '../components/RecipeEditor'
import RecipeImportDialog from '../components/RecipeImportDialog'
import RecipeToShoppingDialog from '../components/RecipeToShoppingDialog'
import { RecipeThumb } from '../components/RecipePhoto'
import { useListEvents } from '../utils/useListEvents'
import { parseRecipe, categoryLabel, collectLabels, groupByCategory, matchesSearch, RECIPE_CATEGORY_ICONS } from '../utils/recipe'

const BLUE = '#0050AA'
const YELLOW = '#FFF000'

/** Rezeptliste: nach Kategorie sortierte Ablage, Suche, Markierungen, Import. */
export default function RecipesScreen({ listName }) {
  const { t } = useTranslation()
  const { groupId, listId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const itemsKey = useMemo(() => ['items', Number(listId)], [listId])

  const [search, setSearch] = useState('')
  const [label, setLabel] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(null) // Listeneintrag oder { name: '' } für ein neues Rezept
  const [showImport, setShowImport] = useState(false)
  const [shopping, setShopping] = useState(null) // { item, amount }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: itemsKey,
    queryFn: () => api.get(`/lists/${listId}/items`).then((r) => r.data),
  })
  useListEvents(listId)

  const items = useMemo(() => data?.items ?? [], [data])
  const recipes = useMemo(() => items.filter((item) => !item.checked).map((item) => ({ item, content: parseRecipe(item) })), [items])
  const trashed = items.filter((item) => item.checked).sort((a, b) => (b.checkedAt || '').localeCompare(a.checkedAt || ''))
  const labels = useMemo(() => collectLabels(recipes), [recipes])
  const shown = recipes.filter((recipe) => matchesSearch(recipe, search)
    && (!label || [recipe.content.source.label, ...recipe.content.tags].some((entry) => entry?.toLowerCase() === label.toLowerCase())))
  const groups = groupByCategory(shown)
  const openItem = openId ? items.find((item) => item.id === openId && !item.checked) : null
  const editingItem = editing?.id ? (items.find((item) => item.id === editing.id) ?? editing) : editing

  const say = useCallback((message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3500)
  }, [])

  const putInCache = useCallback((item) => {
    queryClient.setQueryData(itemsKey, (old) => {
      const current = old?.items ?? []
      return { ...(old ?? {}), items: current.some((i) => i.id === item.id) ? current.map((i) => i.id === item.id ? item : i) : [...current, item] }
    })
  }, [queryClient, itemsKey])

  // Ändern mit Optimistic Lock wie in der Artikelliste: Ist der Server neuer (409),
  // gilt sein Stand.
  const patchItem = useCallback(async (item, patch) => {
    const fresh = (queryClient.getQueryData(itemsKey)?.items ?? []).find((i) => i.id === item.id)
    try {
      const res = await api.patch(`/items/${item.id}`, { ...patch, baseUpdatedAt: fresh?.updatedAt ?? item.updatedAt })
      putInCache(res.data.item)
      return true
    } catch (err) {
      if (err.response?.status === 409) {
        if (err.response.data?.item) putInCache(err.response.data.item)
        say(t('recipes.conflict'))
        return false
      }
      throw err
    }
  }, [queryClient, itemsKey, putInCache, say, t])

  async function saveRecipe(patch) {
    if (editing?.id) {
      await patchItem(editingItem, patch)
    } else {
      const res = await api.post(`/lists/${listId}/items`, patch)
      putInCache(res.data.item)
      setOpenId(res.data.item.id)
    }
    setEditing(null)
  }

  async function uploadPhoto(item, file) {
    const res = await api.put(`/items/${item.id}/photo`, file, {
      headers: { 'Content-Type': file.type && file.type !== 'application/json' ? file.type : 'application/octet-stream' },
      timeout: 120_000,
    })
    putInCache(res.data.item)
  }

  async function removePhoto(item) {
    const res = await api.delete(`/items/${item.id}/photo`)
    putInCache(res.data.item)
  }

  async function trash(item) {
    setOpenId(null)
    try { await patchItem(item, { checked: true }) } catch (err) { console.error('trash failed', err) }
  }

  async function restore(item) {
    try { await patchItem(item, { checked: false }) } catch (err) { console.error('restore failed', err) }
  }

  async function deleteForever(item) {
    setConfirmDelete(null)
    try {
      await api.delete(`/items/${item.id}`)
      queryClient.setQueryData(itemsKey, (old) => old ? { ...old, items: (old.items ?? []).filter((i) => i.id !== item.id) } : old)
    } catch (err) { console.error('delete failed', err) }
  }

  function imported(newItems) {
    newItems.forEach(putInCache)
    setShowImport(false)
    if (newItems.length === 1) setOpenId(newItems[0].id)
    else say(t('recipes.imported', { count: newItems.length }))
  }

  const overlays = (
    <>
      {editing && (
        <RecipeEditor
          key={editing.id ?? 'new'}
          item={editingItem}
          onClose={() => setEditing(null)}
          onSave={saveRecipe}
          onPhoto={(file) => uploadPhoto(editingItem, file)}
          onRemovePhoto={() => removePhoto(editingItem)}
        />
      )}
      {showImport && (
        <RecipeImportDialog
          listId={listId}
          knownLabels={labels}
          onClose={() => setShowImport(false)}
          onImported={imported}
          onManual={() => { setShowImport(false); setEditing({ name: '', category: 'other', content: '' }) }}
        />
      )}
      {shopping && (
        <RecipeToShoppingDialog
          item={shopping.item}
          groupId={groupId}
          initialAmount={shopping.amount}
          onClose={() => setShopping(null)}
          onAdded={(count, name) => say(t('recipes.added_to_list', { count, list: name ?? '' }))}
        />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-800">{t('recipes.delete_title')}</h3>
            <p className="text-sm text-gray-500">{t('recipes.delete_text', { name: confirmDelete.name })}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-600">{t('common.cancel')}</button>
              <button onClick={() => deleteForever(confirmDelete)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg max-w-[90vw]" style={{ backgroundColor: '#323232' }}>
          {toast}
        </div>
      )}
    </>
  )

  if (openItem) {
    return (
      <>
        <RecipeView
          key={openItem.id}
          item={openItem}
          onBack={() => setOpenId(null)}
          onEdit={() => setEditing(openItem)}
          onTrash={() => trash(openItem)}
          onShopping={(amount) => setShopping({ item: openItem, amount })}
        />
        {overlays}
      </>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title={listName} onBack={() => navigate(`/groups/${groupId}/lists`)} />

      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('recipes.search')}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">{t('recipes.add')}</span>
        </button>
      </div>

      {labels.length > 0 && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto">
          {[null, ...labels].map((entry) => (
            <button
              key={entry ?? '__all'}
              onClick={() => setLabel(entry)}
              className="px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
              style={label === entry
                ? { backgroundColor: YELLOW, color: BLUE, borderColor: YELLOW }
                : { color: 'var(--pill-fg)', borderColor: 'var(--pill-border)' }}
            >
              {entry ?? t('recipes.all')}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {isLoading && <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>}
        {!isLoading && error && <div className="text-center py-16 text-red-500">{t('common.error', { msg: error.message })}</div>}

        {!isLoading && !error && recipes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">{t('recipes.empty')}</p>
            <p className="text-sm mt-1">{t('recipes.empty_hint')}</p>
          </div>
        )}
        {recipes.length > 0 && shown.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">{t('recipes.no_match')}</div>}

        {groups.map((group) => (
          <div key={group.key} className="space-y-1.5">
            <div className="flex items-center gap-2 pt-2 pb-0.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {RECIPE_CATEGORY_ICONS[group.key] ?? '📖'} {categoryLabel(t, group.key)}
              </span>
              <span className="text-xs text-gray-400">({group.recipes.length})</span>
            </div>
            {group.recipes.map(({ item, content }) => (
              <div key={item.id} className="flex items-center bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <button
                onClick={() => setOpenId(item.id)}
                className="flex items-center flex-1 min-w-0 p-2 gap-3 text-left"
              >
                <RecipeThumb item={item} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-800 text-sm truncate">{item.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400 min-w-0">
                    {content.source.label && (
                      <span className="px-1.5 rounded-full font-semibold shrink-0" style={{ backgroundColor: YELLOW, color: BLUE }}>{content.source.label}</span>
                    )}
                    <span className="truncate">{[content.time, content.tags.join(', ')].filter(Boolean).join(' · ')}</span>
                  </div>
                </div>
              </button>
              {/* Papierkorb wie in den anderen Listen: das Rezept wandert in „Gelöscht“ */}
              <button onClick={() => trash(item)} title={t('common.delete')} aria-label={t('common.delete')} className="p-2 mr-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                <Trash2 size={16} />
              </button>
              </div>
            ))}
          </div>
        ))}

        {trashed.length > 0 && (
          <>
            <div className="text-xs text-gray-400 font-medium pt-3">{t('items.notes_deleted_header', { count: trashed.length })}</div>
            {trashed.map((item) => (
              <div key={item.id} className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 gap-3 opacity-60">
                <span className="text-sm text-gray-500 flex-1 truncate">{item.name}</span>
                <button onClick={() => restore(item)} className="text-blue-600 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">{t('items.restore')}</button>
                <button onClick={() => setConfirmDelete(item)} className="text-red-500 p-1 rounded hover:bg-red-50" aria-label={t('common.delete')}><Trash2 size={14} /></button>
              </div>
            ))}
          </>
        )}
      </div>

      {overlays}
    </div>
  )
}
