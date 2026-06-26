import { Trash2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const BLUE = '#0050AA'

const CATEGORY_COLORS = {
  fruit_veg: '#4CAF50', meat_fish: '#FF5722', drinks: '#2196F3',
  dairy: '#9C27B0', frozen: '#00BCD4', bakery: '#FF9800',
  sweets: '#E91E63', household: '#607D8B', drugstore: '#009688',
  personal: '#8BC34A', work: '#3F51B5', home_todo: '#795548',
  health: '#F44336', finance: '#FFC107', transport: '#9E9E9E',
  communication: '#00BCD4', creative: '#FF4081', learning: '#673AB7',
  other: '#9E9E9E',
}

export const CATEGORY_ICONS = {
  fruit_veg: '🍎', meat_fish: '🥩', drinks: '🥤', dairy: '🥛', frozen: '🧊',
  bakery: '🥖', sweets: '🍬', household: '🧹', drugstore: '💊', personal: '🧴',
  work: '💼', home_todo: '🏠', health: '❤️', finance: '💶', transport: '🚗',
  communication: '📞', creative: '🎨', learning: '📚', other: '📦',
}

export function memberDisplayName(m) {
  return (m?.shortName?.trim()) || (m?.firstName?.trim()) || '?'
}

export function parseAssignedIds(assignedTo) {
  if (!assignedTo) return []
  return String(assignedTo).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
}

function priorityBadge(priority) {
  if (!priority) return null
  const colors = { A: 'bg-red-500', B: 'bg-amber-500', C: 'bg-green-500' }
  return (
    <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${colors[priority] ?? 'bg-gray-400'}`}>
      {priority}
    </span>
  )
}

function dueColor(due) {
  if (!due) return 'text-gray-500'
  const diff = (new Date(due) - new Date()) / 86400000
  if (diff < 0) return 'text-red-600 font-medium'
  if (diff < 1) return 'text-orange-500 font-medium'
  if (diff < 3) return 'text-yellow-600'
  return 'text-gray-500'
}

export default function ItemRow({ item, stores, members, listType, onToggle, onDelete, onClick, done }) {
  const { t } = useTranslation()
  const isTodo = listType === 'todo'
  const checked = !!item.checked
  const categoryColor = CATEGORY_COLORS[item.iconKey] ?? '#cbd5e1'
  const emoji = CATEGORY_ICONS[item.iconKey]
  const store = stores?.find((s) => s.storeId === item.storeId)
  const storeName = store ? (store.customName || store.storeName) : null

  const assignedIds = parseAssignedIds(item.assignedTo)
  const assignedNames = assignedIds
    .map((id) => members?.find((m) => m.userId === id))
    .filter(Boolean)
    .map(memberDisplayName)

  const dueStr = item.dueDate
    ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null
  const qty = [item.quantity, item.unit].filter(Boolean).join(' ')

  const meta = []
  if (isTodo) {
    if (dueStr) meta.push(dueStr)
    if (assignedNames.length) meta.push(assignedNames.join(', '))
  } else if (storeName) {
    meta.push(`🏪 ${storeName}`)
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm flex items-center px-3 py-2 gap-2.5 transition-opacity ${done ? 'opacity-50' : ''}`}>
      {/* Category dot */}
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />

      {/* Priority badge (todo, active only) */}
      {isTodo && !done && priorityBadge(item.priority)}

      {/* Name + meta (click to edit) */}
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <div className={`text-sm truncate ${done ? 'line-through text-gray-400' : (isTodo && dueStr ? dueColor(item.dueDate) : 'text-gray-800')}`}>
          {emoji && <span className="mr-1">{emoji}</span>}
          {item.name}
          {!isTodo && qty && <span className="text-gray-400 ml-1.5 text-xs">{qty}</span>}
        </div>
        {meta.length > 0 && (
          <div className="text-xs text-gray-400 mt-0.5 truncate">{meta.join(' · ')}</div>
        )}
      </button>

      {/* Trailing control: active → check off; done → restore (+) */}
      {done ? (
        <button
          onClick={onToggle}
          title={t('items.restore')}
          aria-label={t('items.restore')}
          className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors hover:bg-blue-50"
          style={{ borderColor: BLUE, color: BLUE }}
        >
          <Plus size={16} />
        </button>
      ) : (
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
          style={{ borderColor: 'var(--pill-border)', backgroundColor: 'transparent' }}
          aria-label="toggle"
        />
      )}

      {/* Delete (done rows: permanent delete) */}
      {done && (
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 p-0.5 transition-colors shrink-0">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}
