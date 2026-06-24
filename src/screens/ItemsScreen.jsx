import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, StickyNote, UtensilsCrossed, Store, Flag } from 'lucide-react'
import api, { getAccessToken } from '../api/client'
import NoteEditor from '../components/NoteEditor'
import ItemRow from '../components/ItemRow'
import ItemDetailModal from '../components/ItemDetailModal'
import RecipeDialog from '../components/RecipeDialog'

const BLUE = '#0050AA'
const YELLOW = '#FFF000'
const API = import.meta.env.VITE_API_URL ?? 'https://api.merkio.de/api/v1'

export default function ItemsScreen() {
  const { t } = useTranslation()
  const { groupId, listId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newItemName, setNewItemName] = useState('')
  const [openNote, setOpenNote] = useState(null)
  const [openItem, setOpenItem] = useState(null)
  const [showRecipe, setShowRecipe] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug] = useState(false)
  const [groupByStore, setGroupByStore] = useState(false)
  const [groupByPriority, setGroupByPriority] = useState(false)
  const inputRef = useRef(null)

  // List meta (type + name) — not included in the items response
  const { data: listMeta } = useQuery({
    queryKey: ['list', Number(listId)],
    queryFn: () => api.get(`/lists/${listId}`).then((r) => r.data.list),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['items', Number(listId)],
    queryFn: () => api.get(`/lists/${listId}/items`).then((r) => r.data),
  })

  // Stores for this group (for store assignment + grouping)
  const { data: storesData } = useQuery({
    queryKey: ['stores', Number(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/stores`).then((r) => r.data),
    enabled: !!groupId,
  })

  // Group members (for todo assignees)
  const { data: membersData } = useQuery({
    queryKey: ['members', Number(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/members`).then((r) => r.data),
    enabled: !!groupId,
  })

  // Group settings (storesEnabled gate)
  const { data: settingsData } = useQuery({
    queryKey: ['groupSettings', Number(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/settings`).then((r) => r.data),
    enabled: !!groupId,
  })

  const items = data?.items ?? []
  const stores = storesData?.stores ?? []
  const members = membersData?.members ?? []
  const listType = listMeta?.type ?? 'shopping'
  const listName = listMeta?.name ?? '…'
  const isNotes = listType === 'notes'
  const isTodo = listType === 'todo'
  const storesEnabled = (settingsData?.settings?.storesEnabled ?? 1) === 1
  const activeStores = stores.filter((s) => s.active)
  const canGroupByStore = !isNotes && !isTodo && storesEnabled && activeStores.length > 0

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['items', Number(listId)] })
  }, [queryClient, listId])

  // SSE real-time updates (named events!)
  useEffect(() => {
    const token = getAccessToken()
    if (!token || !listId) return
    const url = `${API}/lists/${listId}/events?access_token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    const key = ['items', Number(listId)]

    const upsert = (item) => {
      queryClient.setQueryData(key, (old) => {
        const current = old?.items ?? []
        const exists = current.some((i) => i.id === item.id)
        return { ...(old ?? {}), items: exists ? current.map((i) => i.id === item.id ? item : i) : [...current, item] }
      })
    }
    const onCreated = (e) => { try { upsert(JSON.parse(e.data)) } catch {} }
    const onUpdated = (e) => { try { upsert(JSON.parse(e.data)) } catch {} }
    const onDeleted = (e) => {
      try {
        const { id } = JSON.parse(e.data)
        queryClient.setQueryData(key, (old) => old ? { ...old, items: (old.items ?? []).filter((i) => i.id !== id) } : old)
      } catch {}
    }

    es.addEventListener('item_created', onCreated)
    es.addEventListener('item_updated', onUpdated)
    es.addEventListener('item_deleted', onDeleted)

    return () => { es.close() }
  }, [listId, queryClient])

  // Autocomplete (shopping lists only, debounced)
  useEffect(() => {
    if (isNotes || isTodo) { setSuggestions([]); return }
    const q = newItemName.trim()
    if (q.length < 2) { setSuggestions([]); return }
    let active = true
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/suggestions', { params: { q } })
        if (active) { setSuggestions(res.data.suggestions ?? []); setShowSug(true) }
      } catch { if (active) setSuggestions([]) }
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [newItemName, isNotes, isTodo])

  async function addItem(name = newItemName) {
    const trimmed = name.trim()
    if (!trimmed) return
    setNewItemName('')
    setShowSug(false)
    try {
      await api.post(`/lists/${listId}/items`, isNotes ? { name: trimmed, content: '' } : { name: trimmed })
      invalidate()
    } catch (err) {
      console.error('addItem failed', err)
      setNewItemName(trimmed)
    }
  }

  function pickSuggestion(s) {
    setShowSug(false)
    setSuggestions([])
    addItem(s)
  }

  async function toggleItem(item) {
    try {
      await api.patch(`/items/${item.id}`, { checked: !item.checked })
      invalidate()
    } catch (err) { console.error('toggle failed', err) }
  }

  async function deleteItem(item) {
    try {
      await api.delete(`/items/${item.id}`)
      invalidate()
    } catch (err) { console.error('delete failed', err) }
  }

  async function restoreNote(item) {
    try {
      await api.patch(`/items/${item.id}`, { checked: false })
      invalidate()
    } catch (err) { console.error('restore failed', err) }
  }

  async function saveNote(item, name, content) {
    try {
      await api.patch(`/items/${item.id}`, { name, content })
      invalidate()
    } catch (err) { console.error('saveNote failed', err) }
  }

  async function saveItem(item, patch) {
    try {
      await api.patch(`/items/${item.id}`, patch)
      invalidate()
    } catch (err) { console.error('saveItem failed', err) }
  }

  async function importRecipe(ingredients) {
    try {
      for (const ing of ingredients) {
        const body = { name: ing.name }
        if (ing.quantity) body.quantity = String(ing.quantity)
        if (ing.unit) body.unit = ing.unit
        if (ing.iconKey) body.iconKey = ing.iconKey
        await api.post(`/lists/${listId}/items`, body)
      }
      invalidate()
    } catch (err) { console.error('importRecipe failed', err) }
  }

  async function saveListNote(content) {
    try { await api.put(`/lists/${listId}/notes/list`, { content }) } catch (err) { console.error('saveListNote failed', err) }
  }

  const isCheckedItem = (i) => !!i.checked
  const activeItems = items.filter((i) => !isCheckedItem(i))
  const doneItems = items.filter(isCheckedItem)

  // Build grouped sections for active items
  function buildGroups() {
    if (canGroupByStore && groupByStore) {
      const groups = []
      const usedIds = new Set()
      for (const s of activeStores) {
        const its = activeItems.filter((i) => i.storeId === s.storeId)
        its.forEach((i) => usedIds.add(i.id))
        if (its.length) groups.push({ key: `store-${s.storeId}`, label: s.customName || s.storeName, items: its })
      }
      const rest = activeItems.filter((i) => !usedIds.has(i.id))
      if (rest.length) groups.push({ key: 'store-none', label: t('items.no_store'), items: rest })
      return groups
    }
    if (isTodo && groupByPriority) {
      const groups = []
      const usedIds = new Set()
      for (const p of ['A', 'B', 'C']) {
        const its = activeItems.filter((i) => i.priority === p)
        its.forEach((i) => usedIds.add(i.id))
        if (its.length) groups.push({ key: `prio-${p}`, label: t('items.priority_header', { p }), items: its })
      }
      const rest = activeItems.filter((i) => !usedIds.has(i.id))
      if (rest.length) groups.push({ key: 'prio-none', label: '—', items: rest })
      return groups
    }
    return null
  }
  const groups = buildGroups()

  const addPlaceholder = isNotes
    ? t('items.add_note')
    : isTodo ? t('items.add_task') : t('items.add_article')
  const emptyText = isNotes
    ? t('items.empty_notes')
    : isTodo ? t('items.empty_todo') : t('items.empty_shopping')
  const emptyHint = isNotes
    ? t('items.empty_hint_notes')
    : isTodo ? t('items.empty_hint_todo') : t('items.empty_hint_shopping')

  const renderRow = (item, done = false) => (
    <ItemRow
      key={item.id}
      item={item}
      stores={stores}
      members={members}
      listType={listType}
      onToggle={() => toggleItem(item)}
      onDelete={() => deleteItem(item)}
      onClick={() => setOpenItem(item)}
      done={done}
    />
  )

  const toggleBtn = (active, onClick, Icon, label) => (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
      style={active
        ? { backgroundColor: YELLOW, color: BLUE, borderColor: YELLOW }
        : { color: '#666', borderColor: '#ddd' }}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Desktop top bar */}
      <div
        className="hidden min-[900px]:flex items-center px-4 h-14 shrink-0 gap-3"
        style={{ backgroundColor: BLUE }}
      >
        <button onClick={() => navigate(`/groups/${groupId}/lists`)} className="text-white">
          <ArrowLeft size={22} />
        </button>
        <span className="text-white font-semibold text-lg truncate">{listName}</span>
      </div>

      {/* Mobile sub-header with list name */}
      <div className="min-[900px]:hidden flex items-center px-4 py-2 bg-blue-50 border-b border-blue-100 gap-2">
        <button onClick={() => navigate(`/groups/${groupId}/lists`)} className="text-blue-800">
          <ArrowLeft size={18} />
        </button>
        <span className="font-medium text-sm text-blue-900 truncate">{listName}</span>
      </div>

      {/* Add input */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={addPlaceholder}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            onFocus={() => suggestions.length && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          {showSug && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recipe import (shopping only) */}
        {!isNotes && !isTodo && (
          <button
            onClick={() => setShowRecipe(true)}
            title={t('items.import_recipe')}
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <UtensilsCrossed size={18} />
          </button>
        )}

        <button
          onClick={() => addItem()}
          disabled={!newItemName.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: BLUE }}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Grouping toolbar */}
      {(canGroupByStore || isTodo) && !isNotes && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex gap-2">
          {canGroupByStore && toggleBtn(groupByStore, () => setGroupByStore((v) => !v), Store, t('items.group_by_store'))}
          {isTodo && toggleBtn(groupByPriority, () => setGroupByPriority((v) => !v), Flag, t('items.group_by_priority'))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading && <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>}
        {!isLoading && error && (
          <div className="text-center py-16 text-red-500">{t('common.error', { msg: error.message })}</div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">{emptyText}</p>
            <p className="text-sm mt-1">{emptyHint}</p>
          </div>
        )}

        {/* Notes view */}
        {isNotes && (
          <>
            {activeItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setOpenNote(item)}
                className="flex items-start w-full bg-yellow-50 border border-yellow-200 rounded-xl p-3 gap-3 text-left hover:bg-yellow-100 transition-colors"
              >
                <StickyNote size={18} color="#ca8a04" className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 text-sm">{item.name}</div>
                  {item.createdAt && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {doneItems.length > 0 && (
              <>
                <div className="text-xs text-gray-400 font-medium pt-2">
                  {t('items.notes_deleted_header', { count: doneItems.length })}
                </div>
                {doneItems.map((item) => (
                  <div key={item.id} className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 gap-3 opacity-60">
                    <StickyNote size={18} color="#9ca3af" className="shrink-0" />
                    <span className="text-sm text-gray-500 flex-1 truncate">{item.name}</span>
                    <button onClick={() => restoreNote(item)} className="text-blue-600 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">
                      {t('items.restore')}
                    </button>
                    <button onClick={() => deleteItem(item)} className="text-red-500 p-1 rounded hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* Shopping / Todo view */}
        {!isNotes && (
          <>
            {groups
              ? groups.map((g) => (
                  <div key={g.key} className="space-y-2">
                    <div className="flex items-center gap-2 pt-2 pb-0.5">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.label}</span>
                      <span className="text-xs text-gray-400">({g.items.length})</span>
                    </div>
                    {g.items.map((item) => renderRow(item))}
                  </div>
                ))
              : activeItems.map((item) => renderRow(item))}

            {doneItems.length > 0 && (
              <>
                <div className="text-xs text-gray-400 font-medium pt-2">
                  {t('items.done_header', { count: doneItems.length })}
                </div>
                {doneItems.map((item) => renderRow(item, true))}
              </>
            )}
          </>
        )}
      </div>

      {/* Note editor overlay */}
      {openNote && (
        <NoteEditor
          item={openNote}
          onClose={() => setOpenNote(null)}
          onSave={(name, content) => { saveNote(openNote, name, content); setOpenNote(null) }}
          onDelete={() => { toggleItem(openNote); setOpenNote(null) }}
        />
      )}

      {/* Item detail editor (shopping/todo) */}
      {openItem && (
        <ItemDetailModal
          item={openItem}
          stores={storesEnabled ? activeStores : []}
          members={members}
          listType={listType}
          onClose={() => setOpenItem(null)}
          onSave={(patch) => { saveItem(openItem, patch); setOpenItem(null) }}
          onDelete={() => { deleteItem(openItem); setOpenItem(null) }}
        />
      )}

      {/* Recipe import dialog */}
      {showRecipe && (
        <RecipeDialog
          onClose={() => setShowRecipe(false)}
          onImport={importRecipe}
          onNoteUpdate={saveListNote}
        />
      )}
    </div>
  )
}
