import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Copy, Trash2, LogOut, Store, Users, ChevronRight } from 'lucide-react'
import api from '../api/client'
import i18n from '../i18n/index.js'

const BLUE = '#0050AA'
const LANGS = ['de', 'en', 'fr']

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 mb-2">{title}</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">{children}</div>
    </div>
  )
}

function Row({ label, value, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full px-4 py-3 border-b border-gray-100 last:border-0 text-left ${danger ? 'text-red-500' : 'text-gray-800'} hover:bg-gray-50 transition-colors`}
    >
      <span className="text-sm">{label}</span>
      {value ? (
        <span className="text-sm text-gray-400">{value}</span>
      ) : (
        <ChevronRight size={16} color="#ccc" />
      )}
    </button>
  )
}

export default function SettingsScreen({ onLogout, onGroupsChanged }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [locale, setLocale] = useState(localStorage.getItem('locale') ?? 'de')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [editProfile, setEditProfile] = useState(false)
  const [editPw, setEditPw] = useState(false)

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  })

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then((r) => r.data),
  })

  useEffect(() => {
    if (meData?.user) {
      setFirstName(meData.user.firstName ?? '')
      setLastName(meData.user.lastName ?? '')
      const serverLocale = meData.user.locale
      if (serverLocale) {
        setLocale(serverLocale)
        localStorage.setItem('locale', serverLocale)
        i18n.changeLanguage(serverLocale)
      }
    }
  }, [meData])

  async function saveName() {
    try {
      await api.patch('/auth/profile', { firstName, lastName })
      setSaveMsg(t('settings.saved'))
      setTimeout(() => setSaveMsg(''), 2000)
    } catch {}
  }

  async function changeLang(lang) {
    setLocale(lang)
    localStorage.setItem('locale', lang)
    i18n.changeLanguage(lang)
    try {
      await api.patch('/auth/profile', { locale: lang })
    } catch {}
  }

  async function changePassword() {
    if (newPw.length < 8) return setPwMsg(t('auth.password_too_short'))
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw })
      setPwMsg(t('settings.password_changed'))
      setCurrentPw('')
      setNewPw('')
      setTimeout(() => setPwMsg(''), 2000)
    } catch (err) {
      const status = err.response?.status
      setPwMsg(status === 401 ? t('settings.current_password_wrong') : t('common.error', { msg: '' }))
    }
  }

  async function deleteAccount() {
    try {
      await api.delete('/auth/account')
      onLogout()
    } catch {}
  }

  const groups = groupsData?.groups ?? []

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">{t('settings.title')}</h1>

      {/* Profile */}
      <Section title={t('settings.profile')}>
        <div className="px-4 py-3 space-y-3 border-b border-gray-100">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder={t('settings.first_name')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              type="text"
              placeholder={t('settings.last_name')}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center justify-between">
            {saveMsg && <span className="text-green-600 text-xs">{saveMsg}</span>}
            <button
              onClick={saveName}
              className="ml-auto px-4 py-1.5 rounded-lg text-sm text-white"
              style={{ backgroundColor: BLUE }}
            >
              {t('settings.save_name')}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="px-4 py-3">
          <div className="text-xs text-gray-500 mb-2">{t('settings.language')}</div>
          <div className="flex gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => changeLang(l)}
                className="flex-1 py-1.5 rounded-full text-sm font-medium border transition-colors"
                style={locale === l
                  ? { backgroundColor: BLUE, color: '#fff', borderColor: BLUE }
                  : { color: '#666', borderColor: '#ddd' }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Password */}
      <Section title={t('settings.change_password')}>
        <div className="px-4 py-3 space-y-3">
          <input
            type="password"
            placeholder={t('settings.current_password')}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <input
            type="password"
            placeholder={t('settings.new_password')}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          {pwMsg && (
            <div className={`text-xs ${pwMsg.includes('✓') || pwMsg === t('settings.password_changed') ? 'text-green-600' : 'text-red-500'}`}>
              {pwMsg}
            </div>
          )}
          <button
            onClick={changePassword}
            disabled={!currentPw || !newPw}
            className="w-full py-2 rounded-lg text-sm text-white disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            {t('settings.change_password')}
          </button>
        </div>
      </Section>

      {/* Groups */}
      <Section title={t('settings.groups')}>
        {groups.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-400">{t('drawer.no_groups')}</div>
        )}
        {groups.map((group) => (
          <div key={group.id} className="border-b border-gray-100 last:border-0">
            <button
              onClick={() => navigate(`/groups/${group.id}/stores`)}
              className="flex items-center w-full px-4 py-3 gap-3 hover:bg-gray-50 text-left"
            >
              <Store size={16} color={BLUE} />
              <span className="flex-1 text-sm font-medium text-gray-800">{group.name}</span>
              <span className="text-xs text-gray-400">{t('settings.stores_button')}</span>
              <ChevronRight size={16} color="#ccc" />
            </button>
          </div>
        ))}
      </Section>

      {/* Account */}
      <Section title={t('settings.account')}>
        <Row
          label={t('common.logout')}
          onClick={onLogout}
        />
        <Row
          label={t('settings.delete_account')}
          onClick={() => setShowDeleteAccount(true)}
          danger
        />
      </Section>

      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-800">{t('settings.delete_account')}</h3>
            <p className="text-sm text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteAccount(false)} className="px-4 py-2 text-sm text-gray-600">
                {t('common.cancel')}
              </button>
              <button onClick={deleteAccount} className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg font-semibold">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
