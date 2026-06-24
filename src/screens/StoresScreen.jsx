import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Edit2, Check } from 'lucide-react'
import api from '../api/client'

const BLUE = '#0050AA'

export default function StoresScreen() {
  const { t } = useTranslation()
  const { groupId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customName, setCustomName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [msg, setMsg] = useState('')

  const { data: storesData, refetch: refetchStores } = useQuery({
    queryKey: ['stores', Number(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/stores`).then((r) => r.data),
  })

  const { data: presetsData } = useQuery({
    queryKey: ['store-presets'],
    queryFn: () => api.get('/stores/presets').then((r) => r.data),
  })

  const userStores = storesData?.stores ?? []
  const presets = presetsData?.presets ?? []
  const groupName = storesData?.group?.name ?? ''

  async function addPreset(preset) {
    try {
      await api.post(`/groups/${groupId}/stores`, { originalName: preset.name })
      refetchStores()
    } catch {}
  }

  async function addCustom() {
    if (!customName.trim()) return
    try {
      await api.post(`/groups/${groupId}/stores`, { customName: customName.trim() })
      setCustomName('')
      refetchStores()
    } catch {}
  }

  async function removeStore(storeId) {
    try {
      await api.delete(`/groups/${groupId}/stores/${storeId}`)
      refetchStores()
    } catch {}
  }

  async function renameStore(storeId) {
    if (!editName.trim()) return
    try {
      await api.patch(`/groups/${groupId}/stores/${storeId}`, { displayName: editName.trim() })
      setEditingId(null)
      refetchStores()
    } catch {}
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-600">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {t('stores.title', { name: groupName })}
        </h1>
      </div>

      {/* Your stores */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {t('stores.your')}
        </h2>
        {userStores.length === 0 ? (
          <div className="text-sm text-gray-400 py-2">{t('stores.empty')}</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {userStores.map((s) => (
              <div key={s.id} className="flex items-center px-4 py-3 border-b border-gray-100 last:border-0 gap-3">
                {editingId === s.id ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && renameStore(s.id)}
                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                    />
                    <button onClick={() => renameStore(s.id)} className="text-green-600">
                      <Check size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-800">
                      {s.displayName}
                      {s.originalName && s.displayName !== s.originalName && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({t('stores.original', { name: s.originalName })})
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => { setEditingId(s.id); setEditName(s.displayName) }}
                      className="text-gray-400 hover:text-blue-600 p-0.5"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => removeStore(s.id)} className="text-gray-300 hover:text-red-400 p-0.5">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add custom */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {t('stores.add_custom_title')}
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('stores.custom_name_label')}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={addCustom}
            disabled={!customName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Märkte hinzufügen
          </h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const already = userStores.some((s) => s.originalName === preset.name)
              return (
                <button
                  key={preset.name}
                  onClick={() => !already && addPreset(preset)}
                  disabled={already}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    already
                      ? 'bg-gray-100 text-gray-400 border-gray-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700'
                  }`}
                >
                  {preset.name}
                  {already && ' ✓'}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
