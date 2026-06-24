import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Trash2 } from 'lucide-react'
import { CATEGORY_ICONS, memberDisplayName, parseAssignedIds } from './ItemRow'

const BLUE = '#0050AA'
const ICON_KEYS = Object.keys(CATEGORY_ICONS)

export default function ItemDetailModal({ item, stores, members, listType, onClose, onSave, onDelete }) {
  const { t } = useTranslation()
  const [name, setName] = useState(item.name ?? '')
  const [quantity, setQuantity] = useState([item.quantity, item.unit].filter(Boolean).join(' '))
  const [priority, setPriority] = useState(item.priority ?? 'B')
  const [dueDate, setDueDate] = useState(item.dueDate ? item.dueDate.slice(0, 10) : '')
  const [storeId, setStoreId] = useState(item.storeId ?? null)
  const [assignedIds, setAssignedIds] = useState(parseAssignedIds(item.assignedTo))
  const [memberQuery, setMemberQuery] = useState('')
  const [iconKey, setIconKey] = useState(item.iconKey ?? '')
  const [content, setContent] = useState(item.content ?? '')

  const isTodo = listType === 'todo'
  const activeStores = (stores ?? []).filter((s) => s.active)
  // Always include the currently assigned store, even if it is inactive/removed,
  // so it stays visible and changeable.
  const pickerStores = [...activeStores]
  if (item.storeId && !pickerStores.some((s) => s.storeId === item.storeId)) {
    const assigned = (stores ?? []).find((s) => s.storeId === item.storeId)
    if (assigned) pickerStores.push(assigned)
  }
  const availableMembers = (members ?? []).filter(
    (m) => !assignedIds.includes(m.userId) &&
      (!memberQuery.trim() || memberDisplayName(m).toLowerCase().includes(memberQuery.trim().toLowerCase()))
  )

  function handleSave() {
    const patch = {
      name: name.trim(),
      iconKey: iconKey || null,
      content: content.trim() || null,
    }
    if (isTodo) {
      patch.priority = priority
      patch.dueDate = dueDate || null
      patch.assignedTo = assignedIds.length ? assignedIds.join(',') : null
    } else {
      patch.quantity = quantity.trim() || null
      patch.storeId = storeId ?? null
    }
    onSave(patch)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
          <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
          <span className="flex-1 font-semibold text-gray-800 truncate">{item.name}</span>
          <button onClick={onDelete} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('common.name')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />

          {/* Shopping: quantity + store chips */}
          {!isTodo && (
            <>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t('items.quantity_placeholder')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              {pickerStores.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">{t('settings.stores_button')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* No store */}
                    <button
                      onClick={() => setStoreId(null)}
                      className="text-sm px-3 py-1.5 rounded-full border transition-colors"
                      style={storeId == null
                        ? { backgroundColor: BLUE, color: '#fff', borderColor: BLUE }
                        : { color: '#777', borderColor: '#ddd' }}
                    >
                      {t('items.no_store')}
                    </button>
                    {pickerStores.map((s) => {
                      const sel = storeId === s.storeId
                      return (
                        <button
                          key={s.storeId}
                          onClick={() => setStoreId(sel ? null : s.storeId)}
                          className="text-sm px-3 py-1.5 rounded-full border-2 transition-colors font-medium"
                          style={sel
                            ? { backgroundColor: BLUE, color: '#fff', borderColor: BLUE }
                            : { color: BLUE, borderColor: BLUE, backgroundColor: '#fff' }}
                        >
                          {s.customName || s.storeName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Todo: priority + due + assignees */}
          {isTodo && (
            <>
              <div>
                <div className="text-xs text-gray-500 mb-1">{t('items.priority_label')}</div>
                <div className="flex gap-2">
                  {['A', 'B', 'C'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className="flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors"
                      style={priority === p
                        ? { backgroundColor: BLUE, color: '#fff', borderColor: BLUE }
                        : { color: '#666', borderColor: '#ddd' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">{t('items.due_label')}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  {dueDate && (
                    <button onClick={() => setDueDate('')} className="text-red-500 px-2 py-1 text-sm">✕</button>
                  )}
                </div>
              </div>

              {/* Assignees */}
              {(members?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">{t('items.search_person')}</div>
                  {assignedIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {assignedIds.map((id) => {
                        const m = members.find((x) => x.userId === id)
                        return (
                          <button
                            key={id}
                            onClick={() => setAssignedIds(assignedIds.filter((x) => x !== id))}
                            className="text-sm px-3 py-1 rounded-full text-white flex items-center gap-1"
                            style={{ backgroundColor: BLUE }}
                          >
                            {m ? memberDisplayName(m) : id}
                            <span className="text-xs">✕</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder={t('items.search_person')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  {memberQuery.trim() && availableMembers.length > 0 && (
                    <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                      {availableMembers.map((m) => (
                        <button
                          key={m.userId}
                          onClick={() => { setAssignedIds([...assignedIds, m.userId]); setMemberQuery('') }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                        >
                          {memberDisplayName(m)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Note */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('items.note_placeholder')}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />

          {/* Category icon */}
          <div>
            <div className="text-xs text-gray-500 mb-1">{t('items.category_icon')}</div>
            <div className="flex flex-wrap gap-1.5">
              {ICON_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setIconKey(key === iconKey ? '' : key)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition-colors"
                  style={iconKey === key
                    ? { borderColor: BLUE, backgroundColor: '#e8f0fe' }
                    : { borderColor: '#eee' }}
                >
                  {CATEGORY_ICONS[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">{t('common.cancel')}</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
