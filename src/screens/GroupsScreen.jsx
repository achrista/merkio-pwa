import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import api from '../api/client'
import GroupAvatar from '../components/GroupAvatar'

const BLUE = '#0050AA'
const YELLOW = '#FFF000'

function CreateGroupDialog({ onClose, onCreated }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await api.post('/groups', { name: name.trim() })
      onCreated()
    } catch {
      setError(t('groups.create_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold">{t('groups.new_title')}</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input
          autoFocus
          type="text"
          placeholder={t('groups.name_label')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
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

function JoinGroupDialog({ onClose, onJoined }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    try {
      await api.post('/groups/join', { inviteCode: code.trim() })
      onJoined()
    } catch (err) {
      const msg = err.response?.data?.error ?? ''
      if (msg.includes('bereits') || msg.includes('already')) setError(t('groups.join_already'))
      else if (msg.includes('ungültig') || msg.includes('invalid') || err.response?.status === 404) setError(t('groups.join_invalid'))
      else setError(t('groups.join_invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold">{t('groups.join')}</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input
          autoFocus
          type="text"
          placeholder={t('groups.invite_code')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">{t('common.cancel')}</button>
          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {t('groups.join_action')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function GroupsScreen({ groups, onSelectGroup, onGroupsChanged }) {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">{t('groups.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoin(true)}
            className="text-sm px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-100"
          >
            {t('groups.join')}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: BLUE }}
          >
            <Plus size={16} />
            {t('common.create')}
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">{t('groups.empty_title')}</p>
          <p className="text-sm mt-1">{t('groups.empty_hint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group)}
              className="flex items-center w-full bg-white rounded-xl p-4 gap-3 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <GroupAvatar group={group} size={40} />
              <span className="text-gray-800 font-medium flex-1">{group.name}</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); onGroupsChanged() }}
        />
      )}
      {showJoin && (
        <JoinGroupDialog
          onClose={() => setShowJoin(false)}
          onJoined={() => { setShowJoin(false); onGroupsChanged() }}
        />
      )}
    </div>
  )
}
