import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, GripVertical } from 'lucide-react'
import { CATEGORY_ICONS } from './ItemRow'

const BLUE = '#0050AA'

// Kategorie-Reihenfolge per Ziehen ändern (HTML5 Drag-and-Drop).
export default function CategoryOrderDialog({ order, onClose, onSave }) {
  const { t } = useTranslation()
  const [items, setItems] = useState(order)
  const [dragIndex, setDragIndex] = useState(null)

  function onDragOver(e, i) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(i, 0, moved)
      return next
    })
    setDragIndex(i)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
          <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
          <span className="flex-1 font-semibold text-gray-800">{t('items.category_order_title')}</span>
          <button
            onClick={() => onSave(items)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: BLUE }}
          >
            {t('common.save')}
          </button>
        </div>
        <p className="px-5 pt-3 text-xs text-gray-400">{t('items.category_order_hint')}</p>
        <div className="px-3 py-2 overflow-y-auto">
          {items.map((key, i) => (
            <div
              key={key}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-move border ${dragIndex === i ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
            >
              <GripVertical size={18} className="text-gray-400 shrink-0" />
              <span className="text-lg">{CATEGORY_ICONS[key] ?? '📦'}</span>
              <span className="text-sm text-gray-800">{t('items.cat_' + key)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
