import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Trash2, Store, ChevronRight, ChevronDown, ShoppingCart, CheckSquare, StickyNote, Star, Users, Mail, Copy, Check, UserMinus, LogOut, Pencil, X } from 'lucide-react'
import api from '../api/client'
import i18n from '../i18n/index.js'
import { getTheme, setTheme } from '../theme.js'
import { memberDisplayName } from '../components/ItemRow'

const BLUE = '#0050AA'
const LANGS = ['de', 'en', 'fr']

function ListTypeIcon({ type }) {
  if (type === 'todo') return <CheckSquare size={15} color={BLUE} />
  if (type === 'notes') return <StickyNote size={15} color={BLUE} />
  return <ShoppingCart size={15} color={BLUE} />
}

function GroupSettingsRow({ group, meId, navigate, onDeleteList, onGroupsChanged }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(null) // { type: 'remove'|'leave'|'delete', member? }
  const [actionMsg, setActionMsg] = useState('')
  const [nameValue, setNameValue] = useState(group.name)
  const [nameMsg, setNameMsg] = useState('')
  const [editingListId, setEditingListId] = useState(null)
  const [listName, setListName] = useState('')

  const isOwner = group.role === 'owner'

  const { data: listsData } = useQuery({
    queryKey: ['lists', group.id],
    queryFn: () => api.get(`/groups/${group.id}/lists`).then((r) => r.data),
    enabled: open,
  })
  const lists = listsData?.lists ?? []

  const { data: membersData } = useQuery({
    queryKey: ['members', group.id],
    queryFn: () => api.get(`/groups/${group.id}/members`).then((r) => r.data),
    enabled: open,
  })
  const members = membersData?.members ?? []

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  async function sendEmailInvite() {
    const e = email.trim()
    if (!e) return
    setInviteMsg('')
    try {
      await api.post(`/groups/${group.id}/send-invite`, { email: e })
      setEmail('')
      setInviteMsg(t('drawer.invite_sent'))
      setTimeout(() => setInviteMsg(''), 2500)
    } catch {
      setInviteMsg(t('drawer.invite_failed'))
    }
  }

  async function doRemoveMember(userId) {
    try {
      await api.delete(`/groups/${group.id}/members/${userId}`)
      queryClient.invalidateQueries({ queryKey: ['members', group.id] })
    } catch (err) { console.error('removeMember failed', err) }
  }

  async function doLeave() {
    try {
      await api.delete(`/groups/${group.id}/members/${meId}`)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      onGroupsChanged?.()
    } catch (err) { console.error('leave failed', err) }
  }

  async function doDeleteGroup() {
    setActionMsg('')
    try {
      await api.delete(`/groups/${group.id}`)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      onGroupsChanged?.()
    } catch (err) {
      if (err.response?.status === 409) setActionMsg(t('settings.group_delete_blocked'))
      else console.error('deleteGroup failed', err)
    }
  }

  async function saveGroupName() {
    const n = nameValue.trim()
    if (!n || n === group.name) return
    setNameMsg('')
    try {
      await api.patch(`/groups/${group.id}`, { name: n })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      onGroupsChanged?.()
      setNameMsg(t('settings.saved'))
      setTimeout(() => setNameMsg(''), 2000)
    } catch (err) { console.error('renameGroup failed', err) }
  }

  async function saveListName(list) {
    const n = listName.trim()
    if (!n || n === list.name) { setEditingListId(null); return }
    try {
      await api.patch(`/lists/${list.id}`, { name: n })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    } catch (err) {
      console.error('renameList failed', err)
    } finally {
      setEditingListId(null)
    }
  }

  function runConfirm() {
    const c = confirm
    setConfirm(null)
    if (!c) return
    if (c.type === 'remove') doRemoveMember(c.member.userId)
    else if (c.type === 'leave') doLeave()
    else if (c.type === 'delete') doDeleteGroup()
  }

  const confirmText = confirm?.type === 'remove'
    ? t('settings.remove_member_text', { member: memberDisplayName(confirm.member), group: group.name })
    : confirm?.type === 'leave'
      ? t('settings.leave_text', { name: group.name })
      : confirm?.type === 'delete'
        ? t('settings.delete_group_text', { name: group.name })
        : ''
  const confirmTitle = confirm?.type === 'remove'
    ? t('settings.remove_member_title')
    : confirm?.type === 'leave'
      ? t('settings.leave_title')
      : confirm?.type === 'delete'
        ? t('settings.delete_group_title')
        : ''

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center w-full px-4 py-3 gap-2">
        <button onClick={() => setOpen(!open)} className="text-gray-400 p-0.5">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className="flex-1 text-sm font-medium text-gray-800">{group.name}</span>
        <button
          onClick={() => navigate(`/groups/${group.id}/stores`)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
        >
          <Store size={14} />
          {t('settings.stores_button')}
        </button>
      </div>

      {open && (
        <div className="pb-3 pl-9 pr-4 space-y-5">
          {/* Group name */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('settings.group_name')}</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveGroupName()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={saveGroupName}
                disabled={!nameValue.trim() || nameValue.trim() === group.name}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: BLUE }}
              >
                {t('common.save')}
              </button>
            </div>
            {nameMsg && <div className="text-xs text-green-600 mt-1">{nameMsg}</div>}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <Users size={13} /> {t('settings.members')}
            </div>
            <div className="space-y-1.5">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-gray-700 truncate">{memberDisplayName(m)}</span>
                  {m.role === 'owner' && (
                    <span className="text-[10px] font-semibold uppercase text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                      {t('settings.owner')}
                    </span>
                  )}
                  {isOwner && m.userId !== meId && (
                    <button
                      onClick={() => setConfirm({ type: 'remove', member: m })}
                      className="text-gray-300 hover:text-red-500 p-0.5"
                      title={t('settings.remove_member')}
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <Mail size={13} /> {t('drawer.invite_email_cd')}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">{t('groups.invite_code')}:</span>
              <code className="text-sm font-mono bg-gray-100 rounded px-2 py-1 flex-1 text-gray-700">{group.inviteCode}</code>
              <button
                onClick={copyCode}
                title={t('settings.copy_invite')}
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendEmailInvite()}
                placeholder={t('drawer.email_address')}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={sendEmailInvite}
                disabled={!email.trim()}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: BLUE }}
              >
                {t('common.send')}
              </button>
            </div>
            {inviteMsg && <div className="text-xs text-gray-500 mt-1">{inviteMsg}</div>}
          </div>

          {/* Lists */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('settings.lists')}</div>
            {lists.length === 0 ? (
              <div className="text-xs text-gray-400 py-1">{t('drawer.no_lists')}</div>
            ) : lists.map((list) => (
              <div key={list.id} className="flex items-center gap-2 py-1.5">
                <ListTypeIcon type={list.type} />
                {editingListId === list.id ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveListName(list)
                        if (e.key === 'Escape') setEditingListId(null)
                      }}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <button onClick={() => saveListName(list)} className="text-blue-600 hover:bg-blue-50 p-0.5 rounded" aria-label={t('common.save')}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingListId(null)} className="text-gray-400 hover:bg-gray-100 p-0.5 rounded" aria-label={t('common.cancel')}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-700 truncate">{list.name}</span>
                    <button
                      onClick={() => { setEditingListId(list.id); setListName(list.name) }}
                      className="text-gray-300 hover:text-blue-500 p-0.5"
                      aria-label={t('settings.rename_list')}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteList(list)}
                      className="text-gray-300 hover:text-red-400 p-0.5"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Danger zone */}
          <div className="pt-1">
            {isOwner ? (
              <button
                onClick={() => setConfirm({ type: 'delete' })}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:underline"
              >
                <Trash2 size={15} /> {t('settings.delete_group')}
              </button>
            ) : (
              <button
                onClick={() => setConfirm({ type: 'leave' })}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:underline"
              >
                <LogOut size={15} /> {t('settings.leave')}
              </button>
            )}
            {actionMsg && <div className="text-xs text-red-500 mt-1">{actionMsg}</div>}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-800">{confirmTitle}</h3>
            <p className="text-sm text-gray-500">{confirmText}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm text-gray-600">
                {t('common.cancel')}
              </button>
              <button onClick={runConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg">
                {confirm.type === 'remove' ? t('settings.remove') : confirm.type === 'leave' ? t('settings.leave') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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

function FeedbackSection() {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('') // '' | 'sending' | 'ok' | 'error'
  const canSend = rating >= 1 && comment.trim().length > 0 && status !== 'sending'

  async function submit() {
    if (!canSend) return
    setStatus('sending')
    try {
      await api.post('/feedback', { rating, comment: comment.trim(), source: 'PWA' })
      setRating(0)
      setComment('')
      setStatus('ok')
      setTimeout(() => setStatus(''), 3500)
    } catch {
      setStatus('error')
    }
  }

  return (
    <Section title={t('settings.feedback')}>
      <div className="px-4 py-3 space-y-3">
        <div className="text-sm text-gray-600">{t('settings.feedback_rating_label')}</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n}`}
              className="p-0.5"
            >
              <Star
                size={30}
                className={n <= rating ? '' : 'text-gray-300'}
                color={n <= rating ? '#facc15' : undefined}
                fill={n <= rating ? '#facc15' : 'none'}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('settings.feedback_placeholder')}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-y"
        />
        <div className="flex items-center gap-3">
          {status === 'ok' && <span className="text-green-600 text-xs">{t('settings.feedback_sent')}</span>}
          {status === 'error' && <span className="text-red-500 text-xs">{t('settings.feedback_error')}</span>}
          <button
            onClick={submit}
            disabled={!canSend}
            className="ml-auto px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            {status === 'sending' ? t('settings.feedback_sending') : t('settings.feedback_send')}
          </button>
        </div>
      </div>
    </Section>
  )
}

export default function SettingsScreen({ onLogout, onGroupsChanged }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [locale, setLocale] = useState(localStorage.getItem('locale') ?? 'de')
  const [theme, setThemeState] = useState(getTheme())
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteListTarget, setDeleteListTarget] = useState(null) // { list, activeItemCount }

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

  function changeTheme(value) {
    setThemeState(value)
    setTheme(value)
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

  // First attempt: delete without force. On 409 (active items) ask for confirmation.
  async function requestDeleteList(list) {
    try {
      await api.delete(`/lists/${list.id}`)
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    } catch (err) {
      if (err.response?.status === 409) {
        setDeleteListTarget({ list, activeItemCount: err.response.data?.activeItemCount ?? 0 })
      } else {
        console.error('deleteList failed', err)
      }
    }
  }

  async function confirmForceDeleteList() {
    const list = deleteListTarget?.list
    if (!list) return
    try {
      await api.delete(`/lists/${list.id}?force=true`)
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    } catch (err) {
      console.error('force deleteList failed', err)
    } finally {
      setDeleteListTarget(null)
    }
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
                  : { color: 'var(--pill-fg)', borderColor: 'var(--pill-border)' }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title={t('settings.appearance')}>
        <div className="px-4 py-3">
          <div className="flex gap-2">
            {[['system', t('settings.theme_system')], ['light', t('settings.theme_light')], ['dark', t('settings.theme_dark')]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => changeTheme(v)}
                className={`flex-1 py-1.5 rounded-full text-sm font-medium border transition-colors ${theme === v ? 'text-white' : 'text-gray-600 border-gray-300'}`}
                style={theme === v ? { backgroundColor: BLUE, borderColor: BLUE } : undefined}
              >
                {label}
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

      {/* Groups: Märkte + Listen löschen */}
      <Section title={t('settings.groups')}>
        {groups.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-400">{t('drawer.no_groups')}</div>
        )}
        {groups.map((group) => (
          <GroupSettingsRow
            key={group.id}
            group={group}
            meId={meData?.user?.id}
            navigate={navigate}
            onDeleteList={requestDeleteList}
            onGroupsChanged={onGroupsChanged}
          />
        ))}
      </Section>

      {/* Feedback */}
      <FeedbackSection />

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
            <p className="text-sm text-gray-500">{t('settings.delete_account_confirm')}</p>
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

      {deleteListTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-800">{t('settings.delete_list_title')}</h3>
            <p className="text-sm text-gray-500">
              {t('settings.delete_list_text', {
                name: deleteListTarget.list.name,
                count: deleteListTarget.activeItemCount,
              })}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteListTarget(null)} className="px-4 py-2 text-sm text-gray-600">
                {t('common.cancel')}
              </button>
              <button onClick={confirmForceDeleteList} className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg font-semibold">
                {t('settings.delete_anyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
