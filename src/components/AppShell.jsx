import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import GroupsScreen from '../screens/GroupsScreen'
import ListsScreen from '../screens/ListsScreen'
import ItemsScreen from '../screens/ItemsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import StoresScreen from '../screens/StoresScreen'

export default function AppShell({ onLogout }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [activeGroupName, setActiveGroupName] = useState('')

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then((r) => r.data),
  })

  const groups = groupsData?.groups ?? []

  const selectGroup = useCallback((group) => {
    setActiveGroupId(group.id)
    setActiveGroupName(group.name)
    navigate(`/groups/${group.id}/lists`)
    setDrawerOpen(false)
  }, [navigate])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar (≥900px) */}
      <div className="hidden min-[900px]:flex flex-col w-64 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <Sidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onSelectGroup={selectGroup}
          onLogout={onLogout}
          onNavigate={(path, opts) => navigate(path, opts)}
        />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 min-[900px]:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl z-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              groups={groups}
              activeGroupId={activeGroupId}
              onSelectGroup={selectGroup}
              onLogout={onLogout}
              onNavigate={(path, opts) => { navigate(path, opts); setDrawerOpen(false) }}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setDrawerOpen(true)} />
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/groups" replace />} />
            <Route path="/groups" element={
              <GroupsScreen
                groups={groups}
                onSelectGroup={selectGroup}
                onGroupsChanged={() => queryClient.invalidateQueries({ queryKey: ['groups'] })}
              />
            } />
            <Route path="/groups/:groupId/lists" element={<ListsScreen />} />
            <Route path="/groups/:groupId/lists/:listId/items" element={<ItemsScreen />} />
            <Route path="/settings" element={<SettingsScreen onLogout={onLogout} onGroupsChanged={() => queryClient.invalidateQueries({ queryKey: ['groups'] })} />} />
            <Route path="/groups/:groupId/stores" element={<StoresScreen />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
