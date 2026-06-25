import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { X, Trash2, Bold, Italic, UnderlineIcon } from 'lucide-react'

const YELLOW = '#FEFCE8' // sehr blasses Gelb = Tailwind yellow-50, wie die Notiz-Einträge in der Liste
const BLUE = '#0050AA'

export default function NoteEditor({ item, onClose, onSave, onDelete }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(item?.name ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: item?.content ?? '',
    editorProps: {
      attributes: {
        class: 'min-h-[200px] outline-none text-gray-800 text-base leading-relaxed',
      },
    },
  })

  function handleSave() {
    const content = editor?.getHTML() ?? ''
    onSave(title, content)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: YELLOW }}>
      {/* Toolbar */}
      <div className="flex items-center px-4 h-14 shrink-0 border-b border-yellow-200 gap-2">
        <button onClick={onClose} className="p-1 rounded hover:bg-yellow-200">
          <X size={22} color={BLUE} />
        </button>
        <span className="flex-1" />

        {/* Format buttons */}
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-sm font-bold transition-colors ${editor?.isActive('bold') ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-yellow-200'}`}
          title={t('items.note_bold')}
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-sm transition-colors ${editor?.isActive('italic') ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-yellow-200'}`}
          title={t('items.note_italic')}
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded text-sm transition-colors ${editor?.isActive('underline') ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-yellow-200'}`}
          title={t('items.note_underline')}
        >
          <UnderlineIcon size={18} />
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

      {/* Title */}
      <div className="px-4 pt-4">
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
            <h3 className="font-semibold text-gray-800">Notiz löschen?</h3>
            <p className="text-sm text-gray-500">Die Notiz wird in den Papierkorb verschoben und kann wiederhergestellt werden.</p>
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
