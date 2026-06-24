import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, RotateCcw, Trash2, StickyNote } from 'lucide-react'
import api, { getAccessToken } from '../api/client'
import NoteEditor from '../components/NoteEditor'
import ItemRow from '../components/ItemRow'

const BLUE = '#0050AA'
const YELLOW = '#FFF000'

const CATEGORY_ICONS = {
  fruit_veg: '🍎', meat_fish: '🥩', drinks: '🥤', dairy: '🥛', frozen: '🧊',
  bakery: '🥖', sweets: '🍬', household: '🧹', drugstore: '💊', personal: '🧴',
  work: '💼', home_todo: '🏠', health: '❤️', finance: '💶', transport: '🚗',
  communication: '📞', creative: '🎨', learning: '📚',
}

function getPriorityColor(due) {
  if (!due) return ''
  const diff = (new Date(due) - new Date()) / 86400000
  if (diff < 0) return 'text-red-600'
  if (diff < 1) return 'text-orange-500'
  if (diff < 3) return 'text-yellow-600'
  return 'text-gray-600'
}

export default function ItemsScreen() {
  const { t } = useTranslation()
  const { groupId, listId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newItemName, setNewItemName] = useState('')
  const [openNote, setOpenNote] = useState(null)
  const inputRef = useRef(null)
  const sseRef = useRef(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['items', Number(listId)],
    queryFn: () => api.get(`/lists/${listId}/items`).then((r) => r.data),
  })

  const items = data?.items ?? []
  const listType = data?.list?.type ?? 'shopping'
  const listName = data?.list?.name ?? '…'
  const isNotes = listType === 'notes'

  // SSE real-time updates
  useEffect(() => {
    const token = getAccessToken()
    if (!token || !listId) return
    const url = `${import.meta.env.VITE_API_URL ?? 'https://api.merkio.de/api/v1'}/lists/${listId}/events?access_token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    sseRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        queryClient.setQueryData(['items', Number(listId)], (old) => {
          if (!old) return old
          const current = old.items ?? []
          if (event.type === 'item_created') {
            if (current.some((i) => i.id === event.item.id)) return old
            return { ...old, items: [...current, event.item] }
          }
          if (event.type === 'item_updated') {
            return { ...old, items: current.map((i) => i.id === event.item.id ? event.item : i) }
          }
          if (event.type === 'item_deleted') {
            return { ...old, items: current.filter((i) => i.id !== event.itemId) }
          }
          return old
        })
      } catch {}
    }

    return () => { es.close(); sseRef.current = null }
  }, [listId, queryClient])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['items', Number(listId)] })
  }, [queryClient, listId])

  async function addItem() {
    const name = newItemName.trim()
    if (!name) return
    setNewItemName('')
    try {
      if (isNotes) {
        await api.post(`/lists/${listId}/items`, { name, content: '' })
      } else {
        await api.post(`/lists/${listId}/items`, { name })
      }
      invalidate()
    } catch {}
  }

  async function toggleItem(item) {
    try {
      await api.patch(`/lists/${listId}/items/${item.id}`, { checked: !item.checked })
      invalidate()
    } catch {}
  }

  async function deleteItem(item) {
    try {
      await api.delete(`/lists/${listId}/items/${item.id}`)
      invalidate()
    } catch {}
  }

  async function restoreNote(item) {
    try {
      await api.patch(`/lists/${listId}/items/${item.id}`, { checked: false })
      invalidate()
    } catch {}
  }

  async function saveNote(item, name, content) {
    try {
      await api.patch(`/lists/${listId}/items/${item.id}`, { name, content })
      invalidate()
    } catch {}
  }

  // Groupings
  const activeItems = items.filter((i) => !i.checked)
  const doneItems = items.filter((i) => i.checked)

  const addPlaceholder = isNotes
    ? t('items.add_note')
    : listType === 'todo' ? t('items.add_task') : t('items.add_article')

  const emptyText = isNotes
    ? t('items.empty_notes')
    : listType === 'todo' ? t('items.empty_todo') : t('items.empty_shopping')

  const emptyHint = isNotes
    ? t('items.empty_hint_notes')
    : listType === 'todo' ? t('items.empty_hint_todo') : t('items.empty_hint_shopping')

  return (
    <div className="flex flex-col h-full">
      {/* Desktop top bar (hidden on mobile – TopBar handles it) */}
      <div
        className="hidden min-[900px]:flex items-center px-4 h-14 shrink-0 gap-3"
        style={{ backgroundColor: BLUE }}
      >
        <button onClick={() => navigate(`/groups/${groupId}/lists`)} className="text-white">
          <ArrowLeft size={22} />
        </button>
        <span className="text-white font-semibold text-lg truncate">{listName}</span>
      </div>

      {/* Add input */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder={addPlaceholder}
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={addItem}
          disabled={!newItemName.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: BLUE }}
        >
          <Plus size={18} />
        </button>
      </div>

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
                  {item.updatedAt && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.updatedAt).toLocaleDateString()}
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
                  <div
                    key={item.id}
                    className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 gap-3 opacity-60"
                  >
                    <StickyNote size={18} color="#9ca3af" className="shrink-0" />
                    <span className="text-sm text-gray-500 flex-1 truncate">{item.name}</span>
                    <button
                      onClick={() => restoreNote(item)}
                      className="text-blue-600 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50"
                    >
                      {t('items.restore')}
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="text-red-500 p-1 rounded hover:bg-red-50"
                    >
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
            {activeItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                listId={listId}
                listType={listType}
                onToggle={() => toggleItem(item)}
                onDelete={() => deleteItem(item)}
                onRefresh={invalidate}
              />
            ))}

            {doneItems.length > 0 && (
              <>
                <div className="text-xs text-gray-400 font-medium pt-2">
                  {t('items.done_header', { count: doneItems.length })}
                </div>
                {doneItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    listId={listId}
                    listType={listType}
                    onToggle={() => toggleItem(item)}
                    onDelete={() => deleteItem(item)}
                    onRefresh={invalidate}
                    done
                  />
                ))}
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
          onSave={(name, content) => {
            saveNote(openNote, name, content)
            setOpenNote(null)
          }}
          onDelete={() => {
            toggleItem(openNote)
            setOpenNote(null)
          }}
        />
      )}
    </div>
  )
}
