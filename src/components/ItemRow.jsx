import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../api/client'

const BLUE = '#0050AA'

const CATEGORY_COLORS = {
  fruit_veg: '#4CAF50', meat_fish: '#FF5722', drinks: '#2196F3',
  dairy: '#9C27B0', frozen: '#00BCD4', bakery: '#FF9800',
  sweets: '#E91E63', household: '#607D8B', drugstore: '#009688',
  personal: '#8BC34A', work: '#3F51B5', home_todo: '#795548',
  health: '#F44336', finance: '#FFC107', transport: '#9E9E9E',
  communication: '#00BCD4', creative: '#FF4081', learning: '#673AB7',
}

const CATEGORY_ICONS = {
  fruit_veg: '🍎', meat_fish: '🥩', drinks: '🥤', dairy: '🥛', frozen: '🧊',
  bakery: '🥖', sweets: '🍬', household: '🧹', drugstore: '💊', personal: '🧴',
  work: '💼', home_todo: '🏠', health: '❤️', finance: '💶', transport: '🚗',
  communication: '📞', creative: '🎨', learning: '📚',
}

function getPriorityBadge(priority) {
  if (!priority) return null
  const colors = { A: 'bg-red-100 text-red-700', B: 'bg-yellow-100 text-yellow-700', C: 'bg-green-100 text-green-700' }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${colors[priority] ?? ''}`}>
      {priority}
    </span>
  )
}

function getDueColor(due) {
  if (!due) return ''
  const diff = (new Date(due) - new Date()) / 86400000
  if (diff < 0) return 'text-red-600'
  if (diff < 1) return 'text-orange-500'
  if (diff < 3) return 'text-yellow-600'
  return 'text-gray-500'
}

export default function ItemRow({ item, listId, listType, onToggle, onDelete, onRefresh, done }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const hasMeta = item.quantity || item.note || item.priority || item.dueDate || item.store

  const categoryColor = CATEGORY_COLORS[item.categoryIcon] ?? BLUE
  const categoryEmoji = CATEGORY_ICONS[item.categoryIcon]

  const dueStr = item.dueDate
    ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden transition-opacity ${done ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center px-3 py-2.5 gap-3">
        {/* Category dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: categoryColor }}
        />

        {/* Checkbox */}
        <button
          onClick={onToggle}
          className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
          style={{
            borderColor: item.checked ? BLUE : '#ccc',
            backgroundColor: item.checked ? BLUE : 'transparent',
          }}
        >
          {item.checked && <span className="text-white text-xs leading-none">✓</span>}
        </button>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-800'} truncate`}>
            {categoryEmoji && <span className="mr-1">{categoryEmoji}</span>}
            {item.name}
            {item.quantity && <span className="text-gray-400 ml-1 text-xs">{item.quantity}</span>}
          </div>
          {(item.priority || item.dueDate || item.store) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {getPriorityBadge(item.priority)}
              {dueStr && <span className={`text-xs ${getDueColor(item.dueDate)}`}>{dueStr}</span>}
              {item.store && <span className="text-xs text-gray-400">{item.store}</span>}
            </div>
          )}
        </div>

        {/* Expand / delete */}
        {hasMeta && (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 p-0.5">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 p-0.5 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && hasMeta && (
        <div className="px-4 pb-3 text-xs text-gray-500 border-t border-gray-100 pt-2 space-y-0.5">
          {item.note && <div className="italic">{item.note}</div>}
        </div>
      )}
    </div>
  )
}
