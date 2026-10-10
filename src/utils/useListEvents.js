import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '../api/client'

const API = import.meta.env.VITE_API_URL ?? 'https://api.merkio.de/api/v1'

/**
 * Hält die Einträge einer Liste per SSE aktuell: Änderungen anderer Geräte landen direkt
 * im Query-Cache ['items', listId]. Der Server sendet benannte Events.
 */
export function useListEvents(listId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = getAccessToken()
    if (!token || !listId) return
    const url = `${API}/lists/${listId}/events?access_token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    const key = ['items', Number(listId)]

    const upsert = (item) => {
      queryClient.setQueryData(key, (old) => {
        const current = old?.items ?? []
        const exists = current.some((i) => i.id === item.id)
        return { ...(old ?? {}), items: exists ? current.map((i) => i.id === item.id ? item : i) : [...current, item] }
      })
    }
    const onUpsert = (e) => { try { upsert(JSON.parse(e.data)) } catch { /* unlesbares Event */ } }
    const onDeleted = (e) => {
      try {
        const { id } = JSON.parse(e.data)
        queryClient.setQueryData(key, (old) => old ? { ...old, items: (old.items ?? []).filter((i) => i.id !== id) } : old)
      } catch { /* unlesbares Event */ }
    }

    es.addEventListener('item_created', onUpsert)
    es.addEventListener('item_updated', onUpsert)
    es.addEventListener('item_deleted', onDeleted)

    return () => { es.close() }
  }, [listId, queryClient])
}
