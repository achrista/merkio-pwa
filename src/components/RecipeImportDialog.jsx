import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Link2, FileUp, Type, PencilLine } from 'lucide-react'
import api from '../api/client'

const BLUE = '#0050AA'
const MAX_FILE_BYTES = 20_000_000
const ACCEPT = '.pdf,.doc,.docx,.docm,.odt,.txt,.md,.xml,.html,.htm,image/*'

/**
 * Neues Rezept: aus einer Webadresse, einer Datei (PDF auch als Scan, Word, Text, Foto)
 * oder eingefügtem Text. Das Lesen übernimmt der Server; es dauert einige Sekunden.
 */
export default function RecipeImportDialog({ listId, knownLabels = [], onClose, onImported, onManual }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef(null)

  const suggestions = [t('recipes.label_family'), ...knownLabels.filter((known) => known !== t('recipes.label_family'))].slice(0, 6)
  const ready = mode === 'url' ? /^https?:\/\/\S+$/i.test(url.trim()) : mode === 'text' ? !!text.trim() : !!file

  function pickFile(picked) {
    setError('')
    if (picked && picked.size > MAX_FILE_BYTES) {
      setFile(null)
      setError(t('recipes.file_too_large'))
      return
    }
    setFile(picked ?? null)
  }

  async function run() {
    if (!ready || busy) return
    setBusy(true)
    setError('')
    const path = `/lists/${listId}/recipes/import`
    const wanted = label.trim()
    try {
      const res = mode === 'file'
        ? await api.post(path, file, {
            params: { name: file.name, ...(wanted ? { label: wanted } : {}) },
            // Nie application/json: so erkennt der Server die rohen Bytes der Datei
            headers: { 'Content-Type': file.type && file.type !== 'application/json' ? file.type : 'application/octet-stream' },
            timeout: 180_000,
          })
        : await api.post(path, { ...(mode === 'url' ? { url: url.trim() } : { text }), ...(wanted ? { label: wanted } : {}) }, { timeout: 180_000 })
      onImported(res.data.items ?? [])
    } catch (err) {
      setError(err.response?.data?.error ?? t('auth.connection_failed', { msg: err.message }))
    } finally {
      setBusy(false)
    }
  }

  const tab = (value, Icon, text_) => (
    <button
      type="button"
      onClick={() => { setMode(value); setError('') }}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium border-b-2"
      style={mode === value ? { color: BLUE, borderColor: BLUE } : { color: 'var(--pill-fg)', borderColor: 'transparent' }}
    >
      <Icon size={16} />
      {text_}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
          <button onClick={onClose} disabled={busy} className="text-gray-500" aria-label={t('common.close')}><X size={20} /></button>
          <span className="flex-1 font-semibold text-gray-800">{t('recipes.add')}</span>
        </div>

        <div className="flex border-b border-gray-100 px-3">
          {tab('url', Link2, t('recipes.from_url'))}
          {tab('file', FileUp, t('recipes.from_file'))}
          {tab('text', Type, t('recipes.from_text'))}
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {mode === 'url' && (
            <>
              <input
                autoFocus
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && run()}
                placeholder="https://…"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-400">{t('recipes.url_hint')}</p>
            </>
          )}

          {mode === 'file' && (
            <>
              <input ref={fileInput} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-6 text-sm text-gray-600 hover:bg-gray-50"
              >
                {file ? <span className="font-medium text-gray-800 break-all">{file.name}</span> : t('recipes.choose_file')}
              </button>
              <p className="text-xs text-gray-400">{t('recipes.file_hint')}</p>
            </>
          )}

          {mode === 'text' && (
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('recipes.text_placeholder')}
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          )}

          <div className="space-y-1.5">
            <input
              type="text"
              value={label}
              maxLength={40}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={mode === 'url' ? t('recipes.label_placeholder_url') : t('recipes.label_placeholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-1.5 flex-wrap">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setLabel(label === suggestion ? '' : suggestion)}
                  className="px-2.5 py-1 rounded-full text-xs border"
                  style={label === suggestion
                    ? { backgroundColor: BLUE, color: 'white', borderColor: BLUE }
                    : { color: 'var(--pill-fg)', borderColor: 'var(--pill-border)' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {busy && <p className="text-sm text-gray-600">{t('recipes.importing')}</p>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center gap-3">
          <button onClick={onManual} disabled={busy} className="flex items-center gap-1.5 px-2 py-2 text-sm text-gray-600 disabled:opacity-50">
            <PencilLine size={16} />
            {t('recipes.manual')}
          </button>
          <button
            onClick={run}
            disabled={!ready || busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {busy ? t('recipes.importing_short') : t('recipes.import')}
          </button>
        </div>
      </div>
    </div>
  )
}
