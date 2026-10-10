import { useEffect, useState } from 'react'
import api from '../api/client'
import { parseRecipe, RECIPE_CATEGORY_ICONS } from '../utils/recipe'

// Fotos kommen als Blob über axios – so bleibt das Token aus der Adresse und ein
// abgelaufenes wird erneuert. Je Foto-Stand (photoRev) wird nur einmal geladen.
const cache = new Map() // "id:rev:size" -> Promise<objectUrl>

function loadPhoto(itemId, rev, thumb) {
  const key = `${itemId}:${rev}:${thumb ? 't' : 'f'}`
  if (!cache.has(key)) {
    const request = api
      .get(`/items/${itemId}/photo`, { params: { ...(thumb ? { size: 'thumb' } : {}), v: rev }, responseType: 'blob' })
      .then((res) => URL.createObjectURL(res.data))
    request.catch(() => cache.delete(key))
    cache.set(key, request)
  }
  return cache.get(key)
}

/** Adresse des Fotos eines Rezepts – oder null, solange es lädt oder wenn es keines gibt. */
export function usePhotoUrl(item, thumb = false) {
  const content = parseRecipe(item)
  const rev = content.image ? (content.photoRev ?? 0) : null
  const [loaded, setLoaded] = useState(null) // { key, url }
  const key = rev === null ? null : `${item.id}:${rev}:${thumb}`

  useEffect(() => {
    if (key === null) return
    let active = true
    loadPhoto(item.id, rev, thumb).then((url) => { if (active) setLoaded({ key, url }) }).catch(() => {})
    return () => { active = false }
  }, [key, item.id, rev, thumb])

  return loaded && loaded.key === key ? loaded.url : null
}

/** Vorschaubild für die Rezeptliste; ohne Foto das Zeichen der Kategorie. */
export function RecipeThumb({ item, size = 48 }) {
  const url = usePhotoUrl(item, true)
  const style = { width: size, height: size }
  if (url) return <img src={url} alt="" style={style} className="rounded-lg object-cover shrink-0" />
  return (
    <div style={style} className="rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
      {RECIPE_CATEGORY_ICONS[item.category] ?? '📖'}
    </div>
  )
}

/** Speichert eine Datei aus der API auf dem Gerät (Export, Foto). */
export async function downloadFile(path, params, fileName) {
  const res = await api.get(path, { params, responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Dateiname aus einem Titel – dieselbe Regel wie im Backend (Culinolas fileName). */
export function fileName(title) {
  const name = String(title).replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).replace(/[. ]+$/, '')
  return name || 'Rezept'
}
