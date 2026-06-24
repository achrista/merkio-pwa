import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ShoppingCart, CheckSquare, StickyNote, ChevronRight } from 'lucide-react'
import api from '../api/client'

const BLUE = '#0050AA'
const YELLOW = '#FFF000'

function ListTypeIcon({ type, size = 20 }) {
  if (type === 'todo') return <CheckSquare size={size} color={BLUE} />
  if (type === 'notes') return <StickyNote size={size} color={BLUE} />
  return <ShoppingCart size={size} color={BLUE} />
}

function CreateListDialog({ groupId, onClose, onCreated }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [type, setType] = useState('shopping')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const types = [
    ['shopping', t('lists.type_shopping')],
    ['todo', t('lists.type_todo')],
    ['notes', t('lists.type_notes')],
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await api.post(`/groups/${groupId}/lists`, { name: name.trim(), type })
      onCreated()
    } catch {
      setError(t('lists.create_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold">{t('lists.new_title')}</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input
          autoFocus
          type="text"
          placeholder={t('common.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <div className="space-y-1">
          {types.map(([val, label]) => (
            <label key={val} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="type"
                value={val}
                checked={type === val}
                onChange={() => setType(val)}
                style={{ accentColor: BLUE }}
              />
              <ListTypeIcon type={val} size={18} />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">{t('common.cancel')}</button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {t('common.create')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ListsScreen() {
  const { t } = useTranslation()
  const { groupId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['lists', Number(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/lists`).then((r) => r.data),
  })

  const lists = data?.lists ?? []

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">{data?.group?.name ?? '…'}</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-white"
          style={{ backgroundColor: BLUE }}
        >
          <Plus size={16} />
          {t('lists.create_cd')}
        </button>
      </div>

      {isLoading && <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>}
      {error && (
        <div className="text-center py-16 text-red-500">
          <p>{t('common.error', { msg: error.message })}</p>
          <button onClick={() => refetch()} className="text-blue-600 underline mt-2">{t('common.retry')}</button>
        </div>
      )}

      {!isLoading && !error && lists.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">{t('lists.empty_title')}</p>
          <p className="text-sm mt-1">{t('lists.empty_hint')}</p>
        </div>
      )}

      <div className="space-y-2">
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => navigate(`/groups/${groupId}/lists/${list.id}/items`)}
            className="flex items-center w-full bg-white rounded-xl px-4 py-3 gap-3 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <ListTypeIcon type={list.type} />
            <span className="text-gray-800 font-medium flex-1">{list.name}</span>
            <ChevronRight size={18} color="#aaa" />
          </button>
        ))}
      </div>

      {showCreate && (
        <CreateListDialog
          groupId={groupId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            queryClient.invalidateQueries({ queryKey: ['lists', Number(groupId)] })
          }}
        />
      )}
    </div>
  )
}
