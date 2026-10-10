import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import ItemsScreen from './ItemsScreen'
import RecipesScreen from './RecipesScreen'

/** Weiche nach Listentyp: Rezeptlisten haben ihre eigene Ansicht, alle anderen die Artikelliste. */
export default function ListScreen() {
  const { t } = useTranslation()
  const { listId } = useParams()

  const { data: listMeta, isLoading } = useQuery({
    queryKey: ['list', Number(listId)],
    queryFn: () => api.get(`/lists/${listId}`).then((r) => r.data.list),
  })

  if (isLoading) return <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>
  // key: beim Wechsel der Liste beginnt die Ansicht frisch (Suche, geöffnetes Rezept)
  if (listMeta?.type === 'recipes') return <RecipesScreen key={listId} listName={listMeta.name} />
  return <ItemsScreen />
}
