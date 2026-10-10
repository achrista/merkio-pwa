import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { X, Trash2, Bold, Italic, UnderlineIcon, List, Undo2 } from 'lucide-react'
import { CATEGORY_ICONS } from './ItemRow'
import { TODO_CATEGORIES } from '../utils/categories'

const YELLOW = 'var(--note-paper)' // Notiz-Papier: hell-gelb / im Dark Mode dunkel (siehe index.css)
const BLUE = '#0050AA'

// Textfarben – bewusst mittlere Töne, die auf dem gelben Notiz-Papier UND im
// Dark Mode lesbar bleiben. "default" setzt keine feste Farbe (folgt dem Modus).
const TEXT_COLORS = [
  { key: 'default', value: null },
  { key: 'blue', value: '#2563EB' },
  { key: 'green', value: '#16A34A' },
  { key: 'red', value: '#DC2626' },
  { key: 'amber', value: '#CA8A04' },
]

export default function NoteEditor({ item, onClose, onSave, onDelete }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(item?.name ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // Kategorie der Notiz – derselbe Satz wie bei To-dos; danach lässt sich die Notizliste gruppieren
  const [category, setCategory] = useState(TODO_CATEGORIES.includes(item?.iconKey) ? item.iconKey : 'other_todo')

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color],
    content: item?.content ?? '',
    editorProps: {
      attributes: {
        class: 'min-h-[200px] outline-none text-gray-800 text-base leading-relaxed',
      },
    },
  })

  // Reaktive Toolbar-Zustände: useEditorState abonniert Editor-Transaktionen –
  // ohne das bleiben aktive Markierungen (Farbe, Fett, …) eingefroren.
  const toolbar = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      bulletList: e?.isActive('bulletList') ?? false,
      color: e?.getAttributes('textStyle')?.color ?? null,
      canUndo: e?.can().undo() ?? false,
    }),
  })

  function handleSave() {
    const content = editor?.getHTML() ?? ''
    onSave(title, content, category)
  }

  function applyColor(value) {
    if (!editor) return
    if (value) editor.chain().focus().setColor(value).run()
    else editor.chain().focus().unsetColor().run()
  }

  const activeColor = toolbar?.color ?? null

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: YELLOW }}>
      {/* Toolbar */}
      <div className="flex items-center px-4 h-14 shrink-0 border-b border-yellow-200 gap-2">
        <button onClick={onClose} className="p-1 rounded hover:bg-yellow-200">
          <X size={22} color={BLUE} />
        </button>
        <span className="flex-1" />

        {/* Rückgängig: nimmt die letzten Änderungen am Text zurück (Verlauf des Editors) */}
        <button
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!toolbar?.canUndo}
          className="p-1.5 rounded text-gray-700 hover:bg-yellow-200 disabled:opacity-30 disabled:hover:bg-transparent"
          title={t('items.note_undo')}
          aria-label={t('items.note_undo')}
        >
          <Undo2 size={18} />
        </button>

        {/* Format buttons */}
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-sm font-bold transition-colors ${toolbar?.bold ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-yellow-200'}`}
          title={t('items.note_bold')}
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-sm transition-colors ${toolbar?.italic ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-yellow-200'}`}
          title={t('items.note_italic')}
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded text-sm transition-colors ${toolbar?.underline ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-yellow-200'}`}
          title={t('items.note_underline')}
        >
          <UnderlineIcon size={18} />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded text-sm transition-colors ${toolbar?.bulletList ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-yellow-200'}`}
          title={t('items.note_bullet_list')}
        >
          <List size={18} />
        </button>

        {/* Soft delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 rounded text-red-500 hover:bg-red-100 ml-2"
        >
          <Trash2 size={18} />
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          {t('common.save')}
        </button>
      </div>

      {/* Farb-Leiste */}
      <div className="flex items-center gap-3 px-4 h-10 shrink-0 border-b border-yellow-200">
        <span className="text-xs text-gray-500">{t('items.note_color')}</span>
        {TEXT_COLORS.map((c) => {
          const isActive = c.value ? activeColor === c.value : !activeColor
          return (
            <button
              key={c.key}
              onClick={() => applyColor(c.value)}
              title={t(`items.note_color_${c.key}`)}
              className={`w-5 h-5 rounded-full border transition-transform ${isActive ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'border-gray-300'}`}
              style={c.value ? { backgroundColor: c.value } : { backgroundColor: 'transparent' }}
            >
              {!c.value && <span className="block w-full h-full rounded-full border border-gray-500 text-gray-700 text-[10px] leading-4">A</span>}
            </button>
          )
        })}
      </div>

      {/* Title */}
      <div className="px-4 pt-4 space-y-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t('items.note_category')}
          title={t('items.note_category')}
          className="text-sm bg-transparent border border-yellow-300 rounded-lg px-2 py-1 text-gray-700 outline-none"
        >
          {TODO_CATEGORIES.map((key) => (
            <option key={key} value={key}>{CATEGORY_ICONS[key]} {t('items.cat_' + key)}</option>
          ))}
        </select>
        <input
          autoFocus={!item?.name}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('items.note_title_label')}
          className="w-full text-xl font-semibold bg-transparent outline-none text-gray-800 placeholder-gray-400 border-b border-yellow-200 pb-2"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-72 shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-800">{t('items.note_delete_title')}</h3>
            <p className="text-sm text-gray-500">{t('items.note_delete_hint')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete() }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
