import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, Settings, LogOut, ShoppingCart, CheckSquare, StickyNote, Plus, ChevronRight } from 'lucide-react'
import GroupAvatar from './GroupAvatar'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

const BLUE = '#0050AA'

function ListTypeIcon({ type }) {
  if (type === 'todo') return <CheckSquare size={16} color={BLUE} />
  if (type === 'notes') return <StickyNote size={16} color={BLUE} />
  return <ShoppingCart size={16} color={BLUE} />
}

function GroupSection({ group, isActive, onSelect, navigate }) {
  const [open, setOpen] = useState(isActive)
  const location = useLocation()

  const { data } = useQuery({
    queryKey: ['lists', group.id],
    queryFn: () => api.get(`/groups/${group.id}/lists`).then((r) => r.data),
    enabled: isActive || open,
  })

  const lists = data?.lists ?? []

  return (
    <div>
      <button
        onClick={() => { setOpen(!open); onSelect(group) }}
        className="flex items-center w-full px-3 py-2 gap-2 hover:bg-blue-50 transition-colors"
        style={{ color: isActive ? BLUE : '#333' }}
      >
        <GroupAvatar group={group} size={24} />
        <span className="flex-1 text-left text-sm font-medium truncate">{group.name}</span>
        <ChevronRight
          size={14}
          className="transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div className="pl-4">
          {lists.length === 0 ? (
            <div className="text-xs text-gray-400 px-3 py-1">Keine Listen</div>
          ) : lists.map((list) => {
            const listPath = `/groups/${group.id}/lists/${list.id}/items`
            const isListActive = location.pathname === listPath
            return (
              <button
                key={list.id}
                onClick={() => navigate(listPath)}
                className={`flex items-center w-full px-3 py-1.5 gap-2 text-sm rounded mx-1 transition-colors ${
                  isListActive ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <ListTypeIcon type={list.type} />
                <span className="truncate">{list.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ groups, activeGroupId, onSelectGroup, onLogout, onNavigate, onClose }) {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-14 shrink-0"
        style={{ backgroundColor: BLUE }}
      >
        <img src="/logo-wordmark.png" alt="Merkio" className="h-8 w-auto" />
        {onClose && (
          <button onClick={onClose} className="text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Groups + Lists */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="flex items-center justify-between px-3 py-1">
          <button
            onClick={() => onNavigate('/groups')}
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-blue-700 transition-colors"
          >
            {t('drawer.groups')}
          </button>
          <button
            onClick={() => onNavigate('/groups', { state: { create: true } })}
            title={t('groups.new_title')}
            aria-label={t('groups.new_title')}
            className="text-gray-400 hover:text-blue-700 transition-colors p-1 -mr-1"
          >
            <Plus size={16} />
          </button>
        </div>
        {groups.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">{t('drawer.no_groups')}</div>
        )}
        {groups.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            isActive={group.id === activeGroupId}
            onSelect={onSelectGroup}
            navigate={onNavigate}
          />
        ))}
      </div>

      {/* Footer nav */}
      <div className="border-t border-gray-200 py-2">
        <button
          onClick={() => onNavigate('/settings')}
          className={`flex items-center w-full px-4 py-2.5 gap-3 text-sm hover:bg-gray-100 transition-colors ${
            location.pathname === '/settings' ? 'text-blue-700 font-medium' : 'text-gray-700'
          }`}
        >
          <Settings size={18} />
          {t('settings.title')}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-2.5 gap-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={18} />
          {t('common.logout')}
        </button>
      </div>
    </div>
  )
}
